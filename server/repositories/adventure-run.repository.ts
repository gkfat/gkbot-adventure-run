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
    AdventureStateType, STAGE_CONFIG, rollSeverityTier, rollFactionType, type AdventureRun,
} from '../../shared/types/adventure';
import { adventureRunSchema } from '../../shared/schemas/firestore/adventure.schema';
import {
    DatabaseError, NotFoundError,
} from '../../shared/types/errors';
import { random } from '../services/rng.service';

/**
 * Inclusive uniform integer in [min, max] from a single RNG draw in [0, 1).
 */
function rollInRange(rngValue: number, min: number, max: number): number {
    return min + Math.floor(rngValue * (max - min + 1));
}

/**
 * Backfill Stage fields with defaults for run documents written before
 * `adventure-stage-progression`/`single-stage-run-settlement` shipped
 * (design.md Migration Plan: "不做資料回填" — tolerate `undefined` as
 * stage 1/node 0 instead). Every read path must go through this so
 * `adventureRunSchema` (which requires these fields) and the state machine
 * both see consistent defaults — without it, an old run document fails
 * schema validation.
 */
function withStageDefaults(run: AdventureRun): AdventureRun {
    return {
        ...run,
        chapterIndex: run.chapterIndex ?? 0,
        stageNodeIndex: run.stageNodeIndex ?? 0,
        stageNodeCount: run.stageNodeCount ?? STAGE_CONFIG.NODE_COUNT_MIN,
        expEarned: run.expEarned ?? 0,
        // enemy-factions-and-severity Migration Plan: missing on pre-migration
        // run docs — tolerate as PARTIAL_ACTIVE/GKBOT (equivalent to the
        // unadjusted pre-change behavior), no data backfill.
        severityTier: run.severityTier ?? 'PARTIAL_ACTIVE',
        factionType: run.factionType ?? 'GKBOT',
    };
}

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
        chapterIndex: number;
    }): Promise<AdventureRun> {
        try {
            const docRef = this.collection.doc();
            const timestamp = Date.now();
            // Deterministic per character+chapter (not per run attempt): a
            // failed/abandoned run followed by a retry of the same chapter
            // must reproduce the exact same node/enemy sequence, otherwise
            // players could reroll a hard chapter into an easier one by
            // repeatedly quitting and restarting (known-issue.md #8).
            const seed = `${params.characterId}:${params.chapterIndex}`;

            // Roll the Stage's node count deterministically from the fresh
            // seed — no existing doc yet, so this can't go through
            // RngService.next()/consumeRng().
            const stageNodeCount = rollInRange(random(seed, 0), STAGE_CONFIG.NODE_COUNT_MIN, STAGE_CONFIG.NODE_COUNT_MAX);

            // Facility severity / enemy faction (enemy-factions-and-severity
            // design.md 決策 1): rolled once here, same deterministic-seed
            // style as stageNodeCount — indices 1/2 so they never collide
            // with stageNodeCount's index 0.
            const severityTier = rollSeverityTier(params.chapterIndex, random(seed, 1));
            const factionType = rollFactionType(severityTier, random(seed, 2));

            const run: AdventureRun = adventureRunSchema.parse({
                runId: docRef.id,
                characterId: params.characterId,
                accountId: params.accountId,

                seed,
                // Indices 0~2 are already consumed above (stageNodeCount,
                // severityTier, factionType) — start the run's own
                // RngService/consumeRng sequence past them so it never
                // replays an already-used draw.
                rngIndex: 3,

                state: AdventureStateType.INIT,
                step: 0,
                lastRestStep: 0,

                chapterIndex: params.chapterIndex,
                stageNodeIndex: 0,
                stageNodeCount,

                severityTier,
                factionType,

                startedAt: timestamp,

                playerHp: params.playerHpMax,
                playerHpMax: params.playerHpMax,

                blessings: [],
                curses: [],
                blessingPoints: 0,

                runInventory: [],

                expEarned: 0,
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
            return withStageDefaults(snapshot.docs[0]!.data() as AdventureRun);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to query active adventure run: ${message}`);
        }
    }

    /**
     * Permanently delete every run document belonging to a character (active
     * or ended) — used when the character itself is deleted.
     */
    async deleteAllByCharacterId(characterId: string): Promise<void> {
        try {
            const snapshot = await this.collection.where('characterId', '==', characterId).get();
            if (snapshot.empty) {
                return;
            }

            const batch = this.db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to delete adventure runs: ${message}`);
        }
    }

    /**
     * Get a run document by ID (see BaseRepository.getById) with Chapter/
     * Stage fields backfilled — overridden so both this and the inherited
     * `getByIdOrThrow` (used by `saveCheckpoint`) return consistent defaults
     * for pre-migration run documents.
     */
    override async getById(id: string): Promise<AdventureRun | null> {
        const run = await super.getById(id);
        return run ? withStageDefaults(run) : null;
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
