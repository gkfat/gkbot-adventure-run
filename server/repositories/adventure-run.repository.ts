/**
 * AdventureRun Repository
 * Handles Firestore operations for the `adventureRuns` collection.
 *
 * One document per run (doc id = runId, a Firestore auto-generated id).
 * `consumeRng` is the only method that needs a transaction — it's the single
 * place `rngIndex` is read and incremented (RULE-014, see rng.service.ts).
 * Every other write is a single checkpoint update (NFR-001: one API call =
 * one read + one compute + one write, never per-round/per-tick).
 */

import { BaseRepository } from './base.repository';
import {
    AdventureStateType, type AdventureRun,
} from '../../shared/types/adventure';
import { adventureRunSchema } from '../../shared/schemas/firestore/adventure.schema';
import {
    DatabaseError, NotFoundError,
} from '../../shared/types/errors';
import { random } from '../services/rng.service';

export class AdventureRunRepository extends BaseRepository<AdventureRun> {
    protected collectionName = 'adventureRuns';

    /**
     * Create a new run document. `seed` is generated here (not by the
     * caller) so it's never observable outside the server.
     */
    async createRun(params: {
        characterId: string;
        accountId: string;
        playerHpMax: number;
    }): Promise<AdventureRun> {
        try {
            const docRef = this.collection.doc();
            const timestamp = Date.now();

            const run: AdventureRun = adventureRunSchema.parse({
                runId: docRef.id,
                characterId: params.characterId,
                accountId: params.accountId,

                seed: crypto.randomUUID(),
                rngIndex: 0,

                state: AdventureStateType.INIT,
                step: 0,
                lastRestStep: 0,
                startedAt: timestamp,

                playerHp: params.playerHpMax,
                playerHpMax: params.playerHpMax,

                blessings: [],
                curses: [],
                blessingPoints: 0,

                runInventory: [],

                score: 0,
                goldEarned: 0,
                gemsEarned: 0,

                lastActivityAt: timestamp,
                updatedAt: timestamp,
            }) as AdventureRun;

            await docRef.set(run);
            return run;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create adventure run: ${message}`);
        }
    }

    /**
     * Find the character's currently active run (state != ENDED), if any.
     * Used both to enforce RULE-002 (one active run per character) and to
     * resume a run via GET /api/adventure/current.
     */
    async getActiveByCharacterId(characterId: string): Promise<AdventureRun | null> {
        try {
            const snapshot = await this.collection
                .where('characterId', '==', characterId)
                .where('state', '!=', AdventureStateType.ENDED)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }
            return snapshot.docs[0]!.data() as AdventureRun;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to query active adventure run: ${message}`);
        }
    }

    /**
     * Apply a checkpoint update (state transition, node advance, settlement,
     * heal, ...). A thin wrapper over a plain Firestore write — callers pass
     * a full patch of already-computed fields; this only stamps `updatedAt`.
     * Typed as `Record<string, unknown>` (not `Partial<AdventureRun>`) so
     * callers can pass a Firestore `FieldValue.delete()` sentinel to clear
     * `currentNodeType`/`currentNodeData` when leaving a node.
     */
    async saveCheckpoint(runId: string, patch: Record<string, unknown>): Promise<AdventureRun> {
        try {
            const docRef = this.getDocumentRef(runId);
            const updateData = {
                ...patch, updatedAt: Date.now(),
            };
            await docRef.update(updateData);
            return this.getByIdOrThrow(runId, 'adventure run');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to save adventure run checkpoint: ${message}`);
        }
    }

    /**
     * Consume the next RNG value for this run inside a single transaction:
     * read seed + rngIndex, compute `random(seed, rngIndex)`, persist
     * `rngIndex + 1`. Never call this concurrently for the same run —
     * the state machine is checkpoint-driven (one request at a time).
     */
    async consumeRng(runId: string): Promise<number> {
        const docRef = this.getDocumentRef(runId);

        try {
            return await this.db.runTransaction(async (tx) => {
                const doc = await tx.get(docRef);
                if (!doc.exists) {
                    throw new NotFoundError('adventure run');
                }

                const run = doc.data() as AdventureRun;
                const value = random(run.seed, run.rngIndex);

                tx.update(docRef, {
                    rngIndex: run.rngIndex + 1,
                    updatedAt: Date.now(),
                });

                return value;
            });
        } catch (error: unknown) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to consume RNG: ${message}`);
        }
    }
}
