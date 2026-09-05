/**
 * API schemas for the equipment gacha (老虎機) endpoint
 */

import { z } from 'zod';
import { itemInstanceSchema } from '../firestore/item.schema';

/**
 * POST /api/character/{characterId}/gacha/pull
 */
export const gachaPullRequestSchema = z.object({ currency: z.enum(['GOLD', 'GEMS']) }).strict();

export const gachaPullResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        item: itemInstanceSchema,
        currency: z.enum(['GOLD', 'GEMS']),
        amountSpent: z.number(),
        remainingBalance: z.number(),
    }),
});

export type GachaPullRequest = z.infer<typeof gachaPullRequestSchema>;
export type GachaPullResponse = z.infer<typeof gachaPullResponseSchema>;
