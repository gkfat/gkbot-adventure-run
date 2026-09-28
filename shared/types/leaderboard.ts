/**
 * Leaderboard related types
 */

import type { Timestamp } from './common';

/**
 * Leaderboard entry
 */
export type LeaderboardEntry = {
  seasonId: string;          // UTC ISO week, e.g. "2026-W39" (see server/utils/season.ts)
  accountId: string;
  characterId: string;
  nickname: string;          // Player display name
  score: number;             // Cumulative score this season (sum of every settled run's enemiesDefeated)
  runId: string;             // Run ID that most recently contributed to this score
  achievedAt: Timestamp;     // When the score was last updated

  // Optional metadata for anti-cheat — snapshot of the most recently
  // contributing run, not accumulated (unlike score above)
  step?: number;             // Final step reached in that run
  killCount?: number;        // Cumulative enemies killed this season (mirrors score)
};

/**
 * Leaderboard entry with the season-end settlement reward for its rank
 * (see server/constants/leaderboardSeason.ts — display-only, not persisted).
 *
 * `spriteUrl` is likewise resolved at read time, server-side only, for the
 * podium's top 3 ranks (see LeaderboardService.withPodiumSprites) — it is
 * never persisted onto the leaderboard entry itself, and is derived only
 * from that entry's own characterId, so it can't be used to look up another
 * account's character data.
 */
export type LeaderboardEntryWithReward = LeaderboardEntry & {
  rewardGold: number;
  rewardGems: number;
  spriteUrl?: string;
};

/**
 * Leaderboard query result
 */
export type LeaderboardResult = {
  entries: LeaderboardEntryWithReward[];
  total: number;
  seasonEndsAt: Timestamp;   // When the current season's settlement runs
  myRank?: number;           // Player's rank (if querying for self)
  myEntry?: LeaderboardEntryWithReward; // Player's entry
};
