/**
 * Difficulty curve formulas — enemy level, stat multipliers, and multi-wave/
 * multi-enemy probabilities, all driven by `step` (see shared DIFFICULTY_CONFIG).
 *
 * Pure functions only: this change owns the *formulas*, not the actual enemy
 * stat construction (that needs base enemy templates, which belong to
 * `combat-engine`). `getEnemyLevel`/`getStatMultiplier` give `combat-engine`
 * everything it needs to scale its own base stats.
 */

import {
    DIFFICULTY_CONFIG, SEVERITY_CONFIG, type FacilitySeverity,
} from '../../shared/types/adventure';
import { clamp } from '../../shared/types/common';

export type EnemyTier = 'NORMAL' | 'ELITE' | 'STRONG_ELITE' | 'BOSS';

/**
 * `enemyLevel = 1 + floor(step / ENEMY_LEVEL_STEP_DIVISOR)`
 */
export function getEnemyLevel(step: number): number {
    return 1 + Math.floor(step / DIFFICULTY_CONFIG.ENEMY_LEVEL_STEP_DIVISOR);
}

/**
 * Combined stat multiplier for a given enemy level + tier: a per-level base
 * growth curve, scaled further by the tier's flat multiplier (ELITE/STRONG_ELITE
 * stack on top of the base curve, not on top of a level-1 enemy).
 */
export function getStatMultipliers(
    enemyLevel: number, tier: EnemyTier | 'BOSS_MINION', severityTier: FacilitySeverity = 'PARTIAL_ACTIVE',
): { hp: number; atk: number; def: number } {
    const levelSteps = Math.max(0, enemyLevel - 1);
    const baseHp = 1 + levelSteps * DIFFICULTY_CONFIG.HP_MULT_PER_LEVEL;
    const baseAtk = 1 + levelSteps * DIFFICULTY_CONFIG.ATK_MULT_PER_LEVEL;
    const baseDef = 1 + levelSteps * DIFFICULTY_CONFIG.DEF_MULT_PER_LEVEL;

    const tierMult = {
        NORMAL: {
            hp: 1, atk: 1, def: 1,
        },
        ELITE: {
            hp: DIFFICULTY_CONFIG.ELITE_HP_MULT,
            atk: DIFFICULTY_CONFIG.ELITE_ATK_MULT,
            def: DIFFICULTY_CONFIG.ELITE_DEF_MULT,
        },
        STRONG_ELITE: {
            hp: DIFFICULTY_CONFIG.STRONG_ELITE_HP_MULT,
            atk: DIFFICULTY_CONFIG.STRONG_ELITE_ATK_MULT,
            def: DIFFICULTY_CONFIG.STRONG_ELITE_DEF_MULT,
        },
        // ASSUMPTION (see design.md): BOSS multipliers extend the Elite/Strong
        // Elite progression, higher than STRONG_ELITE across all three stats.
        BOSS: {
            hp: 4.0, atk: 2.8, def: 2.0,
        },
        // Boss escort minions share the boss's own archetype (already
        // boss-scale baseHp/baseAtk/baseDef) — kept below 1.0 so escorts
        // stay weaker than the boss unit itself (see combat.service.ts).
        BOSS_MINION: {
            hp: DIFFICULTY_CONFIG.BOSS_MINION_HP_MULT,
            atk: DIFFICULTY_CONFIG.BOSS_MINION_ATK_MULT,
            def: DIFFICULTY_CONFIG.BOSS_MINION_DEF_MULT,
        },
    }[tier];

    // Facility severity (enemy-factions-and-severity design.md 決策 2)
    // stacks on top of the tier curve — PARTIAL_ACTIVE's multiplier is 1.0,
    // so this is a no-op for the pre-change baseline.
    const severityMult = SEVERITY_CONFIG.SEVERITY_STAT_MULTIPLIER[severityTier];

    return {
        hp: baseHp * tierMult.hp * severityMult.hp,
        atk: baseAtk * tierMult.atk * severityMult.atk,
        def: baseDef * tierMult.def * severityMult.def,
    };
}

