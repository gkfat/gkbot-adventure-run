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
 * Daily quest instance
 */
export type DailyQuest = {
  questId: string;
  templateId: string;
  accountId: string;
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
 * Achievement type
 */
export enum AchievementType {
  TOTAL_KILLS = 'TOTAL_KILLS',           // Total enemies killed (all time)
  TOTAL_RUNS = 'TOTAL_RUNS',             // Total runs completed
  MAX_SCORE = 'MAX_SCORE',               // Reach score X in single run
  REACH_STEP = 'REACH_STEP',             // Reach step X in single run
  TOTAL_GOLD = 'TOTAL_GOLD',             // Earn total gold X
  EQUIP_LEGENDARY = 'EQUIP_LEGENDARY',   // Equip legendary item
}

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
  
  // Reward
  rewardGems: number;    // 3-5
};

/**
 * Achievement progress
 */
export type AchievementProgress = {
  achievementId: string;
  templateId: string;
  accountId: string;
  
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
