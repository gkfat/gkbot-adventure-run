/**
 * Shop related types
 */

import type { Timestamp } from './common';
import type { ItemInstance } from './item';

/**
 * Shop type
 */
export enum ShopType {
  GOLD = 'GOLD',     // Gold shop (per-character)
  GEMS = 'GEMS',     // Gems shop (per-character)
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
  purchasedAt?: Timestamp;  // Purchase timestamp
};

/**
 * Daily shop (gold shop - per character)
 */
export type DailyGoldShop = {
  characterId: string;
  date: string;             // YYYY-MM-DD (UTC)
  items: ShopItem[];
  generatedAt: Timestamp;
};

/**
 * Daily shop (gems shop - per character)
 */
export type DailyGemsShop = {
  characterId: string;
  date: string;             // YYYY-MM-DD (UTC)
  items: ShopItem[];
  generatedAt: Timestamp;
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
