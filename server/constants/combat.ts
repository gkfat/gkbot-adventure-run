/**
 * Enemy archetypes and combat reward formulas.
 *
 * ASSUMPTION (see combat-engine/design.md): none of this is defined anywhere
 * else in the repo — the referenced `10_戰鬥模型.md` doesn't exist, and
 * docs/worldview.md explicitly leaves monster naming/stats to this change.
 * Base stats are set at enemyLevel=1; actual combat stats are scaled via
 * getStatMultipliers() (difficulty.ts) for the node's real enemyLevel/tier.
 */

import { COMBAT_CONFIG } from '../../shared/types/adventure';
import {
    ItemType, ItemSource, 
} from '../../shared/types/item';
import { Rarity } from '../../shared/types/common';
import type { EnemyTier } from './difficulty';

export type EnemyArchetype = {
    name: string;
    baseAtk: number;
    baseDef: number;
    baseHp: number;
    actionIntervalSec: number;
};

// Four archetypes echoing worldview.md's "維修設施殘存 GkBot 與失控機具" +
// logicard-duel's 工作/防禦/侵略/雜兵 flavor split (not required to map 1:1).
export const ENEMY_ARCHETYPES: EnemyArchetype[] = [
    {
        name: '維修型 GkBot', baseAtk: 8, baseDef: 4, baseHp: 60, actionIntervalSec: 2.5,
    },
    {
        name: '保全機具', baseAtk: 6, baseDef: 8, baseHp: 80, actionIntervalSec: 3.0,
    },
    {
        name: '失控搬運機', baseAtk: 12, baseDef: 2, baseHp: 50, actionIntervalSec: 2.2,
    },
    {
        name: '廢棄零件堆', baseAtk: 4, baseDef: 2, baseHp: 30, actionIntervalSec: 3.5,
    },
];

// Enemies use the same base crit/dodge as players but skip the per-AGI bonus
// (enemies have no AGI attribute).
export const ENEMY_COMBAT_STATS = {
    critChance: COMBAT_CONFIG.BASE_CRIT_CHANCE,
    critMultiplier: COMBAT_CONFIG.CRIT_MULTIPLIER,
    dodgeChance: COMBAT_CONFIG.BASE_DODGE_CHANCE,
} as const;

const TIER_SCORE_MULTIPLIER: Record<EnemyTier, number> = {
    NORMAL: 1, ELITE: 2, STRONG_ELITE: 4,
};

const TIER_BLESSING_POINTS: Record<EnemyTier, number> = {
    NORMAL: 1, ELITE: 2, STRONG_ELITE: 3,
};

const TIER_MAX_DROP_RARITY: Record<EnemyTier, Rarity> = {
    NORMAL: Rarity.SR, ELITE: Rarity.SSR, STRONG_ELITE: Rarity.L,
};

export function scoreForKill(enemyLevel: number, tier: EnemyTier): number {
    return enemyLevel * 10 * TIER_SCORE_MULTIPLIER[tier];
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
