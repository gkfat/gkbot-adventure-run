import type {
    Timestamp, Attributes, EquipmentSlot, 
} from './common';

/**
 * Character document stored in Firestore
 */
export type Character = {
  characterId: string;        // Same as accountId (1:1 relationship)
  accountId: string;          // Reference to account
  
  // Progression
  level: number;              // 1-30
  exp: number;                // Current experience points
  
  // Currency
  gold: number;               // 0 <= gold < 100000
  gems: number;               // 0 <= gems < 100000
  
  // Attributes (permanent growth)
  attributes: Attributes;
  unspentAttributePoints: number; // Gained 3 per level up
  
  // Equipment (slot -> itemId mapping)
  equipment: Partial<Record<EquipmentSlot, string>>;

  // Leaderboard display
  nickname: string;           // Display name; auto-generated on creation, player can override
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * Initial character creation
 */
export type CreateCharacterInput = {
  characterId: string;
  accountId: string;
};

/**
 * Character with computed stats (returned by API)
 */
export type CharacterWithStats = Character & {
  stats: import('./common').Stats;
};

/**
 * Attribute allocation input
 */
export type AllocateAttributesInput = {
  STR?: number;
  AGI?: number;
  CON?: number;
  LUCK?: number;
};

/**
 * Experience table: level -> expToNext
 * Level 30 has no next level (max level)
 */
export const EXP_TABLE: Record<number, number> = {
    1: 359,
    2: 662,
    3: 990,
    4: 1338,
    5: 1702,
    6: 2080,
    7: 2470,
    8: 2869,
    9: 3279,
    10: 3697,
    11: 4124,
    12: 4558,
    13: 4998,
    14: 5446,
    15: 5900,
    16: 6360,
    17: 6824,
    18: 7296,
    19: 7771,
    20: 8251,
    21: 8737,
    22: 9227,
    23: 9721,
    24: 10219,
    25: 10722,
    26: 11229,
    27: 11739,
    28: 12253,
    29: 12771,
};

