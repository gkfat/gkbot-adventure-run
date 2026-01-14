/**
 * Shop related types
 */

import type { Timestamp } from './common';
import type { ItemInstance } from './item';

/**
 * Shop type
 */
export enum ShopType {
  GOLD = 'GOLD',     // Gold shop (per-account)
  GEMS = 'GEMS',     // Gems shop (global)
}

/**
 * Shop item (item for sale)
 */
export type ShopItem = {
  slotId: string;           // Unique slot ID
  item: ItemInstance;       // The item being sold
  priceGold?: number;       // Gold price (if gold shop)
  priceGems?: number;       // Gems price (if gems shop)
  sold: boolean;            // Whether already purchased
  purchasedBy?: string;     // AccountId of purchaser (for gold shop)
  purchasedAt?: Timestamp;  // Purchase timestamp
};

/**
 * Daily shop (gold shop - per account)
 */
export type DailyGoldShop = {
  accountId: string;
  date: string;             // YYYY-MM-DD (UTC)
  items: ShopItem[];
  generatedAt: Timestamp;
  seed: string;             // RNG seed for generation
};

/**
 * Daily shop (gems shop - global)
 */
export type DailyGemsShop = {
  date: string;             // YYYY-MM-DD (UTC)
  items: ShopItem[];
  generatedAt: Timestamp;
  seed: string;             // RNG seed for generation
};

/**
 * Shop configuration
 */
export const SHOP_CONFIG = {
    GOLD_SHOP_SLOTS: 6,       // 6 items in gold shop
    GEMS_SHOP_SLOTS: 6,       // 6 items in gems shop
    RESET_HOUR_UTC: 0,        // Reset at UTC 00:00
} as const;

/**
 * Purchase destination
 */
export enum PurchaseDestination {
  INVENTORY = 'INVENTORY',   // Add to permanent inventory
  EQUIP = 'EQUIP',           // Equip directly (replace if needed)
}

/**
 * Purchase input
 */
export type PurchaseItemInput = {
  shopType: ShopType;
  slotId: string;
  destination: PurchaseDestination;
  replaceSlot?: string;      // If equipping and slot occupied, which item to unequip
};
