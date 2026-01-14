/**
 * API schemas for character endpoints
 */

import { z } from 'zod';
import { attributesSchema } from '../firestore/character.schema';

/**
 * GET /api/character
 */
export const getCharacterResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        characterId: z.string(),
        level: z.number(),
        exp: z.number(),
        gold: z.number(),
        gems: z.number(),
        attributes: attributesSchema,
        unspentAttributePoints: z.number(),
        nickname: z.string().optional(),
        stats: z.object({
            ATK: z.number(),
            DEF: z.number(),
            HP_MAX: z.number(),
            HP_CURRENT: z.number(),
            actionIntervalSec: z.number(),
            critChance: z.number(),
            critMultiplier: z.number(),
            dodgeChance: z.number(),
        }),
    }),
});

/**
 * POST /api/character/attributes
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
 * POST /api/character/nickname
 */
export const setNicknameRequestSchema = z.object({ nickname: z.string().min(1).max(20) }).strict();

export const setNicknameResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ nickname: z.string() }),
});

/**
 * POST /api/character/potion/upgrade
 */
export const upgradePotionResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        level: z.number(),
        goldSpent: z.number(),
    }),
});

export type GetCharacterResponse = z.infer<typeof getCharacterResponseSchema>;
export type AllocateAttributesRequest = z.infer<typeof allocateAttributesRequestSchema>;
export type AllocateAttributesResponse = z.infer<typeof allocateAttributesResponseSchema>;
export type SetNicknameRequest = z.infer<typeof setNicknameRequestSchema>;
export type SetNicknameResponse = z.infer<typeof setNicknameResponseSchema>;
export type UpgradePotionResponse = z.infer<typeof upgradePotionResponseSchema>;
