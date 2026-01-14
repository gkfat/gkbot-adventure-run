/**
 * Firestore schema for Item/Inventory collections
 */

import { z } from 'zod';
import {
    ItemType, ItemSource, Rarity, EquipmentSlot, RESOURCE_LIMITS, 
} from '../../types';

/**
 * Item stats schema
 */
export const itemStatsSchema = z.object({
    ATK: z.number().optional(),
    DEF: z.number().optional(),
    HP: z.number().optional(),
    actionSpeedMod: z.number().optional(),
}).strict();

/**
 * Item instance schema
 */
export const itemInstanceSchema = z.object({
    itemId: z.string(),
    templateId: z.string(),
    type: z.nativeEnum(ItemType),
    equipSlot: z.nativeEnum(EquipmentSlot).optional(),
  
    // Generated properties
    rarity: z.nativeEnum(Rarity),
    stats: itemStatsSchema,
  
    // Metadata
    source: z.nativeEnum(ItemSource),
    createdAt: z.number(),
}).strict();

/**
 * Inventory document schema
 */
export const inventorySchema = z.object({
    accountId: z.string(),
    items: z.array(itemInstanceSchema).max(RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX),
    updatedAt: z.number(),
}).strict();

export type ItemInstance = z.infer<typeof itemInstanceSchema>;
export type ItemStats = z.infer<typeof itemStatsSchema>;
export type Inventory = z.infer<typeof inventorySchema>;
