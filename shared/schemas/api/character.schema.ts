/**
 * API schemas for character endpoints
 */

import { z } from 'zod';
import {
    attributesSchema, equipmentSchema,
} from '../firestore/character.schema';

const statsSchema = z.object({
    ATK: z.number(),
    DEF: z.number(),
    HP_MAX: z.number(),
    HP_CURRENT: z.number(),
    actionIntervalSec: z.number(),
    critChance: z.number(),
    critMultiplier: z.number(),
    dodgeChance: z.number(),
});

// Only the keys equipment actually contributed to are present.
const equipmentBonusSchema = z.object({
    ATK: z.number().optional(),
    DEF: z.number().optional(),
    HP_MAX: z.number().optional(),
    actionIntervalSec: z.number().optional(),
});

const archetypeSchema = z.object({
    archetypeId: z.string(),
    className: z.string(),
    attributes: attributesSchema,
    spriteUrl: z.string(),
});

const characterSummarySchema = z.object({
    characterId: z.string(),
    nickname: z.string(),
    level: z.number(),
    gold: z.number(),
    gems: z.number(),
    archetypeId: z.string(),
    className: z.string(),
    spriteUrl: z.string(),
});

/**
 * GET /api/character/roster
 */
export const getRosterResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        characters: z.array(characterSummarySchema),
        archetypes: z.array(archetypeSchema),
    }),
});

/**
 * POST /api/character
 */
export const createCharacterRequestSchema = z.object({ archetypeId: z.string().min(1) }).strict();

/**
 * GET /api/character/:characterId
 * POST /api/character (response shares the same shape)
 */
export const getCharacterResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        characterId: z.string(),
        archetypeId: z.string(),
        className: z.string(),
        level: z.number(),
        exp: z.number(),
        gold: z.number(),
        gems: z.number(),
        attributes: attributesSchema,
        unspentAttributePoints: z.number(),
        equipment: equipmentSchema,
        nickname: z.string(),
        spriteUrl: z.string(),
        stats: statsSchema,
        equipmentBonus: equipmentBonusSchema,
        nextChapterIndex: z.number(),
    }),
});

export const createCharacterResponseSchema = getCharacterResponseSchema;

/**
 * POST /api/character/:characterId/attributes
 */
export const allocateAttributesRequestSchema = z.object({
    STR: z.number().int().min(0).optional(),
    AGI: z.number().int().min(0).optional(),
    CON: z.number().int().min(0).optional(),
    LUCK: z.number().int().min(0).optional(),
}).strict().refine(
    (data) => {
        const total = (data.STR || 0) + (data.AGI || 0) + (data.CON || 0) + (data.LUCK || 0);
        return total > 0;
    },
    { message: 'At least one attribute must be allocated' },
);

export const allocateAttributesResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        attributes: attributesSchema,
        unspentAttributePoints: z.number(),
    }),
});

/**
 * POST /api/character/:characterId/nickname
 */
export const setNicknameRequestSchema = z.object({ nickname: z.string().min(1).max(20) }).strict();

export const setNicknameResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ nickname: z.string() }),
});

export type GetRosterResponse = z.infer<typeof getRosterResponseSchema>;
export type CreateCharacterRequest = z.infer<typeof createCharacterRequestSchema>;
export type GetCharacterResponse = z.infer<typeof getCharacterResponseSchema>;
export type AllocateAttributesRequest = z.infer<typeof allocateAttributesRequestSchema>;
export type AllocateAttributesResponse = z.infer<typeof allocateAttributesResponseSchema>;
export type SetNicknameRequest = z.infer<typeof setNicknameRequestSchema>;
export type SetNicknameResponse = z.infer<typeof setNicknameResponseSchema>;
