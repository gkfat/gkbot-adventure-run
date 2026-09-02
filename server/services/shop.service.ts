/**
 * Shop Service
 *
 * Daily lazy-generated shops (gold + gems, both per-character — gold/gems
 * are Character fields, see shared/types/character.ts) and the purchase
 * flow. Generation does not use the deterministic RngService: that capability
 * is scoped to randomness inside a single adventure run (node generation,
 * combat, events) — shop content consistency across a day comes from
 * Firestore create-once persistence, not from a reproducible seed (see
 * design.md).
 *
 * Purchase is the first 3-aggregate transaction in this codebase (Shop +
 * Character + Item/Inventory). It reads/writes `items`/`inventories` directly
 * via raw Firestore calls inside its own `runTransaction`, the same pattern
 * `EquipmentService.equipItem` uses for its 2-aggregate transaction — Firestore
 * doesn't support nested transactions, so this can't delegate to
 * `InventoryService`, which opens its own.
 */

import { BaseService } from './base.service';
import { ShopRepository } from '../repositories/shop.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import { generateItemInstance } from './item.service';
import { getAllItemTemplates } from '../constants/templates';
import type {
    DailyGoldShop, DailyGemsShop, ShopItem,
} from '../../shared/types/shop';
import {
    ShopType, PurchaseDestination, SHOP_CONFIG,
} from '../../shared/types/shop';
import type {
    ItemInstance, ItemGenerationContext, Inventory, 
} from '../../shared/types/item';
import {
    ItemType, ItemSource, 
} from '../../shared/types/item';
import {
    Rarity, RESOURCE_LIMITS, HAND_SLOTS, type EquipmentSlot,
} from '../../shared/types/common';
import type { Character } from '../../shared/types/character';
import {
    NotFoundError, ValidationError, ConflictError, BusinessLogicError, DatabaseError,
} from '../../shared/types/errors';

export type PurchaseResult = {
    item: ItemInstance;
    goldSpent?: number;
    gemsSpent?: number;
    unequipped?: ItemInstance;
};

export class ShopService extends BaseService {
    protected serviceName = 'shop';
    private shopRepo: ShopRepository;
    private characterRepo: CharacterRepository;
    private db = getAdminFirestore();

    constructor() {
        super();
        this.shopRepo = new ShopRepository();
        this.characterRepo = new CharacterRepository();
    }

    /**
     * Get today's gold shop for a character, generating it (and best-effort
     * deleting yesterday's document) if it doesn't exist yet.
     */
    async getOrGenerateGoldShop(characterId: string): Promise<DailyGoldShop> {
        const today = getTodayUtcDate();
        const existing = await this.shopRepo.getGoldShop(characterId, today);
        if (existing) {
            return existing;
        }

        const shop: DailyGoldShop = {
            characterId,
            date: today,
            items: generateShopItems(ShopType.GOLD, characterId),
            generatedAt: Date.now(),
        };
        const created = await this.shopRepo.createGoldShop(shop);
        const result = created ?? await this.shopRepo.getGoldShop(characterId, today);
        if (!result) {
            throw new DatabaseError('Failed to generate gold shop');
        }

        await this.shopRepo.deleteGoldShop(characterId, getYesterdayUtcDate(today));
        return result;
    }

    /**
     * Get today's gems shop for a character, generating it (and best-effort
     * deleting yesterday's document) if it doesn't exist yet.
     */
    async getOrGenerateGemsShop(characterId: string): Promise<DailyGemsShop> {
        const today = getTodayUtcDate();
        const existing = await this.shopRepo.getGemsShop(characterId, today);
        if (existing) {
            return existing;
        }

        const shop: DailyGemsShop = {
            characterId,
            date: today,
            items: generateShopItems(ShopType.GEMS, characterId),
            generatedAt: Date.now(),
        };
        const created = await this.shopRepo.createGemsShop(shop);
        const result = created ?? await this.shopRepo.getGemsShop(characterId, today);
        if (!result) {
            throw new DatabaseError('Failed to generate gems shop');
        }

        await this.shopRepo.deleteGemsShop(characterId, getYesterdayUtcDate(today));
        return result;
    }

