/**
 * API schemas for quest/achievement endpoints (character-scoped — see
 * proposal.md's BREAKING note: these replace the earlier account-scoped
 * `/api/quests/...`/`/api/achievements/...` routes)
 */

import { z } from 'zod';
import {
    dailyQuestSchema, persistentQuestSchema, achievementProgressSchema,
} from '../firestore/quest.schema';

/**
 * The persisted quest/achievement document doesn't carry a display name or
 * description (avoids duplicating template content into every Firestore
 * doc) — the service layer enriches each one with its template's `name`/
 * `description` before returning (same pattern as bestiary.schema.ts's
 * BestiaryEntry).
 */
const dailyQuestWithTemplateSchema = dailyQuestSchema.extend({
    name: z.string(),
    description: z.string(),
});
const persistentQuestWithTemplateSchema = persistentQuestSchema.extend({
    name: z.string(),
    description: z.string(),
});
const achievementWithTemplateSchema = achievementProgressSchema.extend({
    name: z.string(),
    description: z.string(),
});

/**
 * GET /api/character/{characterId}/quests/daily
 */
export const getDailyQuestsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ quests: z.array(dailyQuestWithTemplateSchema) }),
});

/**
 * POST /api/character/{characterId}/quests/daily/claim/:questId
 */
export const claimDailyQuestResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        goldEarned: z.number(),
        gemsEarned: z.number(),
    }),
});

/**
 * GET /api/character/{characterId}/quests/persistent
 */
export const getPersistentQuestsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ quests: z.array(persistentQuestWithTemplateSchema) }),
});

/**
 * POST /api/character/{characterId}/quests/persistent/claim/:questId
 */
export const claimPersistentQuestResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        goldEarned: z.number(),
        gemsEarned: z.number(),
    }),
});

/**
 * GET /api/character/{characterId}/achievements
 */
export const getAchievementsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ achievements: z.array(achievementWithTemplateSchema) }),
});

/**
 * POST /api/character/{characterId}/achievements/claim/:achievementId
 */
export const claimAchievementResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ gemsEarned: z.number() }),
});

export type DailyQuestWithTemplate = z.infer<typeof dailyQuestWithTemplateSchema>;
export type PersistentQuestWithTemplate = z.infer<typeof persistentQuestWithTemplateSchema>;
export type AchievementWithTemplate = z.infer<typeof achievementWithTemplateSchema>;

export type GetDailyQuestsResponse = z.infer<typeof getDailyQuestsResponseSchema>;
export type ClaimDailyQuestResponse = z.infer<typeof claimDailyQuestResponseSchema>;
export type GetPersistentQuestsResponse = z.infer<typeof getPersistentQuestsResponseSchema>;
export type ClaimPersistentQuestResponse = z.infer<typeof claimPersistentQuestResponseSchema>;
export type GetAchievementsResponse = z.infer<typeof getAchievementsResponseSchema>;
export type ClaimAchievementResponse = z.infer<typeof claimAchievementResponseSchema>;
