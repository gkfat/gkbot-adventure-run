import type {
    Attributes, Stats, WeaponType,
} from '../types/common';
import { COMBAT_CONFIG } from '../types/adventure';
import {
    WEIGHT_OVERLOAD_PENALTY, BASE_CARRY_CAPACITY, CARRY_CAPACITY_PER_STAT_POINT,
} from '../constants/equipmentWeight';
import {
    WEAPON_TYPE_STAT_BONUS_BY_LEVEL, DUAL_WIELD_STAT_BONUS_BY_LEVEL,
} from '../constants/weaponProficiency';

export const STATS_CONFIG = {
    // Base stats at level 1 with attributes = 1
    BASE_ATK: 10,
    BASE_DEF: 5,
    BASE_HP: 100,
    BASE_ACTION_INTERVAL_SEC: 3.0, // 3 seconds per attack

    // Attribute to stats conversion coefficients
    STR_TO_ATK: 2.5,
    CON_TO_DEF: 1.5,
    CON_TO_HP: 20,
    AGI_TO_ACTION_SPEED: 0.02, // Each AGI reduces interval by 0.02 sec

    // Action speed limits
    ACTION_INTERVAL_MIN: 0.5,  // Fastest: 0.5 sec per attack
    ACTION_INTERVAL_MAX: 5.0,  // Slowest: 5.0 sec per attack
} as const;

/**
 * Calculate base stats from attributes (without equipment). Pure and
 * synchronous so it can also drive a live preview on the frontend while
 * allocating attribute points (see characterStage.vue).
 */
export function calculateBaseStats(
    attributes: Attributes,
): Omit<Stats, 'HP_CURRENT'> {
    const {
        STR, AGI, CON,
    } = attributes;

    // Attack: base + STR scaling
    const ATK = Math.floor(
        STATS_CONFIG.BASE_ATK + STR * STATS_CONFIG.STR_TO_ATK,
    );

    // Defense: base + CON scaling
    const DEF = Math.floor(
        STATS_CONFIG.BASE_DEF + CON * STATS_CONFIG.CON_TO_DEF,
    );

    // Max HP: base + CON scaling
    const HP_MAX = Math.floor(
        STATS_CONFIG.BASE_HP + CON * STATS_CONFIG.CON_TO_HP,
    );

    // Action speed: base - AGI scaling (lower is faster)
    const actionIntervalSec = Math.max(
        STATS_CONFIG.ACTION_INTERVAL_MIN,
        Math.min(
            STATS_CONFIG.ACTION_INTERVAL_MAX,
            STATS_CONFIG.BASE_ACTION_INTERVAL_SEC - AGI * STATS_CONFIG.AGI_TO_ACTION_SPEED,
        ),
    );

    const critChance = Math.min(
        COMBAT_CONFIG.CRIT_CAP,
        COMBAT_CONFIG.BASE_CRIT_CHANCE + AGI * COMBAT_CONFIG.CRIT_PER_AGI,
    );

    const dodgeChance = Math.min(
        COMBAT_CONFIG.DODGE_CAP,
        COMBAT_CONFIG.BASE_DODGE_CHANCE + AGI * COMBAT_CONFIG.DODGE_PER_AGI,
    );

    return {
        ATK,
        DEF,
        HP_MAX,
        actionIntervalSec,
        critChance,
        critMultiplier: COMBAT_CONFIG.CRIT_MULTIPLIER,
        dodgeChance,
        carryCapacity: BASE_CARRY_CAPACITY + (STR + CON) * CARRY_CAPACITY_PER_STAT_POINT,
    };
}

/**
 * Combat power: a single number summarizing a character's effective Stats.
 * Used both for UI display (characterStage.vue) and, via
 * calculateAttributePower below, as the input to chapter/stage progression
 * scaling (see PROGRESSION_CONFIG in shared/types/adventure.ts).
 * ASSUMPTION (no design doc backing): weights are invented, freely tunable.
 */
export const COMBAT_POWER_CONFIG = {
    ATK_WEIGHT: 2,
    DEF_WEIGHT: 2,
    HP_MAX_WEIGHT: 0.1,
    ACTION_SPEED_WEIGHT: 20, // multiplies 1 / actionIntervalSec
    CRIT_WEIGHT: 30,         // multiplies critChance * critMultiplier
    DODGE_WEIGHT: 30,        // multiplies dodgeChance
} as const;

