/**
 * Equipment weight (weapon-weight-class, weapon-proficiency-system D6):
 * `weight` is the single authored value on every `type: EQUIPMENT`
 * ItemTemplate; `WeaponWeightClass` (LIGHT/MEDIUM/HEAVY) is a pure
 * derivation from it, not an independently-set field.
 */
import {
    Rarity, WeaponWeightClass,
} from '../types/common';

export const WEIGHT_CLASS_THRESHOLDS = {
    LIGHT_MAX: 3,   // weight 1-3 -> LIGHT
    MEDIUM_MAX: 6,  // weight 4-6 -> MEDIUM, 7+ -> HEAVY
} as const;

/**
 * carryCapacity = BASE_CARRY_CAPACITY + (STR + CON) * CARRY_CAPACITY_PER_STAT_POINT.
 * BASE_CARRY_CAPACITY was lowered from 20 to 10 (design.md D6b) so that, now
 * `weight` scales with rarity/roll quality (RARITY_WEIGHT_BONUS below), a
 * character can't trivially carry a full set of high-rarity gear on bare
 * STR/CON without ever triggering the overload penalty.
 */
export const BASE_CARRY_CAPACITY = 10;
export const CARRY_CAPACITY_PER_STAT_POINT = 2;

/**
 * Extra `weight` an item instance gains from its rolled rarity (design.md D6):
 * higher rarity -> better rolled bonuses -> heavier gear. Added on top of the
 * template's baseline `weight`, alongside ROLL_QUALITY_BONUS (item.service.ts).
 */
export const RARITY_WEIGHT_BONUS: Record<Rarity, number> = {
    [Rarity.N]: 0,
    [Rarity.R]: 0,
    [Rarity.SR]: 1,
    [Rarity.SSR]: 2,
    [Rarity.L]: 3,
};

/**
 * Derives an item's WeaponWeightClass from its `weight`. A missing/legacy
 * `weight` (pre-migration item instances, see design.md Migration Plan)
 * falls back to LIGHT rather than throwing.
 */
export function deriveWeaponWeightClass(weight: number | undefined): WeaponWeightClass {
    const value = weight ?? 0;
    if (value <= WEIGHT_CLASS_THRESHOLDS.LIGHT_MAX) {
        return WeaponWeightClass.LIGHT;
    }
    if (value <= WEIGHT_CLASS_THRESHOLDS.MEDIUM_MAX) {
        return WeaponWeightClass.MEDIUM;
    }
    return WeaponWeightClass.HEAVY;
}

/**
 * Full-body weight-overload penalty table (design.md D6): applied when the
 * sum of a character's 6 equipped slots' `weight` exceeds `carryCapacity`.
 * Penalties stack (not "highest tier only") as `overage` grows.
 */
export const WEIGHT_OVERLOAD_PENALTY = {
    ACTION_INTERVAL_SEC_AT_OVERAGE_1: 0.5,
    DODGE_CHANCE_AT_OVERAGE_2: 0.03,
    CRIT_CHANCE_AT_OVERAGE_3: 0.03,
    DEF_PER_POINT_BEYOND_OVERAGE_3: 1,
} as const;
