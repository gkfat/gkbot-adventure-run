import type {
    Attributes, Stats, 
} from '../../shared/types';

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
 * Calculate base stats from attributes (without equipment)
 */
export async function calculateBaseStats(
    attributes: Attributes,
    characterLevel: number,
): Promise<Omit<Stats, 'HP_CURRENT'>> {
    const {
        STR, AGI, CON, LUCK, 
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
  
    // Crit/dodge chance calculation (from combat config)
    const { COMBAT_CONFIG } = await import('../../shared/types/adventure');
  
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
    };
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
        dodgeChance: baseStats.dodgeChance,
    };
}