export function calculateCombatPower(stats: Omit<Stats, 'HP_CURRENT'>): number {
    const {
        ATK, DEF, HP_MAX, actionIntervalSec, critChance, critMultiplier, dodgeChance,
    } = stats;

    return Math.round(
        ATK * COMBAT_POWER_CONFIG.ATK_WEIGHT
        + DEF * COMBAT_POWER_CONFIG.DEF_WEIGHT
        + HP_MAX * COMBAT_POWER_CONFIG.HP_MAX_WEIGHT
        + (1 / actionIntervalSec) * COMBAT_POWER_CONFIG.ACTION_SPEED_WEIGHT
        + critChance * critMultiplier * COMBAT_POWER_CONFIG.CRIT_WEIGHT
        + dodgeChance * COMBAT_POWER_CONFIG.DODGE_WEIGHT,
    );
}

/**
 * Attribute-only combat power (no equipment) — the input chapter/stage
 * progression scaling uses, since those rolls happen deep in
 * CharacterRepository/AdventureRunRepository as synchronous, deterministic
 * functions that can't do an async equipment lookup (see PROGRESSION_CONFIG
 * doc comment in shared/types/adventure.ts).
 */
export function calculateAttributePower(attributes: Attributes): number {
    return calculateCombatPower(calculateBaseStats(attributes));
}

/**
 * Apply equipment modifiers to base stats
 */
export function applyEquipmentStats(
    baseStats: Omit<Stats, 'HP_CURRENT'>,
    equipmentStats: Partial<Stats>,
): Omit<Stats, 'HP_CURRENT'> {
    return {
        ATK: baseStats.ATK + (equipmentStats.ATK || 0),
        DEF: baseStats.DEF + (equipmentStats.DEF || 0),
        HP_MAX: baseStats.HP_MAX + (equipmentStats.HP_MAX || 0),
        actionIntervalSec: Math.max(
            STATS_CONFIG.ACTION_INTERVAL_MIN,
            Math.min(
                STATS_CONFIG.ACTION_INTERVAL_MAX,
                baseStats.actionIntervalSec + (equipmentStats.actionIntervalSec || 0),
            ),
        ),
        critChance: Math.max(
            0,
            Math.min(
                COMBAT_CONFIG.CRIT_CAP,
                baseStats.critChance + (equipmentStats.critChance || 0),
            ),
        ),
        critMultiplier: baseStats.critMultiplier,
        dodgeChance: Math.max(
            0,
            Math.min(
                COMBAT_CONFIG.DODGE_CAP,
                baseStats.dodgeChance + (equipmentStats.dodgeChance || 0),
            ),
        ),
        // Carry capacity is derived purely from attributes (STR+CON) —
        // equipment doesn't change how much you can carry, only what you're
        // carrying.
        carryCapacity: baseStats.carryCapacity,
    };
}

/**
 * Apply talent effect totals (character-talents) to stats — same shape and
 * clamp behavior as applyEquipmentStats, applied after it in the pipeline
 * (calculateBaseStats -> applyEquipmentStats -> applyTalentStats). Unlike
 * equipment, talents ARE allowed to add to carryCapacity: talents are
 * permanent growth (same bucket as attributes), not a swappable resource
 * (see design.md decision 4).
 */
export function applyTalentStats(
    stats: Omit<Stats, 'HP_CURRENT'>,
    talentBonus: Partial<Stats>,
): Omit<Stats, 'HP_CURRENT'> {
    return {
        ATK: stats.ATK + (talentBonus.ATK || 0),
        DEF: stats.DEF + (talentBonus.DEF || 0),
        HP_MAX: stats.HP_MAX + (talentBonus.HP_MAX || 0),
        actionIntervalSec: Math.max(
            STATS_CONFIG.ACTION_INTERVAL_MIN,
            Math.min(
                STATS_CONFIG.ACTION_INTERVAL_MAX,
                stats.actionIntervalSec + (talentBonus.actionIntervalSec || 0),
            ),
        ),
        critChance: Math.min(
            COMBAT_CONFIG.CRIT_CAP,
            stats.critChance + (talentBonus.critChance || 0),
        ),
        critMultiplier: stats.critMultiplier,
        dodgeChance: Math.max(
            0,
            Math.min(
                COMBAT_CONFIG.DODGE_CAP,
                stats.dodgeChance + (talentBonus.dodgeChance || 0),
            ),
        ),
        carryCapacity: stats.carryCapacity + (talentBonus.carryCapacity || 0),
    };
}

