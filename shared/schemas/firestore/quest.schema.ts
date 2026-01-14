/**
 * Firestore schema for Quest/Achievement collections
 */

import { z } from 'zod';
import {
    QuestType, AchievementType, 
} from '../../types';

/**
 * Daily quest schema
 */
export const dailyQuestSchema = z.object({
    questId: z.string(),
    templateId: z.string(),
    accountId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  
    // Progress
    currentCount: z.number().int().min(0),
    targetCount: z.number().int().min(1),
    completed: z.boolean(),
  
    // Rewards
    rewardGold: z.number().int().min(0),
    rewardGems: z.number().int().min(0),
    claimed: z.boolean(),
    claimedAt: z.number().optional(),
  
    // Metadata
    createdAt: z.number(),
    updatedAt: z.number(),
}).strict();

/**
 * Achievement progress schema
 */
export const achievementProgressSchema = z.object({
    achievementId: z.string(),
    templateId: z.string(),
    accountId: z.string(),
  
    // Progress
    currentCount: z.number().int().min(0),
    targetCount: z.number().int().min(1),
    completed: z.boolean(),
  
    // Reward
    rewardGems: z.number().int().min(0),
    claimed: z.boolean(),
    claimedAt: z.number().optional(),
  
    // Metadata
    createdAt: z.number(),
    updatedAt: z.number(),
}).strict();

export type DailyQuest = z.infer<typeof dailyQuestSchema>;
export type AchievementProgress = z.infer<typeof achievementProgressSchema>;
