/**
 * Equipment gacha (老虎機) pull cost — shared between server (charging
 * the cost) and app (displaying it) so the two never drift apart.
 */

/**
 * Fixed cost per pull, one currency at a time (player picks which to spend).
 */
export const GACHA_CONFIG = {
    GOLD_COST: 500,
    GEMS_COST: 5,
} as const;
