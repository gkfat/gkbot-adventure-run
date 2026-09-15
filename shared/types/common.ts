/**
 * Common types used across the application
 */

export type Timestamp = number; // Unix timestamp in milliseconds

export type UUID = string;

/**
 * Item rarity levels
 */
export enum Rarity {
  N = 'N',       // Normal
  R = 'R',       // Rare
  SR = 'SR',     // Super Rare
  SSR = 'SSR',   // Super Super Rare
  L = 'L',       // Legendary
}

/**
 * Equipment slots (6 total)
 */
export enum EquipmentSlot {
  HEAD = 'HEAD',
  BODY = 'BODY',
  SHOES = 'SHOES',
  LEFT_HAND = 'LEFT_HAND',
  RIGHT_HAND = 'RIGHT_HAND',
  RING = 'RING',
}

/**
 * Sword/dagger-type weapons are equippable to either hand — a hand item is
 * not fixed to the specific slot it happened to generate with.
 */
export const HAND_SLOTS: EquipmentSlot[] = [EquipmentSlot.RIGHT_HAND, EquipmentSlot.LEFT_HAND];

/**
 * Equipment weight class (all EQUIPMENT-type ItemTemplates, not just weapons):
 * a speed/power/dodge tradeoff independent of rarity. LIGHT favors the
 * secondary stat (actionSpeedMod), MEDIUM is pure primary-stat growth, HEAVY
 * maximizes the primary stat at the cost of actionSpeedMod/dodgeChanceMod
 * penalties that worsen with rarity.
 */
export enum WeaponWeightClass {
  LIGHT = 'LIGHT',
  MEDIUM = 'MEDIUM',
  HEAVY = 'HEAVY',
}

/**
 * Weapon type classification: determines proficiency tracking bucket and
 * combat playstyle passives. Presence of `weaponType` on an ItemTemplate is
 * the sole signal that it is a weapon (see weapon-proficiency-system design D1).
 */
export enum WeaponType {
  FIST = 'FIST',
  BLADE = 'BLADE',
  BLUNT = 'BLUNT',
  POLEARM = 'POLEARM',
  RANGED = 'RANGED',
}

/**
 * Character attributes (permanent, player-controlled growth)
 */
export type Attributes = {
  STR: number;  // Strength - affects ATK
  AGI: number;  // Agility - affects action speed, crit, dodge
  CON: number;  // Constitution - affects DEF, HP
  LUCK: number; // Luck - affects drop rates, blessing rarity
};

/**
 * Character stats (derived from attributes + equipment + modifiers)
 */
export type Stats = {
  ATK: number;             // Attack power
  DEF: number;             // Defense
  HP_MAX: number;          // Maximum HP
  HP_CURRENT: number;      // Current HP
  actionIntervalSec: number; // Seconds per attack (lower is faster)
  critChance: number;      // Critical hit chance (0.0 - 1.0)
  critMultiplier: number;  // Critical damage multiplier
  dodgeChance: number;     // Dodge chance (0.0 - 1.0)
  carryCapacity: number;   // STR+CON+talentBonus.carryCapacity — how much a HEAVY
                            // item's actionSpeedMod/dodgeChanceMod penalty gets
                            // discounted; not affected by equipment itself, but
                            // IS affected by talents (permanent growth, same
                            // bucket as attributes — see character-talents)
};

/**
 * Currency types
 */
export type Currency = {
  gold: number;  // 0 <= gold < 100000
  gems: number;  // 0 <= gems < 100000
};

/**
 * Resource limits
 */
export const RESOURCE_LIMITS = {
    GOLD_MAX: 100000,
    GEMS_MAX: 100000,
    LEVEL_MAX: 30,
    INVENTORY_PERMANENT_MAX: 500,
    INVENTORY_RUN_MAX: 50,
} as const;

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Clamp currency to valid range
 */
export function clampCurrency(amount: number): number {
    return clamp(amount, 0, RESOURCE_LIMITS.GOLD_MAX - 1);
}
