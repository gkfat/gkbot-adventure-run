/**
 * Firestore schema for Shop collections
 */

import { z } from 'zod';
import { itemInstanceSchema } from './item.schema';

/**
 * Shop item schema — each item is priced in exactly one currency. `type`
 * defaults to `'ITEM'` when absent (pre-`character-skills` documents); a
 * `'SKILL_FRAGMENT'` slot carries `skillId`/`fragmentAmount` instead of `item`
 * (character-skills「商店技能碎片商品」). A `'SKILL_EXP_CHIP'` slot carries a
 * single `item` (a `skill_exp_chip` instance), same shape as `'ITEM'`
 * (skill-universal-star-upgrade「商店技能經驗值晶片商品」).
 */
export const shopItemSchema = z.object({
    slotId: z.string(),
    type: z.enum([
        'ITEM',
        'SKILL_FRAGMENT',
        'SKILL_EXP_CHIP',
    ]).optional(),
    item: itemInstanceSchema.optional(),
    skillId: z.string().optional(),
    fragmentAmount: z.number().int().min(1).optional(),
    currency: z.enum(['GOLD', 'GEMS']),
    price: z.number().int().min(0),
    sold: z.boolean(),
    purchasedAt: z.number().optional(),
}).strict();

/**
 * Daily shop schema (per-character) — merges gold/gems shops into one list.
 */
export const dailyShopSchema = z.object({
    characterId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    items: z.array(shopItemSchema),
    generatedAt: z.number(),
}).strict();

/**
 * Daily supply schema (per-character) — one free claim per day: a fixed
 * amount of gold plus one pre-rolled N-rarity equipment item, lazily
 * generated the same way as dailyShopSchema (doc id = `{characterId}_{date}`).
 */
export const dailySupplySchema = z.object({
    characterId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    rewardGold: z.number().int().min(0),
    item: itemInstanceSchema,
    claimed: z.boolean(),
    claimedAt: z.number().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
}).strict();

export type ShopItem = z.infer<typeof shopItemSchema>;
export type DailyShop = z.infer<typeof dailyShopSchema>;
export type DailySupply = z.infer<typeof dailySupplySchema>;
