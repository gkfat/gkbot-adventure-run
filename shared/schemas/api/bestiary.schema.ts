/**
 * API schemas for the enemy bestiary endpoint (enemy-bestiary)
 */

import { z } from 'zod';

/**
 * One archetype entry. `name`/`description`/`portraitUrl`/`defeatedCount` are
 * only present when `encountered` is `true` — the server SHALL NOT include
 * them for archetypes the character hasn't encountered yet (see spec.md
 * "查詢圖鑑 API 依遭遇狀態決定資料揭露程度").
 */
const bestiaryEntrySchema = z.object({
    slug: z.string(),
    encountered: z.boolean(),
    name: z.string().optional(),
    description: z.string().optional(),
    portraitUrl: z.string().optional(),
    // Cumulative kill count for this archetype (enemy-bestiary kill-count tracking).
    defeatedCount: z.number().int().min(0).optional(),
});

/**
 * GET /api/character/:characterId/bestiary
 */
export const getBestiaryResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ archetypes: z.array(bestiaryEntrySchema) }),
});

export type BestiaryEntry = z.infer<typeof bestiaryEntrySchema>;
export type GetBestiaryResponse = z.infer<typeof getBestiaryResponseSchema>;