    /**
     * Best-effort delete a deleted character's shop documents so they don't
     * linger forever — once the character is gone, the lazy-destroy in
     * getOrGenerateGoldShop/getOrGenerateGemsShop above will never run again
     * for it, so today's and yesterday's documents (the only two dates that
     * can plausibly still exist, per the same lazy-destroy tolerance) are
     * cleaned up explicitly here instead.
     */
    async deleteShopsForCharacter(characterId: string): Promise<void> {
        const today = getTodayUtcDate();
        const yesterday = getYesterdayUtcDate(today);

        await Promise.all([
            this.shopRepo.deleteGoldShop(characterId, today),
            this.shopRepo.deleteGoldShop(characterId, yesterday),
            this.shopRepo.deleteGemsShop(characterId, today),
            this.shopRepo.deleteGemsShop(characterId, yesterday),
        ]);
    }

    /**
     * Purchase a shop slot: checks it's unsold and the character can afford
     * it, deducts the price, marks the slot sold, and delivers the item that
     * was already rolled at shop-generation time (never re-rolled) into the
     * character's permanent inventory — and, for `destination = EQUIP`, also
     * into the matching equipment slot. All in one Firestore transaction.
     */
    async purchaseItem(
        accountId: string,
        characterId: string,
        shopType: ShopType,
        slotId: string,
        destination: PurchaseDestination,
        requestedSlot?: EquipmentSlot,
    ): Promise<PurchaseResult> {
        const ownedCharacter = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!ownedCharacter) {
            throw new NotFoundError('character');
        }

        const today = getTodayUtcDate();
        const shopCollection = shopType === ShopType.GOLD ? 'shopsGold' : 'shopsGems';
        const shopRef = this.db.collection(shopCollection).doc(`${characterId}_${today}`);
        const characterRef = this.db.collection('characters').doc(characterId);
        const inventoryRef = this.db.collection('inventories').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const shopDoc = await tx.get(shopRef);
            if (!shopDoc.exists) {
                throw new NotFoundError('shop');
            }
            const shop = shopDoc.data() as DailyGoldShop | DailyGemsShop;

            const slotIndex = shop.items.findIndex(item => item.slotId === slotId);
            if (slotIndex === -1) {
                throw new NotFoundError('shop item');
            }
            const slot = shop.items[slotIndex] as ShopItem;
            if (slot.sold) {
                throw new ConflictError('Item already sold');
            }

            const price = shopType === ShopType.GOLD ? slot.priceGold : slot.priceGems;
            if (price === undefined) {
                throw new BusinessLogicError('Shop item has no price for this shop type');
            }

            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const character = characterDoc.data() as Character;
            const balance = shopType === ShopType.GOLD ? character.gold : character.gems;
            if (balance < price) {
                throw new BusinessLogicError('Insufficient resources');
            }

            const inventoryDoc = await tx.get(inventoryRef);
            const inventory: Inventory = inventoryDoc.exists
                ? (inventoryDoc.data() as Inventory)
                : {
                    characterId, items: [], updatedAt: Date.now(),
                };
            if (inventory.items.length >= RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX) {
                throw new BusinessLogicError('Inventory is full');
            }

            const item = slot.item;
            const itemRef = this.db.collection('items').doc(item.itemId);
            tx.set(itemRef, item);
            tx.set(inventoryRef, {
                characterId,
                items: [...inventory.items, item.itemId],
                updatedAt: Date.now(),
            });

            const characterUpdate: Record<string, unknown> = {
                updatedAt: Date.now(),
                ...(shopType === ShopType.GOLD ? { gold: balance - price } : { gems: balance - price }),
            };

