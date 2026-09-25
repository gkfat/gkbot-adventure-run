/**
 * API schemas for the enemy bestiary endpoint (enemy-bestiary)
 */

import { z } from 'zod';

/**
 * One archetype entry. `name`/`description`/`portraitUrl`/`defeatedCount`/
 * `tier` are only present when `encountered` is `true` — the server SHALL
 * NOT include them for archetypes the character hasn't encountered yet (see
 * spec.md "查詢圖鑑 API 依遭遇狀態決定資料揭露程度").
 */
const bestiaryEntrySchema = z.object({
    slug: z.string(),
    encountered: z.boolean(),
    name: z.string().optional(),
    description: z.string().optional(),
    portraitUrl: z.string().optional(),
    // Cumulative kill count for this archetype (enemy-bestiary kill-count tracking).
    defeatedCount: z.number().int().min(0).optional(),
    // Archetype's fixed base tier (boss-tier-enhancements) — 'normal' for
    // ENEMY_ARCHETYPES/HUMAN_ARCHETYPES, 'boss' for the *_BOSS_ARCHETYPES
    // lists. Reuses EnemyAvatarTier's vocabulary (shared/utils/enemyAvatar.ts)
    // since a bestiary archetype is never independently "elite" — that's a
    // combat-time tier applied on top, not an archetype's own classification.
    tier: z.enum(['normal', 'boss']).optional(),
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
