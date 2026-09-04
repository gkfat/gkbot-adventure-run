/**
 * Re-exports the shared enemy portrait resolution logic (moved to
 * shared/utils/enemyAvatar.ts for enemy-bestiary, since the server-side
 * bestiary API needs the same resolution) plus the frontend-only "unknown
 * enemy" placeholder used by the bestiary dialog for un-encountered entries.
 */
export * from '../../shared/utils/enemyAvatar';

/**
 * Fixed "unknown enemy" placeholder for a bestiary entry the character
 * hasn't encountered yet (enemy-bestiary design.md Decision 4 — no new
 * silhouette art is produced; reuse an existing mdi icon instead of a
 * per-archetype portrait). The server never sends portraitUrl for an
 * un-encountered entry, so there is no real image to mask/mask over.
 */
export const UNKNOWN_ENEMY_ICON = 'mdi-help-circle-outline';
export const UNKNOWN_ENEMY_NAME = '？？？';
export const UNKNOWN_ENEMY_DESCRIPTION = '尚未遭遇。';
