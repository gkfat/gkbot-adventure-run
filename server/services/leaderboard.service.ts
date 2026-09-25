/**
 * Leaderboard Service
 *
 * Query-heavy, write-rare (only when a run's settlement beats the
 * character's existing best-this-season): see design.md. `updateIfBetter`
 * is called by the adventure-run-core run settlement flow, not by this
 * change.
 */

import { BaseService } from './base.service';
import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import {
    getCurrentSeasonId, getSeasonEndsAt, 
} from '../utils/season';
import type {
    LeaderboardEntry, LeaderboardResult,
} from '../../shared/types/leaderboard';

export class LeaderboardService extends BaseService {
    protected serviceName = 'leaderboard';
    private leaderboardRepo = new LeaderboardRepository();

    /**
     * Update the character's leaderboard entry for the current season if
     * `score` beats its existing best this season (or it has none yet).
     * No-op (returns the unchanged entry) otherwise.
     */
    async updateIfBetter(entry: {
        accountId: string;
        characterId: string;
        nickname: string;
        score: number;
        runId: string;
        meta?: { step?: number; killCount?: number };
    }): Promise<LeaderboardEntry> {
        const candidate: LeaderboardEntry = {
            seasonId: getCurrentSeasonId(),
            accountId: entry.accountId,
            characterId: entry.characterId,
            nickname: entry.nickname,
            score: entry.score,
            runId: entry.runId,
            achievedAt: Date.now(),
            // Firestore rejects explicit `undefined` field values — only
            // include step/killCount when the caller actually provided them,
            // rather than writing `step: undefined` onto the document.
            ...(entry.meta?.step !== undefined ? { step: entry.meta.step } : {}),
            ...(entry.meta?.killCount !== undefined ? { killCount: entry.meta.killCount } : {}),
        };

        return this.leaderboardRepo.upsertIfHigher(candidate);
    }

    /**
     * This season's Top-N leaderboard plus the season's end time and,
     * if `requesterCharacterId` is given, that character's own rank/entry
     * (omitted entirely if it has no record this season, or if no
     * characterId was given at all).
     */
    async getLeaderboard(limit: number, requesterCharacterId?: string): Promise<LeaderboardResult> {
        const seasonId = getCurrentSeasonId();
        const seasonEndsAt = getSeasonEndsAt();

        const [
            entries,
            total,
            myEntry,
        ] = await Promise.all([
            this.leaderboardRepo.getTopN(seasonId, limit),
            this.leaderboardRepo.countHigherThan(seasonId, -1),
            requesterCharacterId ? this.leaderboardRepo.get(seasonId, requesterCharacterId) : Promise.resolve(null),
        ]);

        if (!myEntry) {
            return {
                entries, total, seasonEndsAt,
            };
        }

        const myRank = await this.leaderboardRepo.countHigherThan(seasonId, myEntry.score) + 1;

        return {
            entries, total, seasonEndsAt, myRank, myEntry,
        };
    }
}