            let unequipped: ItemInstance | undefined;
            if (destination === PurchaseDestination.EQUIP) {
                if (item.type !== ItemType.EQUIPMENT || !item.equipSlot) {
                    throw new BusinessLogicError('Item is not equipment');
                }
                const isHandItem = HAND_SLOTS.includes(item.equipSlot);
                if (requestedSlot && (!isHandItem || !HAND_SLOTS.includes(requestedSlot))) {
                    throw new ValidationError('requestedSlot is not a valid hand slot for this item');
                }
                const slotKey = requestedSlot ?? item.equipSlot;
                const previousItemId = character.equipment[slotKey];
                if (previousItemId) {
                    const previousDoc = await tx.get(this.db.collection('items').doc(previousItemId));
                    unequipped = previousDoc.exists ? (previousDoc.data() as ItemInstance) : undefined;
                }
                characterUpdate.equipment = {
                    ...character.equipment, [slotKey]: item.itemId,
                };
            }

            tx.update(characterRef, characterUpdate);

            const updatedItems = [...shop.items];
            updatedItems[slotIndex] = {
                ...slot, sold: true, purchasedAt: Date.now(),
            };
            tx.set(shopRef, {
                ...shop, items: updatedItems,
            });

            return {
                item,
                goldSpent: shopType === ShopType.GOLD ? price : undefined,
                gemsSpent: shopType === ShopType.GEMS ? price : undefined,
                unequipped,
            };
        });
    }
}

function getTodayUtcDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function getYesterdayUtcDate(today: string): string {
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

/**
 * Roll a random price within a template's price range for the rolled rarity.
 */
function rollPrice(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
}

/**
 * Generate a fixed number of shop slots, laid out in two type-scoped tiers —
 * SHOP_CONFIG.EQUIPMENT_SLOTS equipment items followed by
 * SHOP_CONFIG.POTION_SLOTS potion items (each tier rolls only from its own
 * template pool). Gold shop caps at SR (N/R/SR); gems shop floors at SR
 * (SR/SSR/L) — see design.md's rarity tiers. `characterId` is set on the
 * embedded ItemInstance immediately since shop slots are already scoped to
 * one character; purchase delivers this exact item, never re-rolling it.
 */
function generateShopItems(shopType: ShopType, characterId: string): ShopItem[] {
    const allTemplates = getAllItemTemplates();
    const equipmentTemplates = allTemplates.filter(t => t.type === ItemType.EQUIPMENT);
    const potionTemplates = allTemplates.filter(t => t.type === ItemType.POTION);
    const context: ItemGenerationContext = shopType === ShopType.GOLD
        ? {
            source: ItemSource.SHOP, maxRarity: Rarity.SR,
        }
        : {
            source: ItemSource.SHOP, minRarity: Rarity.SR,
        };

    const rollSlot = (templates: typeof allTemplates, index: number): ShopItem => {
        const template = templates[Math.floor(Math.random() * templates.length)];
        if (!template) {
            throw new DatabaseError('No item templates available for shop generation');
        }
        const rolled = generateItemInstance(template.templateId, context);
        const item: ItemInstance = {
            ...rolled, characterId,
        };

        const priceField = shopType === ShopType.GOLD ? 'gold' : 'gems';
        const priceRange = template.priceRangeByRarity[rolled.rarity]?.[priceField];
        if (!priceRange) {
            throw new DatabaseError(
                `Template '${template.templateId}' has no ${priceField} price range for rarity ${rolled.rarity}`,
            );
        }
        const price = rollPrice(priceRange.min, priceRange.max);

        return {
            slotId: `slot-${index}`,
            item,
            sold: false,
            ...(shopType === ShopType.GOLD ? { priceGold: price } : { priceGems: price }),
        };
    };

    const equipmentSlots = Array.from(
        { length: SHOP_CONFIG.EQUIPMENT_SLOTS },
        (_, i) => rollSlot(equipmentTemplates, i),
    );
    const potionSlots = Array.from(
        { length: SHOP_CONFIG.POTION_SLOTS },
        (_, i) => rollSlot(potionTemplates, SHOP_CONFIG.EQUIPMENT_SLOTS + i),
    );

    return [...equipmentSlots, ...potionSlots];
}
