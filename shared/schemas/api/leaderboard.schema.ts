/**
 * API schemas for leaderboard endpoints
 */

import { z } from 'zod';
import { leaderboardEntrySchema } from '../firestore/leaderboard.schema';

/**
 * GET /api/leaderboard
 */
export const getLeaderboardRequestSchema = z.object({ limit: z.number().int().min(1).max(100).optional().default(50) }).strict();

export const getLeaderboardResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        entries: z.array(leaderboardEntrySchema),
        total: z.number(),
        myRank: z.number().optional(),
        myEntry: leaderboardEntrySchema.optional(),
    }),
});

export type GetLeaderboardRequest = z.infer<typeof getLeaderboardRequestSchema>;
export type GetLeaderboardResponse = z.infer<typeof getLeaderboardResponseSchema>;
