/**
 * Combat reward/drop formulas and enemy stat config.
 *
 * Enemy archetype content data lives in ./templates/enemies.ts.
 */

import { COMBAT_CONFIG } from '../../shared/types/adventure';
import {
    ItemType, ItemSource,
} from '../../shared/types/item';
import { Rarity } from '../../shared/types/common';
import type { EnemyTier } from './difficulty';

// Boss minion reinforcement tuning (chapter-level-structure). ASSUMPTION
// (undocumented elsewhere, see design.md Open Questions): a round-based
// check interval + flat probability + a hard cap, invented to keep combat
// simulation length bounded — freely tunable.
export const BOSS_REINFORCE_CONFIG = {
    CHECK_INTERVAL_ROUNDS: 3,
    CHANCE: 0.5,
    MAX_REINFORCEMENTS: 2,
} as const;

// Enemies must always act slower than the player currently fighting them,
// regardless of the player's own AGI/equipment build — an enemy's
// actionIntervalSec is clamped up to at least this multiple of the player's
// actionIntervalSec (combat.service.ts buildEnemyUnit). ASSUMPTION: margin
// value invented for this change, freely tunable.
export const ENEMY_ACTION_INTERVAL_MIN_MULTIPLIER = 1.15;

// Enemies use the same base crit/dodge as players but skip the per-AGI bonus
// (enemies have no AGI attribute).
export const ENEMY_COMBAT_STATS = {
    critChance: COMBAT_CONFIG.BASE_CRIT_CHANCE,
    critMultiplier: COMBAT_CONFIG.CRIT_MULTIPLIER,
    dodgeChance: COMBAT_CONFIG.BASE_DODGE_CHANCE,
} as const;

const TIER_EXP_MULTIPLIER: Record<EnemyTier, number> = {
    NORMAL: 1, ELITE: 2, STRONG_ELITE: 4, BOSS: 8,
};

const TIER_BLESSING_POINTS: Record<EnemyTier, number> = {
    NORMAL: 1, ELITE: 2, STRONG_ELITE: 3, BOSS: 5,
};

const TIER_MAX_DROP_RARITY: Record<EnemyTier, Rarity> = {
    NORMAL: Rarity.SR, ELITE: Rarity.SSR, STRONG_ELITE: Rarity.L, BOSS: Rarity.L,
};

export function expForKill(enemyLevel: number, tier: EnemyTier): number {
    return enemyLevel * 10 * TIER_EXP_MULTIPLIER[tier];
}

export function goldForKill(enemyLevel: number): number {
    return enemyLevel * 2;
}

export function applyLuckToGold(baseGold: number, luck: number): number {
    return Math.round(baseGold * (1 + luck * 0.02));
}

export function itemDropChance(luck: number): number {
    return Math.min(0.40, Math.max(0, 0.15 + luck * 0.005));
}

export function blessingPointsForVictory(tier: EnemyTier): number {
    return TIER_BLESSING_POINTS[tier];
}

export function maxDropRarity(tier: EnemyTier): Rarity {
    return TIER_MAX_DROP_RARITY[tier];
}

export const DROP_ITEM_CONTEXT = { source: ItemSource.DROP } as const;
export const DROP_ITEM_TYPE_FILTER = ItemType.EQUIPMENT;

// Gems drop tiers by enemyLevel — >30 explicitly reuses the 21-30 tier
// per combat-engine spec.md's "enemyLevel 超出已定義範圍" scenario.
const GEMS_DROP_TIERS: { maxLevel: number; chance: number; min: number; max: number }[] = [
    {
        maxLevel: 10, chance: 0.03, min: 1, max: 1,
    },
    {
        maxLevel: 20, chance: 0.06, min: 1, max: 3,
    },
    {
        maxLevel: 30, chance: 0.10, min: 3, max: 5,
    },
];

export function gemsDropTier(enemyLevel: number) {
    return GEMS_DROP_TIERS.find(tier => enemyLevel <= tier.maxLevel) ?? GEMS_DROP_TIERS[GEMS_DROP_TIERS.length - 1] as typeof GEMS_DROP_TIERS[number];
}
