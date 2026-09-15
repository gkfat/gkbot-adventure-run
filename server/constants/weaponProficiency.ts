/**
 * Server-only half of weapon proficiency (weapon-proficiency-system D5):
 * combat passive trigger magnitudes. Exp curve / stat bonus tables live in
 * shared/constants/weaponProficiency.ts (re-exported here for convenience
 * since every server call site needs both halves).
 */
import { WeaponType } from '../../shared/types/common';

export * from '../../shared/constants/weaponProficiency';

/**
 * FIST/BLUNT/POLEARM/RANGED passive magnitudes by weapon type
 * ('a' = Lv.4 unlock / Lv.8 strengthen, 'b' = Lv.6 unlock / Lv.10 Mastery).
 * BLADE's passives are handled inline in combat.service.ts (computeDamage-time
 * bonuses, not statusEffects — see design.md D5 ASSUMPTION) and are not listed here.
 */
export const WEAPON_PASSIVE_CONFIG: Record<Exclude<WeaponType, WeaponType.BLADE>, {
    a: { magnitude: number; durationAttacks: number; strengthenedMagnitude: number; strengthenedDurationAttacks: number };
    b: Record<string, number>;
}> = {
    [WeaponType.FIST]: {
        a: {
            magnitude: -0.3, durationAttacks: 2, strengthenedMagnitude: -0.3, strengthenedDurationAttacks: 3,
        },
        b: {
            threshold: 4, critChanceBonus: 0.15, masteryThreshold: 3, masteryCritChanceBonus: 0.25,
        },
    },
    [WeaponType.BLUNT]: {
        a: {
            magnitude: 0.15, durationAttacks: 2, strengthenedMagnitude: 0.25, strengthenedDurationAttacks: 2,
        },
        b: {
            chance: 0.3, extraIntervalRatio: 0.5, masteryChance: 0.5,
        },
    },
    [WeaponType.POLEARM]: {
        a: {
            magnitude: 0.5, durationAttacks: 0, strengthenedMagnitude: 0.65, strengthenedDurationAttacks: 0,
        },
        b: {
            mainTargetBonus: 0.1, masteryMainTargetBonus: 0.2, patternChanceBonus: 0.05,
        },
    },
    [WeaponType.RANGED]: {
        a: {
            magnitude: 0.05, durationAttacks: 1, strengthenedMagnitude: 0.05, strengthenedDurationAttacks: 2,
        },
        b: {
            threshold: 5, masteryThreshold: 3,
        },
    },
};

/** BLADE-specific inline damage-time bonuses (design.md D5 exception). */
export const BLADE_PASSIVE_CONFIG = {
    A_CRIT_DAMAGE_BONUS: 0.2,
    A_CRIT_DAMAGE_BONUS_STRENGTHENED: 0.35,
    B_HP_RATIO_THRESHOLD: 0.7,
    B_HP_RATIO_THRESHOLD_MASTERY: 0.5,
    B_DAMAGE_BONUS: 0.15,
    B_DAMAGE_BONUS_MASTERY: 0.25,
} as const;

/** Dual-wield-exclusive passives (design.md D5 "雙持被動" table). */
export const DUAL_WIELD_PASSIVE_CONFIG = {
    A_EXTRA_ATTACK_CHANCE: 0.05,
    A_EXTRA_ATTACK_CHANCE_STRENGTHENED: 0.1,
    A_EXTRA_ATTACK_DAMAGE_RATIO: 0.5,
    B_PATTERN_CHANCE_BONUS: 0.05,
    B_PATTERN_CHANCE_BONUS_MASTERY: 0.1,
} as const;
