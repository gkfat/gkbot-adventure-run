/**
 * Leaderboard Repository
 * Handles Firestore operations for the leaderboardEntries collection.
 *
 * One document per (season, character) — doc id = `{seasonId}_{characterId}`
 * (see leaderboard-season/design.md), holding that character's cumulative
 * score for that season only — the sum of every settled run's enemiesDefeated,
 * not just its best run. A new season's first write always lands on a
 * fresh doc, so reset falls out of the doc-id scheme for free.
 */

import { BaseRepository } from './base.repository';
import type { LeaderboardEntry } from '../../shared/types/leaderboard';
import { DatabaseError } from '../../shared/types/errors';

function docId(seasonId: string, characterId: string): string {
    return `${seasonId}_${characterId}`;
}

export class LeaderboardRepository extends BaseRepository<LeaderboardEntry> {
    protected collectionName = 'leaderboardEntries';

    /**
     * Get a character's leaderboard entry for a season, or null if it has
     * no record that season. Reads the doc directly (not via the inherited
     * `getById`) — that helper tacks an `id` field onto the result, which
     * `leaderboardEntrySchema` (`.strict()`) then rejects since
     * `LeaderboardEntry` has no `id` field.
     */
    async get(seasonId: string, characterId: string): Promise<LeaderboardEntry | null> {
        try {
            const doc = await this.getDocumentRef(docId(seasonId, characterId)).get();
            return doc.exists ? (doc.data() as LeaderboardEntry) : null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get leaderboard entry: ${message}`);
        }
    }

    /**
     * Add one run's contribution onto the character's season total: `score`
     * (and `killCount`, if given) are summed onto whatever's already there
     * (or start from 0 if this is the character's first entry this season);
     * `nickname`/`runId`/`achievedAt`/`step` are overwritten with this run's
     * values (a "most recently contributing run" snapshot, not accumulated).
     * Runs inside a transaction so concurrent settlements can't clobber each
     * other's contribution.
     */
    async addScore(entry: LeaderboardEntry): Promise<LeaderboardEntry> {
        const docRef = this.getDocumentRef(docId(entry.seasonId, entry.characterId));

        try {
            return await this.db.runTransaction(async (tx) => {
                const doc = await tx.get(docRef);
                const current = doc.exists ? (doc.data() as LeaderboardEntry) : null;

                const next: LeaderboardEntry = {
                    ...entry,
                    score: (current?.score ?? 0) + entry.score,
                    ...(entry.killCount !== undefined
                        ? { killCount: (current?.killCount ?? 0) + entry.killCount }
                        : {}),
                };

                tx.set(docRef, next);
                return next;
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to add to leaderboard entry: ${message}`);
        }
    }

    /**
     * Top N entries for a season by score, descending.
     */
    async getTopN(seasonId: string, limit: number): Promise<LeaderboardEntry[]> {
        try {
            const snapshot = await this.collection
                .where('seasonId', '==', seasonId)
                .orderBy('score', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get top leaderboard entries: ${message}`);
        }
    }

    /**
     * Count of a season's entries with a score strictly higher than `score`.
     * Used to compute a rank (rank = countHigherThan(myScore) + 1) without
     * reading and sorting the whole season's entries.
     */
    async countHigherThan(seasonId: string, score: number): Promise<number> {
        try {
            const snapshot = await this.collection
                .where('seasonId', '==', seasonId)
                .where('score', '>', score)
                .count()
                .get();
            return snapshot.data().count;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to count leaderboard entries: ${message}`);
        }
    }

    /**
     * Every entry for a season, score descending, unlimited — used by
     * settlement (rank tiers must cover every entry, not just a Top-N page).
     */
    async getAllForSeason(seasonId: string): Promise<LeaderboardEntry[]> {
        try {
            const snapshot = await this.collection
                .where('seasonId', '==', seasonId)
                .orderBy('score', 'desc')
                .get();

            return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get season leaderboard entries: ${message}`);
        }
    }
}
