import type {
    Attributes, Stats,
} from '../types/common';
import { COMBAT_CONFIG } from '../types/adventure';

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
        carryCapacity: STR + CON,
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
        critChance: baseStats.critChance,
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
