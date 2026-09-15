import type {
    Timestamp, Attributes, EquipmentSlot, Stats, WeaponType,
} from './common';

/**
 * Weapon proficiency (weapon-proficiency-system D2/D2b): Lv.1-10 exp/level
 * pair, shared shape for both the 5 per-WeaponType buckets and the single
 * dualWieldProficiency bucket.
 */
export type ProficiencyProgress = {
  exp: number;
  level: number; // 1-10
};

/**
 * A single stat contribution of a talent node, applied `perRank` times the
 * node's current rank (see TalentNode.maxRank). `actionIntervalSec` uses a
 * negative value to mean "faster", matching applyEquipmentStats's convention.
 */
export type TalentEffect = {
  stat: 'ATK' | 'DEF' | 'HP_MAX' | 'actionIntervalSec' | 'critChance' | 'dodgeChance' | 'carryCapacity';
  perRank: number;
};

/**
 * One node in a TalentTree. `nodeId` is globally unique (format
 * `{archetypeId}_t{tier}{branchLetter?}`). Nodes sharing a `tier` +
 * `branchGroup` are mutually exclusive — investing in one permanently locks
 * the other at rank 0 (character-talents: 岔路互斥).
 */
export type TalentNode = {
  nodeId: string;
  archetypeId: string;
  tier: number;
  branchGroup?: string;
  name: string;
  description: string;
  maxRank: 3;
  effect: readonly TalentEffect[];
};

/**
 * Static, per-archetype talent tree definition (server/constants/templates/talentTrees.ts).
 */
export type TalentTree = {
  archetypeId: string;
  nodes: readonly TalentNode[];
};

/**
 * Character document stored in Firestore
 */
export type Character = {
  characterId: string;        // Firestore auto-generated ID
  accountId: string;          // Reference to owning account (1 account : up to 3 characters)

  // Class (archetype chosen at creation; 'legacy' for pre-roster characters)
  archetypeId: string;
  className: string;

  // Progression
  level: number;              // 1-30
  exp: number;                // Current experience points
  
  // Currency
  gold: number;               // 0 <= gold < 100000
  gems: number;               // 0 <= gems < 100000
  
  // Attributes (permanent growth)
  attributes: Attributes;
  unspentAttributePoints: number; // Gained 3 per level up

  // Talents (permanent growth, character-talents): per-archetype talent tree,
  // gained 1 talentPoint per level up, spent 1 at a time via
  // POST /api/character/:characterId/talents.
  talentPoints: number;
  talents: Record<string, number>; // nodeId -> current rank (0/missing = not invested)

  // Weapon proficiency (weapon-proficiency-system D2/D2b): per-WeaponType
  // exp/level, sparse (a key only exists once a hit has landed with it).
  weaponProficiency: Partial<Record<WeaponType, ProficiencyProgress>>;
  // Independent "dual-wield" dimension — not a 6th WeaponType (see D2b).
  dualWieldProficiency: ProficiencyProgress;

  // Equipment (slot -> itemId mapping)
  equipment: Partial<Record<EquipmentSlot, string>>;

  // Facility theme for the character's next adventure run (single-stage-run-settlement);
  // only advances when a run COMPLETEs, so DEAD/DISCONNECT retries the same theme.
  nextChapterIndex: number;

  // Chapter/Level hierarchy (chapter-level-structure): a Chapter (=
  // nextChapterIndex's facility) is cleared over `chapterTotalLevels` Levels,
  // each Level being one run. `currentLevelIndex` (0-based) only advances on
  // a COMPLETED run; DEAD/DISCONNECT retries the same level.
  // `chapterTotalLevels` is rolled once when entering the chapter (see
  // rollChapterTotalLevels) and stays fixed until the chapter is cleared.
  currentLevelIndex: number;
  chapterTotalLevels: number;

  // Leaderboard display
  nickname: string;           // Display name; auto-generated on creation, player can override

  // Character renaming (character-rename): whether the free first rename has
  // been used; every rename after that costs RENAME_COST_GEMS gems.
  hasRenamed: boolean;

  // Enemy bestiary (enemy-bestiary): archetype slugs this character has
  // encountered (seen in a combat's first wave, regardless of outcome).
  encounteredArchetypeSlugs: string[];

  // Enemy bestiary — cumulative kill count per archetype slug (slug -> count),
  // incremented whenever a combat actually defeats a unit of that archetype.
  defeatedArchetypeCounts: Record<string, number>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * Character with computed stats (returned by API)
 */
export type CharacterWithStats = Character & {
  stats: Stats;
  // The portion of `stats` contributed by currently equipped items — same
  // keys as Stats, present only for keys equipment actually affects.
  equipmentBonus: Partial<Stats>;
  // The portion of `stats` contributed by invested talent nodes — same
  // shape as equipmentBonus, present only for keys with a non-zero total.
  talentBonus: Partial<Stats>;
  // The portion of `stats` (ATK/critChance only) contributed by weapon
  // proficiency levels — same shape as equipmentBonus, present only for
  // keys with a non-zero total.
  proficiencyBonus: Partial<Stats>;
  // This character's archetype's full talent tree definition, for the
  // frontend talent tree UI (see character-talents design decision 1).
  talentTree: TalentTree;
  spriteUrl: string;
};

/**
 * Lightweight roster entry (GET /api/character/roster)
 */
export type CharacterSummary = {
  characterId: string;
  nickname: string;
  level: number;
  gold: number;
  gems: number;
  archetypeId: string;
  className: string;
  spriteUrl: string;
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
 * Gem cost of a character rename after the free first rename
 * (character-rename).
 */
export const RENAME_COST_GEMS = 5;

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

