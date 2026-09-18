/**
 * API schemas for shop endpoints
 */

import { z } from 'zod';
import { PurchaseDestination } from '../../types';
import { shopItemSchema } from '../firestore/shop.schema';
import { itemInstanceSchema } from '../firestore/item.schema';

/**
 * GET /api/character/{characterId}/shop
 */
export const getShopResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        date: z.string(),
        items: z.array(shopItemSchema),
    }),
});

/**
 * POST /api/shop/purchase
 */
export const purchaseItemRequestSchema = z.object({
    slotId: z.string(),
    destination: z.nativeEnum(PurchaseDestination),
    replaceSlot: z.string().optional(),
}).strict();

export const purchaseItemResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        // Present for `type: 'ITEM'` slots; absent for `SKILL_FRAGMENT` slots.
        item: z.object({
            itemId: z.string(),
            templateId: z.string(),
            rarity: z.string(),
        }).optional(),
        // Present only for `type: 'SKILL_FRAGMENT'` slots (character-skills).
        skillFragment: z.object({
            skillId: z.string(),
            amount: z.number().int().min(1),
            name: z.string(),
            icon: z.string(),
        }).optional(),
        goldSpent: z.number().optional(),
        gemsSpent: z.number().optional(),
    }),
});

/**
 * GET /api/character/{characterId}/shop/daily-supply
 */
export const getDailySupplyResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        date: z.string(),
        rewardGold: z.number(),
        item: itemInstanceSchema,
        claimed: z.boolean(),
    }),
});

/**
 * POST /api/character/{characterId}/shop/daily-supply/claim
 */
export const claimDailySupplyResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        rewardGold: z.number(),
        item: itemInstanceSchema,
    }),
});

export type GetShopResponse = z.infer<typeof getShopResponseSchema>;
export type PurchaseItemRequest = z.infer<typeof purchaseItemRequestSchema>;
export type PurchaseItemResponse = z.infer<typeof purchaseItemResponseSchema>;
export type GetDailySupplyResponse = z.infer<typeof getDailySupplyResponseSchema>;
export type ClaimDailySupplyResponse = z.infer<typeof claimDailySupplyResponseSchema>;
