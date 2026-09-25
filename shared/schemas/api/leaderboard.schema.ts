/**
 * API schemas for leaderboard endpoints
 */

import { z } from 'zod';
import { leaderboardEntrySchema } from '../firestore/leaderboard.schema';

/**
 * GET /api/leaderboard
 */
export const getLeaderboardRequestSchema = z.object({
    // Query params always arrive as strings — coerce before validating range.
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    characterId: z.string().optional(),
}).strict();

// 附上該名次的賽季結算獎勵（僅顯示用，不落地儲存）——見
// server/constants/leaderboardSeason.ts。
const leaderboardEntryWithRewardSchema = leaderboardEntrySchema.extend({
    rewardGold: z.number().int().min(0),
    rewardGems: z.number().int().min(0),
});

export const getLeaderboardResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        entries: z.array(leaderboardEntryWithRewardSchema),
        total: z.number(),
        seasonEndsAt: z.number(),
        myRank: z.number().optional(),
        myEntry: leaderboardEntryWithRewardSchema.optional(),
    }),
});

export type GetLeaderboardRequest = z.infer<typeof getLeaderboardRequestSchema>;
export type GetLeaderboardResponse = z.infer<typeof getLeaderboardResponseSchema>;
