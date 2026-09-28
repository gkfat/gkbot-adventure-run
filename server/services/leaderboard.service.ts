/**
 * Leaderboard Service
 *
 * Query-heavy, write-rare (once per run settlement, adding that run's
 * enemiesDefeated onto the character's season-cumulative score): see
 * design.md. `addRunScore` is called by the adventure-run-core run
 * settlement flow, not by this change.
 */

import { BaseService } from './base.service';
import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import { CharacterRepository } from '../repositories/character.repository';
import {
    getCurrentSeasonId, getSeasonEndsAt,
} from '../utils/season';
import { getSeasonRewardForRank } from '../constants/leaderboardSeason';
import { getArchetypeById } from '../constants/templates/characterArchetypes';
import type {
    LeaderboardEntry, LeaderboardEntryWithReward, LeaderboardResult,
} from '../../shared/types/leaderboard';

// 頒獎台只顯示前 3 名的角色圖，避免對整份榜單逐筆查角色文件。
const PODIUM_RANK_COUNT = 3;

export class LeaderboardService extends BaseService {
    protected serviceName = 'leaderboard';
    private leaderboardRepo = new LeaderboardRepository();
    private characterRepo = new CharacterRepository();

    /**
     * Add this run's `score` (enemiesDefeated) onto the character's
     * cumulative leaderboard total for the current season (starting from 0
     * if it has no entry yet).
     */
    async addRunScore(entry: {
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

        return this.leaderboardRepo.addScore(candidate);
    }

    private static withReward(entry: LeaderboardEntry, rank: number): LeaderboardEntryWithReward {
        return {
            ...entry,
            ...getSeasonRewardForRank(rank),
        };
    }

    /**
     * Resolve a character's archetype sprite for podium display, server-side
     * only — the leaderboard entry itself never carries anything beyond
     * `characterId`, so callers can't use it to probe another account's
     * character data. Falls back to omitting spriteUrl if the character was
     * since deleted.
     */
    private async resolveSpriteUrl(characterId: string): Promise<string | undefined> {
        const character = await this.characterRepo.getById(characterId);
        if (!character) return undefined;
        return getArchetypeById(character.archetypeId)?.spriteUrl;
    }

    private async withPodiumSprites(entries: LeaderboardEntryWithReward[]): Promise<LeaderboardEntryWithReward[]> {
        const podium = entries.slice(0, PODIUM_RANK_COUNT);
        const rest = entries.slice(PODIUM_RANK_COUNT);

        const podiumWithSprites = await Promise.all(podium.map(async (entry) => {
            const spriteUrl = await this.resolveSpriteUrl(entry.characterId);
            return spriteUrl ? {
                ...entry, spriteUrl, 
            } : entry;
        }));

        return [...podiumWithSprites, ...rest];
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

        const entriesWithReward = await this.withPodiumSprites(
            entries.map((entry, index) => LeaderboardService.withReward(entry, index + 1)),
        );

        if (!myEntry) {
            return {
                entries: entriesWithReward, total, seasonEndsAt,
            };
        }

        const myRank = await this.leaderboardRepo.countHigherThan(seasonId, myEntry.score) + 1;
        const myEntryWithReward = LeaderboardService.withReward(myEntry, myRank);
        const myEntrySpriteUrl = myRank <= PODIUM_RANK_COUNT ? await this.resolveSpriteUrl(myEntry.characterId) : undefined;

        return {
            entries: entriesWithReward,
            total,
            seasonEndsAt,
            myRank,
            myEntry: myEntrySpriteUrl ? {
                ...myEntryWithReward, spriteUrl: myEntrySpriteUrl, 
            } : myEntryWithReward,
        };
    }
}
