/**
 * Firestore schema for Quest/Achievement collections
 */

import { z } from 'zod';
import {
    QuestType, AchievementType, 
} from '../../types';

/**
 * Daily quest schema (scoped to a character — see shared/types/quest.ts)
 */
export const dailyQuestSchema = z.object({
    questId: z.string(),
    templateId: z.string(),
    characterId: z.string(),
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
 * Persistent quest schema — same shape as dailyQuestSchema minus `date`,
 * never resets, claimable once per character.
 */
export const persistentQuestSchema = z.object({
    questId: z.string(),
    templateId: z.string(),
    characterId: z.string(),

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
 * Achievement progress schema (scoped to a character, lifetime-once)
 */
export const achievementProgressSchema = z.object({
    achievementId: z.string(),
    templateId: z.string(),
    characterId: z.string(),

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
export type PersistentQuest = z.infer<typeof persistentQuestSchema>;
export type AchievementProgress = z.infer<typeof achievementProgressSchema>;