/**
 * `clamp(base + perStep*step, 0, cap)` — shared shape for every step-scaled
 * probability below.
 */
function scaledChance(step: number, base: number, perStep: number, cap: number): number {
    return clamp(base + perStep * step, 0, cap);
}

/**
 * Facility severity (enemy-factions-and-severity design.md 決策 2) multiplies
 * on top of a step-scaled chance, re-clamped to the same cap so severity
 * never pushes the probability past the existing ceiling.
 */
function applySeverityMultiplier(chance: number, cap: number, severityTier: FacilitySeverity): number {
    return clamp(chance * SEVERITY_CONFIG.SEVERITY_WAVE_ENEMY_MULTIPLIER[severityTier], 0, cap);
}

export function getWave2Chance(step: number, severityTier: FacilitySeverity = 'PARTIAL_ACTIVE'): number {
    const chance = scaledChance(
        step,
        DIFFICULTY_CONFIG.WAVE_2_BASE_CHANCE,
        DIFFICULTY_CONFIG.WAVE_2_PER_STEP,
        DIFFICULTY_CONFIG.WAVE_2_CAP,
    );
    return applySeverityMultiplier(chance, DIFFICULTY_CONFIG.WAVE_2_CAP, severityTier);
}

export function getEnemy2Chance(step: number, severityTier: FacilitySeverity = 'PARTIAL_ACTIVE'): number {
    const chance = scaledChance(
        step,
        DIFFICULTY_CONFIG.ENEMY_2_BASE_CHANCE,
        DIFFICULTY_CONFIG.ENEMY_2_PER_STEP,
        DIFFICULTY_CONFIG.ENEMY_2_CAP,
    );
    return applySeverityMultiplier(chance, DIFFICULTY_CONFIG.ENEMY_2_CAP, severityTier);
}

export function getEnemy3Chance(step: number, severityTier: FacilitySeverity = 'PARTIAL_ACTIVE'): number {
    const chance = scaledChance(
        step,
        DIFFICULTY_CONFIG.ENEMY_3_BASE_CHANCE,
        DIFFICULTY_CONFIG.ENEMY_3_PER_STEP,
        DIFFICULTY_CONFIG.ENEMY_3_CAP,
    );
    return applySeverityMultiplier(chance, DIFFICULTY_CONFIG.ENEMY_3_CAP, severityTier);
}

/**
 * Roll the wave count (1 or capped at DIFFICULTY_CONFIG.WAVE_COUNT_MAX) for
 * a combat node, given a single RNG draw in [0, 1) from RngService.
 */
export function rollWaveCount(step: number, rngValue: number, severityTier: FacilitySeverity = 'PARTIAL_ACTIVE'): number {
    return rngValue < getWave2Chance(step, severityTier) ? Math.min(2, DIFFICULTY_CONFIG.WAVE_COUNT_MAX) : 1;
}

/**
 * Roll the enemy count for a single wave (1~3, capped at
 * DIFFICULTY_CONFIG.ENEMY_COUNT_MAX), given a single RNG draw in [0, 1).
 * Thresholds stack: [0, enemy3Chance) -> 3, [enemy3Chance, enemy3Chance+enemy2Chance) -> 2, else 1.
 */
export function rollEnemyCount(step: number, rngValue: number, severityTier: FacilitySeverity = 'PARTIAL_ACTIVE'): number {
    const enemy3Chance = getEnemy3Chance(step, severityTier);
    const enemy2Chance = getEnemy2Chance(step, severityTier);

    if (rngValue < enemy3Chance) {
        return Math.min(3, DIFFICULTY_CONFIG.ENEMY_COUNT_MAX);
    }
    if (rngValue < enemy3Chance + enemy2Chance) {
        return Math.min(2, DIFFICULTY_CONFIG.ENEMY_COUNT_MAX);
    }
    return 1;
}
