/**
 * Weapon proficiency (weapon-proficiency-system D4): Lv.1-10 exp curve and
 * per-level ATK%/critChance stat bonuses. Shared (not server-only) because
 * `applyProficiencyStats` lives in shared/utils/calculateStats.ts, used by
 * both the server and the frontend's live stats preview.
 *
 * ASSUMPTION (design.md D4): exp thresholds and bonus magnitudes are initial
 * balance values, centralized here so they can be retuned without touching
 * call sites. Passive *combat* magnitudes (D5) are server-only, see
 * server/constants/weaponProficiency.ts.
 */
export const PROFICIENCY_MAX_LEVEL = 10;

/** Cumulative exp required to REACH each level (level 1 = 0, the floor). */
export const PROFICIENCY_EXP_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 300,
    3: 800,
    4: 1800,
    5: 3600,
    6: 6500,
    7: 11000,
    8: 18000,
    9: 28000,
    10: 42000,
};

/** exp gained per attack outcome — mutually exclusive (D3). */
export const PROFICIENCY_EXP_PER_HIT = 1;
export const PROFICIENCY_EXP_PER_CRIT = 5;

/**
 * Derive the proficiency level (1-10) for a given cumulative exp total.
 */
export function getProficiencyLevelForExp(exp: number): number {
    let level = 1;
    for (let l = PROFICIENCY_MAX_LEVEL; l >= 1; l--) {
        if (exp >= (PROFICIENCY_EXP_THRESHOLDS[l] ?? 0)) {
            level = l;
            break;
        }
    }
    return level;
}

export type ProficiencyStatBonus = { atkPercent: number; critChance: number };

/** Cumulative ATK%/critChance bonus at each level, per WeaponType (D4 table). */
export const WEAPON_TYPE_STAT_BONUS_BY_LEVEL: Record<number, ProficiencyStatBonus> = {
    1: {
        atkPercent: 0, critChance: 0,
    },
    2: {
        atkPercent: 0.02, critChance: 0,
    },
    3: {
        atkPercent: 0.02, critChance: 0.01,
    },
    4: {
        atkPercent: 0.02, critChance: 0.01,
    },
    5: {
        atkPercent: 0.04, critChance: 0.01,
    },
    6: {
        atkPercent: 0.04, critChance: 0.01,
    },
    7: {
        atkPercent: 0.04, critChance: 0.02,
    },
    8: {
        atkPercent: 0.04, critChance: 0.02,
    },
    9: {
        atkPercent: 0.06, critChance: 0.02,
    },
    10: {
        atkPercent: 0.06, critChance: 0.02,
    },
};

/** Cumulative ATK%/critChance bonus at each level for dualWieldProficiency (D4 table). */
export const DUAL_WIELD_STAT_BONUS_BY_LEVEL: Record<number, ProficiencyStatBonus> = {
    1: {
        atkPercent: 0, critChance: 0,
    },
    2: {
        atkPercent: 0.01, critChance: 0,
    },
    3: {
        atkPercent: 0.01, critChance: 0.005,
    },
    4: {
        atkPercent: 0.01, critChance: 0.005,
    },
    5: {
        atkPercent: 0.02, critChance: 0.005,
    },
    6: {
        atkPercent: 0.02, critChance: 0.005,
    },
    7: {
        atkPercent: 0.02, critChance: 0.01,
    },
    8: {
        atkPercent: 0.02, critChance: 0.01,
    },
    9: {
        atkPercent: 0.03, critChance: 0.01,
    },
    10: {
        atkPercent: 0.03, critChance: 0.01,
    },
};

/** Which levels unlock/strengthen a weapon type's two passives (D5). */
export const PASSIVE_UNLOCK_LEVELS = {
    A_UNLOCK: 4,
    A_STRENGTHEN: 8,
    B_UNLOCK: 6,
    B_MASTERY: 10,
} as const;
