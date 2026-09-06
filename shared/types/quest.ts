/**
 * Quest and achievement related types
 */

import type { Timestamp } from './common';

/**
 * Quest type
 */
export enum QuestType {
  COMPLETE_RUN = 'COMPLETE_RUN',         // Complete X runs
  KILL_ENEMIES = 'KILL_ENEMIES',         // Kill X enemies
  PURCHASE_SHOP = 'PURCHASE_SHOP',       // Purchase from shop X times
  REACH_STEP = 'REACH_STEP',             // Reach step X in a run
  EARN_GOLD = 'EARN_GOLD',               // Earn X gold in runs
  LOGIN = 'LOGIN',                       // Log into the game X times
}

/**
 * Quest template (static definition)
 */
export type QuestTemplate = {
  templateId: string;
  type: QuestType;
  name: string;
  description: string;
  
  // Requirement
  targetCount: number;
  
  // Rewards
  rewardGold: number;    // 10-50
  rewardGems: number;    // 0-1
};

/**
 * Daily quest instance (scoped to a character, not the account —
 * multi-character-roster allows one account to own up to 3 characters,
 * each with independent quest progress)
 */
export type DailyQuest = {
  questId: string;
  templateId: string;
  characterId: string;
  date: string;          // YYYY-MM-DD (UTC)

  // Progress
  currentCount: number;
  targetCount: number;
  completed: boolean;

  // Rewards
  rewardGold: number;
  rewardGems: number;
  claimed: boolean;
  claimedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * Persistent quest instance (scoped to a character). Same shape as
 * DailyQuest minus `date` — never resets, claimable once per character.
 */
export type PersistentQuest = {
  questId: string;
  templateId: string;
  characterId: string;

  // Progress
  currentCount: number;
  targetCount: number;
  completed: boolean;

  // Rewards
  rewardGold: number;
  rewardGems: number;
  claimed: boolean;
  claimedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * Achievement type
 */
export enum AchievementType {
  TOTAL_KILLS = 'TOTAL_KILLS',           // Total enemies killed (all time)
  TOTAL_RUNS = 'TOTAL_RUNS',             // Total runs completed
  MAX_SCORE = 'MAX_SCORE',               // Reach score X in single run
  REACH_STEP = 'REACH_STEP',             // Reach step X in single run
  TOTAL_GOLD = 'TOTAL_GOLD',             // Earn total gold X
  EQUIP_LEGENDARY = 'EQUIP_LEGENDARY',   // Equip legendary item
  KILL_GKBOT = 'KILL_GKBOT',             // Total GKBOT-faction enemies destroyed (all time)
  KILL_HUMAN = 'KILL_HUMAN',             // Total HUMAN-faction enemies killed (all time)
  DISCOVER_FACILITIES = 'DISCOVER_FACILITIES', // Distinct facility themes encountered
  ATTACK_SPEED = 'ATTACK_SPEED',         // Character's computed actionIntervalSec crosses a threshold
  CHARACTER_LEVEL = 'CHARACTER_LEVEL',   // Character reaches level X
}

/**
 * Achievement progress tracking mode:
 * - CUMULATIVE (default): `incrementProgress` amounts add up over time
 *   (e.g. TOTAL_KILLS) — `targetCount` is the cumulative total needed.
 * - PEAK: each `incrementProgress` call reports a single-attempt peak value
 *   (e.g. MAX_SCORE/REACH_STEP — "reach X in a single run"), never summed;
 *   the achievement completes the moment one call's `amount` meets
 *   `targetCount` (direction set by `compare`, see AchievementTemplate).
 *   Displayed to the client as a plain 0/1 (see AchievementService.getAll),
 *   since the raw score/step count isn't a meaningful "progress toward a
 *   total" the way a cumulative counter is.
 */
export type AchievementProgressMode = 'CUMULATIVE' | 'PEAK';

/**
 * PEAK-mode completion direction: GTE (default) completes when the reported
 * amount reaches AT LEAST targetCount (e.g. MAX_SCORE, CHARACTER_LEVEL); LTE
 * completes when it drops to AT MOST targetCount (e.g. ATTACK_SPEED — lower
 * actionIntervalSec is faster). Ignored in CUMULATIVE mode.
 */
export type AchievementCompare = 'GTE' | 'LTE';

/**
 * Achievement template (static definition)
 */
export type AchievementTemplate = {
  templateId: string;
  type: AchievementType;
  name: string;
  description: string;

  // Requirement
  targetCount: number;
  mode?: AchievementProgressMode; // defaults to CUMULATIVE when omitted
  compare?: AchievementCompare;   // PEAK mode only; defaults to GTE when omitted

  // Reward
  rewardGems: number;    // 3-10, scales with difficulty
};

/**
 * Achievement progress (scoped to a character — lifetime-once per character,
 * not per account; see DailyQuest's characterId note)
 */
export type AchievementProgress = {
  achievementId: string;
  templateId: string;
  characterId: string;

  // Progress
  currentCount: number;
  targetCount: number;
  completed: boolean;
  
  // Reward
  rewardGems: number;
  claimed: boolean;
  claimedAt?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * Quest configuration
 */
export const QUEST_CONFIG = {
    DAILY_QUEST_COUNT: 3,       // 3 quests per day
    RESET_HOUR_UTC: 0,          // Reset at UTC 00:00
} as const;
