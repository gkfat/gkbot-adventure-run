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
 * Equipment slots
 */
export enum EquipmentSlot {
  HEAD = 'HEAD',
  BODY = 'BODY',
  SHOES = 'SHOES',
  GLOVES = 'GLOVES',
  LEFT_HAND = 'LEFT_HAND',
  RIGHT_HAND = 'RIGHT_HAND',
  NECKLACE = 'NECKLACE',
  RING = 'RING',
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
