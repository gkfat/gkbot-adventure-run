/**
 * Firestore schema for Item/Inventory collections
 */

import { z } from 'zod';
import {
    ItemType, ItemSource, Rarity, EquipmentSlot, WeaponType, RESOURCE_LIMITS,
} from '../../types';

/**
 * Item stats schema
 */
export const itemStatsSchema = z.object({
    ATK: z.number().optional(),
    DEF: z.number().optional(),
    HP: z.number().optional(),
    actionSpeedMod: z.number().optional(),
    dodgeChanceMod: z.number().optional(),
    critChanceMod: z.number().optional(),
    healPercent: z.number().optional(),
}).strict();

/**
 * Item instance schema — one document in the top-level `items` collection
 * (doc id = itemId). Containers only ever store the itemId string.
 */
export const itemInstanceSchema = z.object({
    itemId: z.string(),
    templateId: z.string(),
    type: z.nativeEnum(ItemType),
    equipSlot: z.nativeEnum(EquipmentSlot).optional(),
    weight: z.number().optional(),
    weaponType: z.nativeEnum(WeaponType).optional(),
    aoeChance: z.number().min(0).max(1).optional(),
    splashChance: z.number().min(0).max(1).optional(),

    // Generated properties
    rarity: z.nativeEnum(Rarity),
    stats: itemStatsSchema,

    // Name/description resolved from the template at roll time and fixed
    // thereafter (see server/services/item.service.ts generateItemInstance()).
    name: z.string(),
    description: z.string(),

    // Metadata
    source: z.nativeEnum(ItemSource),
    characterId: z.string(),
    createdAt: z.number(),
}).strict();

/**
 * Inventory document schema. `items` holds itemId references only — full
 * item data lives in the `items` collection (see itemInstanceSchema).
 */
export const inventorySchema = z.object({
    characterId: z.string(),
    items: z.array(z.string()).max(RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX),
    updatedAt: z.number(),
}).strict();

export type ItemInstance = z.infer<typeof itemInstanceSchema>;
export type ItemStats = z.infer<typeof itemStatsSchema>;
export type Inventory = z.infer<typeof inventorySchema>;
