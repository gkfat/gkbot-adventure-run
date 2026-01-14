/**
 * Leaderboard related types
 */

import type { Timestamp } from './common';

/**
 * Leaderboard entry
 */
export type LeaderboardEntry = {
  accountId: string;
  characterId: string;
  nickname: string;          // Player display name
  score: number;             // Best score
  runId: string;             // Run ID that achieved this score
  achievedAt: Timestamp;     // When this score was achieved
  
  // Optional metadata for anti-cheat
  step?: number;             // Final step reached
  killCount?: number;        // Total enemies killed
};

/**
 * Leaderboard query result
 */
export type LeaderboardResult = {
  entries: LeaderboardEntry[];
  total: number;
  myRank?: number;           // Player's rank (if querying for self)
  myEntry?: LeaderboardEntry; // Player's entry
};
