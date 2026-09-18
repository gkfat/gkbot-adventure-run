/**
 * Shop related types
 */

import type { Timestamp } from './common';
import type { ItemInstance } from './item';

/**
 * The currency a shop item/gacha pull is priced in
 */
export type CurrencyType = 'GOLD' | 'GEMS';

/**
 * Which kind of good a shop slot sells. Undefined (pre-`character-skills`
 * documents) means `'ITEM'` — see shared/schemas/firestore/shop.schema.ts.
 */
export type ShopSlotType = 'ITEM' | 'SKILL_FRAGMENT';

/**
 * Shop item (item for sale) — each item is priced in exactly one currency.
 * A `type: 'SKILL_FRAGMENT'` slot sells `fragmentAmount` fragments of
 * `skillId` instead of an `ItemInstance` (character-skills「商店技能碎片商品」).
 */
export type ShopItem = {
  slotId: string;           // Unique slot ID
  type?: ShopSlotType;      // undefined = 'ITEM' (pre-existing documents)
  item?: ItemInstance;      // present when type is 'ITEM' (or undefined)
  skillId?: string;         // present when type is 'SKILL_FRAGMENT'
  fragmentAmount?: number;  // present when type is 'SKILL_FRAGMENT'
  currency: CurrencyType;   // Which resource this item is priced in
  price: number;            // Price in that currency
  sold: boolean;            // Whether already purchased
  purchasedAt?: Timestamp;  // Purchase timestamp
};

/**
 * Daily shop (per character) — merges what used to be separate gold/gems shops
 * into a single list, each item tagged with its own `currency`.
 */
export type DailyShop = {
  characterId: string;
  date: string;             // YYYY-MM-DD (UTC)
  items: ShopItem[];
  generatedAt: Timestamp;
};

/**
 * Shop configuration
 */
export const SHOP_CONFIG = {
    EQUIPMENT_SLOTS: 6,       // 6 equipment items per shop
    POTION_SLOTS: 3,          // 3 potion items per shop
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
  slotId: string;
  destination: PurchaseDestination;
  replaceSlot?: string;      // If equipping and slot occupied, which item to unequip
};

/**
 * The currency spent on a single gacha pull — same two options as a shop item.
 */
export type GachaCurrency = CurrencyType;

/**
 * Result of a single gacha pull: the delivered item plus what it cost and
 * the character's remaining balance in that currency.
 */
export type GachaPullResult = {
  item: ItemInstance;
  currency: GachaCurrency;
  amountSpent: number;
  remainingBalance: number;
};
