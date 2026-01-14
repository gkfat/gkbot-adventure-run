/**
 * API schemas for shop endpoints
 */

import { z } from 'zod';
import {
    ShopType, PurchaseDestination, 
} from '../../types';
import { shopItemSchema } from '../firestore/shop.schema';

/**
 * GET /api/shop/gold
 */
export const getGoldShopResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        date: z.string(),
        items: z.array(shopItemSchema),
    }),
});

/**
 * GET /api/shop/gems
 */
export const getGemsShopResponseSchema = z.object({
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
    shopType: z.nativeEnum(ShopType),
    slotId: z.string(),
    destination: z.nativeEnum(PurchaseDestination),
    replaceSlot: z.string().optional(),
}).strict();

export const purchaseItemResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        item: z.object({
            itemId: z.string(),
            templateId: z.string(),
            rarity: z.string(),
        }),
        goldSpent: z.number().optional(),
        gemsSpent: z.number().optional(),
    }),
});

export type GetGoldShopResponse = z.infer<typeof getGoldShopResponseSchema>;
export type GetGemsShopResponse = z.infer<typeof getGemsShopResponseSchema>;
export type PurchaseItemRequest = z.infer<typeof purchaseItemRequestSchema>;
export type PurchaseItemResponse = z.infer<typeof purchaseItemResponseSchema>;
