/**
 * Firestore schema for Shop collections
 */

import { z } from 'zod';
import { itemInstanceSchema } from './item.schema';

/**
 * Shop item schema
 */
export const shopItemSchema = z.object({
    slotId: z.string(),
    item: itemInstanceSchema,
    priceGold: z.number().int().min(0).optional(),
    priceGems: z.number().int().min(0).optional(),
    sold: z.boolean(),
    purchasedAt: z.number().optional(),
}).strict();

/**
 * Daily gold shop schema (per-character)
 */
export const dailyGoldShopSchema = z.object({
    characterId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    items: z.array(shopItemSchema),
    generatedAt: z.number(),
}).strict();

/**
 * Daily gems shop schema (per-character)
 */
export const dailyGemsShopSchema = z.object({
    characterId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    items: z.array(shopItemSchema),
    generatedAt: z.number(),
}).strict();

export type ShopItem = z.infer<typeof shopItemSchema>;
export type DailyGoldShop = z.infer<typeof dailyGoldShopSchema>;
export type DailyGemsShop = z.infer<typeof dailyGemsShopSchema>;
