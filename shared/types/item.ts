/**
 * Item and equipment related types
 */

import type {
    Rarity, EquipmentSlot, Timestamp, 
} from './common';

/**
 * Item type
 */
export enum ItemType {
  EQUIPMENT = 'EQUIPMENT',
}

/**
 * Item source (where it came from)
 */
export enum ItemSource {
  DROP = 'DROP',       // Dropped from combat
  SHOP = 'SHOP',       // Purchased from shop
  EVENT = 'EVENT',     // Gained from event
}

/**
 * Base stats range for item generation
 */
export type StatRange = {
  min: number;
  max: number;
};

/**
 * Item stats (rolled values)
 */
export type ItemStats = {
  ATK?: number;
  DEF?: number;
  HP?: number;
  actionSpeedMod?: number; // Modifier to action speed (negative = faster)
};

/**
 * Item template (static definition)
 */
export type ItemTemplate = {
  templateId: string;
  name: string;
  type: ItemType;
  equipSlot?: EquipmentSlot;
  
  // Rarity weights for generation
  rarityWeights: Record<Rarity, number>;
  
  // Stat ranges by rarity
  statRanges: Partial<Record<Rarity, Partial<Record<keyof ItemStats, StatRange>>>>;
  
  // Price ranges by rarity (for shop)
  priceRanges: Record<Rarity, { gold?: StatRange; gems?: StatRange }>;
};

/**
 * Item instance (actual item in inventory)
 */
export type ItemInstance = {
  itemId: string;              // Unique ID
  templateId: string;          // Reference to template
  type: ItemType;
  equipSlot?: EquipmentSlot;
  
  // Generated properties
  rarity: Rarity;
  stats: ItemStats;            // Rolled stats
  
  // Metadata
  source: ItemSource;
  createdAt: Timestamp;
};

/**
 * Inventory (collection of items)
 */
export type Inventory = {
  accountId: string;
  items: ItemInstance[];       // Max 500 for permanent inventory
  updatedAt: Timestamp;
};

/**
 * Run inventory (temporary during adventure)
 */
export type RunInventory = {
  items: ItemInstance[];       // Max 50 for run inventory
};
