/**
 * Firestore schema for Leaderboard collection
 */

import { z } from 'zod';

/**
 * Leaderboard entry schema
 */
export const leaderboardEntrySchema = z.object({
    accountId: z.string(),
    characterId: z.string(),
    nickname: z.string(),
    score: z.number().int().min(0),
    runId: z.string(),
    achievedAt: z.number(),
  
    // Optional metadata for anti-cheat
    step: z.number().int().min(0).optional(),
    killCount: z.number().int().min(0).optional(),
}).strict();

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
