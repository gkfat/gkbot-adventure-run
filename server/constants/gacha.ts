/**
 * Equipment gacha (老虎機) constants — independent of the shop/drop rarity
 * weights (`STANDARD_RARITY_WEIGHTS` in `constants/templates/items.ts`).
 * See design.md's "老虎機稀有度權重表" decision and
 * docs/game-design/balance/drop-rates.md for the rationale behind these values.
 */

import { Rarity } from '../../shared/types/common';

/**
 * Fixed cost per pull, one currency at a time (player picks which to spend).
 */
export const GACHA_CONFIG = {
    GOLD_COST: 100,
    GEMS_COST: 5,
} as const;

/**
 * Gold pull rarity weights — cheap, low ceiling (SSR/L unreachable).
 */
export const GACHA_GOLD_RARITY_WEIGHTS: Partial<Record<Rarity, number>> = {
    [Rarity.N]: 60,
    [Rarity.R]: 30,
    [Rarity.SR]: 10,
};

/**
 * Gems pull rarity weights — pricier, guaranteed SR-or-better floor.
 */
export const GACHA_GEMS_RARITY_WEIGHTS: Partial<Record<Rarity, number>> = {
    [Rarity.SR]: 55,
    [Rarity.SSR]: 35,
    [Rarity.L]: 10,
};
