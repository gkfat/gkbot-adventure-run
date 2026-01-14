/**
 * API schemas for quest/achievement endpoints
 */

import { z } from 'zod';
import {
    dailyQuestSchema, achievementProgressSchema, 
} from '../firestore/quest.schema';

/**
 * GET /api/quests/daily
 */
export const getDailyQuestsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ quests: z.array(dailyQuestSchema) }),
});

/**
 * POST /api/quests/claim/:questId
 */
export const claimQuestResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        goldEarned: z.number(),
        gemsEarned: z.number(),
    }),
});

/**
 * GET /api/achievements
 */
export const getAchievementsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ achievements: z.array(achievementProgressSchema) }),
});

/**
 * POST /api/achievements/claim/:achievementId
 */
export const claimAchievementResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ gemsEarned: z.number() }),
});

export type GetDailyQuestsResponse = z.infer<typeof getDailyQuestsResponseSchema>;
export type ClaimQuestResponse = z.infer<typeof claimQuestResponseSchema>;
export type GetAchievementsResponse = z.infer<typeof getAchievementsResponseSchema>;
export type ClaimAchievementResponse = z.infer<typeof claimAchievementResponseSchema>;
