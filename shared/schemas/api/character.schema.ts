/**
 * API schemas for character endpoints
 */

import { z } from 'zod';
import {
    attributesSchema, equipmentSchema, proficiencyProgressSchema,
} from '../firestore/character.schema';
import { WeaponType } from '../../types/common';

const statsSchema = z.object({
    ATK: z.number(),
    DEF: z.number(),
    HP_MAX: z.number(),
    HP_CURRENT: z.number(),
    actionIntervalSec: z.number(),
    critChance: z.number(),
    critMultiplier: z.number(),
    dodgeChance: z.number(),
    carryCapacity: z.number(),
});

// Only the keys equipment actually contributed to are present.
const equipmentBonusSchema = z.object({
    ATK: z.number().optional(),
    DEF: z.number().optional(),
    HP_MAX: z.number().optional(),
    actionIntervalSec: z.number().optional(),
    dodgeChance: z.number().optional(),
});

// Only the keys invested talent nodes actually contributed to are present.
const talentBonusSchema = z.object({
    ATK: z.number().optional(),
    DEF: z.number().optional(),
    HP_MAX: z.number().optional(),
    actionIntervalSec: z.number().optional(),
    critChance: z.number().optional(),
    dodgeChance: z.number().optional(),
    carryCapacity: z.number().optional(),
});

// Only the keys weapon proficiency actually contributed to are present.
const proficiencyBonusSchema = z.object({
    ATK: z.number().optional(),
    critChance: z.number().optional(),
});

const talentEffectSchema = z.object({
    stat: z.enum([
        'ATK',
        'DEF',
        'HP_MAX',
        'actionIntervalSec',
        'critChance',
        'dodgeChance',
        'carryCapacity',
    ]),
    perRank: z.number(),
});

const talentNodeSchema = z.object({
    nodeId: z.string(),
    archetypeId: z.string(),
    tier: z.number(),
    branchGroup: z.string().optional(),
    name: z.string(),
    description: z.string(),
    maxRank: z.literal(3),
    effect: z.array(talentEffectSchema),
});

const talentTreeSchema = z.object({
    archetypeId: z.string(),
    nodes: z.array(talentNodeSchema),
});

const talentsSchema = z.record(z.string(), z.number());

const weaponProficiencySchema = z.partialRecord(z.nativeEnum(WeaponType), proficiencyProgressSchema);

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
        talentPoints: z.number(),
        talents: talentsSchema,
        talentTree: talentTreeSchema,
        weaponProficiency: weaponProficiencySchema,
        dualWieldProficiency: proficiencyProgressSchema,
        equipment: equipmentSchema,
        nickname: z.string(),
        hasRenamed: z.boolean(),
        spriteUrl: z.string(),
        stats: statsSchema,
        equipmentBonus: equipmentBonusSchema,
        talentBonus: talentBonusSchema,
        proficiencyBonus: proficiencyBonusSchema,
        nextChapterIndex: z.number(),
        currentLevelIndex: z.number(),
        chapterTotalLevels: z.number(),
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
 * POST /api/character/:characterId/talents
 */
export const allocateTalentRequestSchema = z.object({ nodeId: z.string().min(1) }).strict();

export const allocateTalentResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        talents: talentsSchema,
        talentPoints: z.number(),
    }),
});

/**
 * POST /api/character/:characterId/nickname
 */
export const setNicknameRequestSchema = z.object({ nickname: z.string().min(1).max(20) }).strict();

export const setNicknameResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        nickname: z.string(),
        hasRenamed: z.boolean(),
        gems: z.number(),
        gemsSpent: z.number(),
    }),
});

/**
 * DELETE /api/character/:characterId
 */
export const deleteCharacterResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ message: z.string() }),
});

export type GetRosterResponse = z.infer<typeof getRosterResponseSchema>;
export type CreateCharacterRequest = z.infer<typeof createCharacterRequestSchema>;
export type GetCharacterResponse = z.infer<typeof getCharacterResponseSchema>;
export type AllocateAttributesRequest = z.infer<typeof allocateAttributesRequestSchema>;
export type AllocateAttributesResponse = z.infer<typeof allocateAttributesResponseSchema>;
export type AllocateTalentRequest = z.infer<typeof allocateTalentRequestSchema>;
export type AllocateTalentResponse = z.infer<typeof allocateTalentResponseSchema>;
export type SetNicknameRequest = z.infer<typeof setNicknameRequestSchema>;
export type SetNicknameResponse = z.infer<typeof setNicknameResponseSchema>;
export type DeleteCharacterResponse = z.infer<typeof deleteCharacterResponseSchema>;
