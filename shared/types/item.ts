/**
 * Item and equipment related types
 */

import type {
    Rarity, EquipmentSlot, Timestamp, WeaponWeightClass,
} from './common';

/**
 * Item type
 */
export enum ItemType {
  EQUIPMENT = 'EQUIPMENT',
  POTION = 'POTION',
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
  actionSpeedMod?: number;  // Modifier to action speed (negative = faster)
  dodgeChanceMod?: number;  // Modifier to dodge chance (negative = HEAVY penalty)
  healPercent?: number;     // POTION only: % of max HP restored
};

/**
 * Context passed to item generation to decide which rarities are eligible
 */
export type ItemGenerationContext = {
  source: ItemSource;
  maxRarity?: Rarity; // Caps the roll to this rarity or lower (e.g. shop tier limits)
};

/**
 * Item template (static definition)
 */
export type ItemTemplate = {
  templateId: string;

  // EQUIPMENT: per-rarity name/description (docs/game-design/content/items.md §4).
  // POTION: a single string shared across all rarities.
  name: string | Record<Rarity, string>;
  description: string | Record<Rarity, string>;

  type: ItemType;
  equipSlot?: EquipmentSlot; // Required for type: EQUIPMENT

  // Weight class (speed/power/dodge tradeoff) — required for type: EQUIPMENT,
  // fixed per template regardless of rolled rarity.
  weaponWeightClass?: WeaponWeightClass;

  // Rarity weights for generation
  rarityWeights: Record<Rarity, number>;

  // Stat ranges by rarity - EQUIPMENT only (ATK/DEF/HP/actionSpeedMod)
  baseStatsRange?: Partial<Record<Rarity, Partial<Record<keyof ItemStats, StatRange>>>>;

  // Heal percent ranges by rarity - POTION only
  healPercentRange?: Partial<Record<Rarity, StatRange>>;

  // Price ranges by rarity (for shop)
  priceRangeByRarity: Record<Rarity, { gold?: StatRange; gems?: StatRange }>;
};

/**
 * Item instance — a single globally-unique item, persisted as its own document
 * in the top-level `items` Firestore collection (doc id = itemId). Containers
 * (permanent inventory, run inventory, shop slots, character equipment) only
 * ever hold `itemId` references; this is the one place the full data lives.
 */
export type ItemInstance = {
  itemId: string;              // Unique ID, also the Firestore doc id
  templateId: string;          // Reference to template
  type: ItemType;
  equipSlot?: EquipmentSlot;
  weaponWeightClass?: WeaponWeightClass; // Carried from template — type: EQUIPMENT only

  // Name/description resolved from the template at roll time and fixed
  // thereafter — a later template text edit doesn't change items already
  // in a player's inventory.
  name: string;
  description: string;

  // Generated properties
  rarity: Rarity;
  stats: ItemStats;            // Rolled stats

  // Metadata
  source: ItemSource;
  characterId: string;         // Owning character
  createdAt: Timestamp;
};

/**
 * The result of rolling a new item (item.service.ts), before it has an owner.
 * Generation is a pure, Firestore-free operation; a caller (e.g. InventoryService)
 * assigns `characterId` and persists it into the `items` collection.
 */
export type RolledItem = Omit<ItemInstance, 'characterId'>;

/**
 * Inventory (permanent, per-character). Holds only itemId references — full
 * item data lives in the `items` collection.
 */
export type Inventory = {
  characterId: string;
  items: string[];             // itemId references; max 500 for permanent inventory
  updatedAt: Timestamp;
};

/**
 * Run inventory (temporary during adventure)
 */
export type RunInventory = {
  items: ItemInstance[];       // Max 50 for run inventory
};
