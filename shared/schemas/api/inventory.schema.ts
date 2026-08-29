/**
 * API schemas for inventory endpoints
 */

import { z } from 'zod';
import { EquipmentSlot } from '../../types';
import { itemInstanceSchema } from '../firestore/item.schema';

/**
 * GET /api/inventory
 */
export const getInventoryResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        items: z.array(itemInstanceSchema),
        count: z.number(),
        maxCount: z.number(),
    }),
});

/**
 * DELETE /api/inventory/:itemId
 */
export const deleteItemResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ message: z.string() }),
});

/**
 * POST /api/character/equip
 *
 * `slot` is optional and only meaningful for hand items (sword/dagger-type
 * equipment, whose template `equipSlot` is LEFT_HAND or RIGHT_HAND) — it lets
 * the caller pick which hand to equip into instead of always using the
 * item's own default. Ignored for any other slot.
 */
export const equipItemRequestSchema = z.object({
    itemId: z.string(),
    slot: z.nativeEnum(EquipmentSlot).optional(),
}).strict();

export const equipItemResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        equipped: itemInstanceSchema,
        unequipped: itemInstanceSchema.optional(),
    }),
});

/**
 * POST /api/character/unequip
 */
export const unequipItemRequestSchema = z.object({ slot: z.nativeEnum(EquipmentSlot) }).strict();

export const unequipItemResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ unequipped: itemInstanceSchema }),
});

export type GetInventoryResponse = z.infer<typeof getInventoryResponseSchema>;
export type DeleteItemResponse = z.infer<typeof deleteItemResponseSchema>;
export type EquipItemRequest = z.infer<typeof equipItemRequestSchema>;
export type EquipItemResponse = z.infer<typeof equipItemResponseSchema>;
export type UnequipItemRequest = z.infer<typeof unequipItemRequestSchema>;
export type UnequipItemResponse = z.infer<typeof unequipItemResponseSchema>;
