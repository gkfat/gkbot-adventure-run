/**
 * Firestore schema for Character collection
 */

import { z } from 'zod';
import {
    Rarity, EquipmentSlot, WeaponType, RESOURCE_LIMITS,
} from '../../types';

/**
 * Weapon proficiency (weapon-proficiency-system D2/D2b): Lv.1-10 exp/level
 * pair, shared shape for both the 5 per-WeaponType buckets and the single
 * dualWieldProficiency bucket.
 */
export const proficiencyProgressSchema = z.object({
    exp: z.number().int().min(0),
    level: z.number().int().min(1).max(10),
}).strict();

/**
 * Attributes schema
 */
export const attributesSchema = z.object({
    STR: z.number().int().min(1),
    AGI: z.number().int().min(1),
    CON: z.number().int().min(1),
    LUCK: z.number().int().min(1),
}).strict();

/**
 * Equipment mapping schema (slot -> itemId)
 */
export const equipmentSchema = z.partialRecord(
    z.nativeEnum(EquipmentSlot),
    z.string(),
).optional();

/**
 * Character document schema (strict mode)
 */
export const characterSchema = z.object({
    characterId: z.string(),
    accountId: z.string(),

    // Class (character archetype chosen at creation; 'legacy' for pre-roster characters)
    archetypeId: z.string(),
    className: z.string(),

    // Progression
    level: z.number().int().min(1).max(RESOURCE_LIMITS.LEVEL_MAX),
    exp: z.number().int().min(0),
  
    // Currency
    gold: z.number().int().min(0).max(RESOURCE_LIMITS.GOLD_MAX - 1),
    gems: z.number().int().min(0).max(RESOURCE_LIMITS.GEMS_MAX - 1),
  
    // Attributes
    attributes: attributesSchema,
    unspentAttributePoints: z.number().int().min(0),

    // Talents (character-talents)
    talentPoints: z.number().int().min(0).default(0),
    talents: z.record(z.string(), z.number().int().min(0)).default({}),

    // Weapon proficiency (weapon-proficiency-system D2/D2b): sparse record,
    // a WeaponType key only exists once the character has landed a hit with
    // it. dualWieldProficiency is a single bucket, not per-type.
    weaponProficiency: z.partialRecord(z.nativeEnum(WeaponType), proficiencyProgressSchema).default({}),
    dualWieldProficiency: proficiencyProgressSchema.default({
        exp: 0, level: 1,
    }),

    // Equipment
    equipment: equipmentSchema,

    // Facility theme for the character's next adventure run
    nextChapterIndex: z.number().int().min(0),

    // Chapter/Level hierarchy (chapter-level-structure)
    currentLevelIndex: z.number().int().min(0),
    chapterTotalLevels: z.number().int().min(1),

    // Leaderboard display
    nickname: z.string().min(1).max(20),

    // Character renaming (character-rename): first rename is free, every
    // subsequent rename costs RENAME_COST_GEMS gems.
    hasRenamed: z.boolean().default(false),

    // Enemy bestiary (enemy-bestiary): archetype slugs the character has
    // encountered (seen in a combat's first wave), used to gate name/
    // description/portrait disclosure in GET /api/character/:characterId/bestiary.
    encounteredArchetypeSlugs: z.array(z.string()).default([]),

    // Enemy bestiary — cumulative kill count per archetype slug (enemy-bestiary
    // kill-count tracking), incremented whenever a combat actually defeats a
    // unit of that archetype (independent of overall victory/defeat).
    defeatedArchetypeCounts: z.record(z.string(), z.number().int().min(0)).default({}),

    // Timestamps
    createdAt: z.number(),
    updatedAt: z.number(),
}).strict();

export type Character = z.infer<typeof characterSchema>;
export type Attributes = z.infer<typeof attributesSchema>;
export type ProficiencyProgress = z.infer<typeof proficiencyProgressSchema>;
