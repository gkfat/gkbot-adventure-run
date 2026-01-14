/**
 * Firestore schema for Character collection
 */

import { z } from 'zod';
import {
    Rarity, EquipmentSlot, RESOURCE_LIMITS, 
} from '../../types';

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
 * Healing potion schema
 */
export const healingPotionSchema = z.object({
    level: z.number().int().min(1).max(15),
    coolDownUntil: z.number(),
}).strict();

/**
 * Equipment mapping schema (slot -> itemId)
 */
export const equipmentSchema = z.record(
    z.nativeEnum(EquipmentSlot),
    z.string(),
).optional();

/**
 * Character document schema (strict mode)
 */
export const characterSchema = z.object({
    characterId: z.string(),
    accountId: z.string(),
  
    // Progression
    level: z.number().int().min(1).max(RESOURCE_LIMITS.LEVEL_MAX),
    exp: z.number().int().min(0),
  
    // Currency
    gold: z.number().int().min(0).max(RESOURCE_LIMITS.GOLD_MAX - 1),
    gems: z.number().int().min(0).max(RESOURCE_LIMITS.GEMS_MAX - 1),
  
    // Attributes
    attributes: attributesSchema,
    unspentAttributePoints: z.number().int().min(0),
  
    // Equipment
    equipment: equipmentSchema,
  
    // Healing potion
    healingPotion: healingPotionSchema,
  
    // Leaderboard display
    nickname: z.string().optional(),
  
    // Timestamps
    createdAt: z.number(),
    updatedAt: z.number(),
}).strict();

export type Character = z.infer<typeof characterSchema>;
export type Attributes = z.infer<typeof attributesSchema>;
export type HealingPotion = z.infer<typeof healingPotionSchema>;