/**
 * Apply weapon-type + dual-wield proficiency stat bonuses (ATK%/critChance),
 * applied after applyTalentStats in the pipeline (weapon-proficiency-system
 * D4). Each currently-equipped hand item carrying a `weaponType` contributes
 * its type's bonus once (a duplicate type across both hands isn't doubled —
 * callers pass distinct types); the dual-wield bonus is added only when
 * `bothHandsAreWeapons` is true.
 */
export function applyProficiencyStats(
    stats: Omit<Stats, 'HP_CURRENT'>,
    equippedWeaponTypeLevels: Partial<Record<WeaponType, number>>,
    dualWieldLevel: number,
    bothHandsAreWeapons: boolean,
): Omit<Stats, 'HP_CURRENT'> {
    let atkPercent = 0;
    let critChanceBonus = 0;

    for (const level of Object.values(equippedWeaponTypeLevels)) {
        const bonus = WEAPON_TYPE_STAT_BONUS_BY_LEVEL[level as number] ?? WEAPON_TYPE_STAT_BONUS_BY_LEVEL[1];
        atkPercent += bonus?.atkPercent ?? 0;
        critChanceBonus += bonus?.critChance ?? 0;
    }

    if (bothHandsAreWeapons) {
        const dualBonus = DUAL_WIELD_STAT_BONUS_BY_LEVEL[dualWieldLevel] ?? DUAL_WIELD_STAT_BONUS_BY_LEVEL[1];
        atkPercent += dualBonus?.atkPercent ?? 0;
        critChanceBonus += dualBonus?.critChance ?? 0;
    }

    return {
        ...stats,
        ATK: Math.floor(stats.ATK * (1 + atkPercent)),
        critChance: Math.max(
            0,
            Math.min(COMBAT_CONFIG.CRIT_CAP, stats.critChance + critChanceBonus),
        ),
    };
}

/**
 * Apply the full-body weight-overload penalty (weapon-weight-class D6):
 * stacking, fixed penalties when `totalEquippedWeight` exceeds
 * `stats.carryCapacity`. Applied after applyTalentStats (carryCapacity is
 * final by then) — independent of, and additive with, a HEAVY item's own
 * actionSpeedMod/dodgeChanceMod penalty.
 */
export function applyWeightOverloadPenalty(
    stats: Omit<Stats, 'HP_CURRENT'>,
    totalEquippedWeight: number,
): Omit<Stats, 'HP_CURRENT'> {
    const overage = totalEquippedWeight - stats.carryCapacity;
    if (overage <= 0) {
        return stats;
    }

    let {
        actionIntervalSec, dodgeChance, critChance, DEF,
    } = stats;

    if (overage >= 1) {
        actionIntervalSec += WEIGHT_OVERLOAD_PENALTY.ACTION_INTERVAL_SEC_AT_OVERAGE_1;
    }
    if (overage >= 2) {
        dodgeChance -= WEIGHT_OVERLOAD_PENALTY.DODGE_CHANCE_AT_OVERAGE_2;
    }
    if (overage >= 3) {
        critChance -= WEIGHT_OVERLOAD_PENALTY.CRIT_CHANCE_AT_OVERAGE_3;
    }
    if (overage >= 4) {
        DEF -= Math.floor(overage - 3) * WEIGHT_OVERLOAD_PENALTY.DEF_PER_POINT_BEYOND_OVERAGE_3;
    }

    return {
        ...stats,
        DEF: Math.max(0, DEF),
        actionIntervalSec: Math.max(
            STATS_CONFIG.ACTION_INTERVAL_MIN,
            Math.min(STATS_CONFIG.ACTION_INTERVAL_MAX, actionIntervalSec),
        ),
        critChance: Math.max(0, Math.min(COMBAT_CONFIG.CRIT_CAP, critChance)),
        dodgeChance: Math.max(0, Math.min(COMBAT_CONFIG.DODGE_CAP, dodgeChance)),
    };
}
