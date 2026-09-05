/**
 * Shop Service
 *
 * Daily lazy-generated shop (gold + gems items merged into a single
 * per-character list — gold/gems are Character fields, see
 * shared/types/character.ts) and the purchase flow. Generation does not use
 * the deterministic RngService: that capability is scoped to randomness
 * inside a single adventure run (node generation, combat, events) — shop
 * content consistency across a day comes from Firestore create-once
 * persistence, not from a reproducible seed (see design.md).
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
    DailyShop, ShopItem, CurrencyType,
} from '../../shared/types/shop';
import {
    PurchaseDestination, SHOP_CONFIG, 
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
     * Get today's shop for a character, generating it (and best-effort
     * deleting every other, stale shop document for this character) if it
     * doesn't exist yet.
     */
    async getOrGenerateShop(characterId: string): Promise<DailyShop> {
        const today = getTodayUtcDate();
        const existing = await this.shopRepo.getShop(characterId, today);
        if (existing) {
            return existing;
        }

        const shop: DailyShop = {
            characterId,
            date: today,
            items: generateShopItems(characterId),
            generatedAt: Date.now(),
        };
        const created = await this.shopRepo.createShop(shop);
        const result = created ?? await this.shopRepo.getShop(characterId, today);
        if (!result) {
            throw new DatabaseError('Failed to generate shop');
        }

        await this.shopRepo.deleteOldShops(characterId, today);
        return result;
    }

    /**
     * Best-effort delete a deleted character's shop documents so they don't
     * linger forever — once the character is gone, the lazy-destroy in
     * getOrGenerateShop above will never run again for it, so today's and
     * yesterday's documents (the only two dates that can plausibly still
     * exist, per the same lazy-destroy tolerance) are cleaned up explicitly
     * here instead. Also best-effort cleans up the legacy `shopsGold`/
     * `shopsGems` collections (pre-merge) so they don't become orphaned —
     * see design.md's Migration Plan.
     */
    async deleteShopsForCharacter(characterId: string): Promise<void> {
        const today = getTodayUtcDate();
        const yesterday = getYesterdayUtcDate(today);

        await Promise.all([
            this.shopRepo.deleteShop(characterId, today),
            this.shopRepo.deleteShop(characterId, yesterday),
            this.deleteLegacyShopDoc('shopsGold', characterId, today),
            this.deleteLegacyShopDoc('shopsGold', characterId, yesterday),
            this.deleteLegacyShopDoc('shopsGems', characterId, today),
            this.deleteLegacyShopDoc('shopsGems', characterId, yesterday),
        ]);
    }

    /**
     * Best-effort delete of a pre-merge `shopsGold`/`shopsGems` document —
     * these collections are no longer written to, but may still hold
     * documents from before this change shipped (see design.md's Migration
     * Plan). A missing document is not an error.
     */
    private async deleteLegacyShopDoc(collectionName: string, characterId: string, date: string): Promise<void> {
        try {
            await this.db.collection(collectionName).doc(`${characterId}_${date}`).delete();
        } catch {
            // best-effort — ignore
        }
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
        slotId: string,
        destination: PurchaseDestination,
        requestedSlot?: EquipmentSlot,
    ): Promise<PurchaseResult> {
        const ownedCharacter = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!ownedCharacter) {
            throw new NotFoundError('character');
        }

        const today = getTodayUtcDate();
        const shopRef = this.db.collection('dailyShops').doc(`${characterId}_${today}`);
        const characterRef = this.db.collection('characters').doc(characterId);
        const inventoryRef = this.db.collection('inventories').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const shopDoc = await tx.get(shopRef);
            if (!shopDoc.exists) {
                throw new NotFoundError('shop');
            }
            const shop = shopDoc.data() as DailyShop;

            const slotIndex = shop.items.findIndex(item => item.slotId === slotId);
            if (slotIndex === -1) {
                throw new NotFoundError('shop item');
            }
            const slot = shop.items[slotIndex] as ShopItem;
            if (slot.sold) {
                throw new ConflictError('Item already sold');
            }

            const {
                currency, price, 
            } = slot;

            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const character = characterDoc.data() as Character;
            const balance = currency === 'GOLD' ? character.gold : character.gems;
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
                ...(currency === 'GOLD' ? { gold: balance - price } : { gems: balance - price }),
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
                goldSpent: currency === 'GOLD' ? price : undefined,
                gemsSpent: currency === 'GEMS' ? price : undefined,
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
 * Generate a fixed number of shop slots, laid out in two currency-scoped
 * pools — gold pool (SHOP_CONFIG.EQUIPMENT_SLOTS equipment + SHOP_CONFIG.POTION_SLOTS
 * potion, capped at SR) followed by gems pool (same counts, floored at SR) —
 * then merged into a single list (see design.md's rarity tiers). `characterId`
 * is set on the embedded ItemInstance immediately since shop slots are already
 * scoped to one character; purchase delivers this exact item, never re-rolling it.
 */
function generateShopItems(characterId: string): ShopItem[] {
    const allTemplates = getAllItemTemplates();
    const equipmentTemplates = allTemplates.filter(t => t.type === ItemType.EQUIPMENT);
    const potionTemplates = allTemplates.filter(t => t.type === ItemType.POTION);

    const rollSlot = (
        templates: typeof allTemplates, index: number, currency: CurrencyType, context: ItemGenerationContext,
    ): ShopItem => {
        const template = templates[Math.floor(Math.random() * templates.length)];
        if (!template) {
            throw new DatabaseError('No item templates available for shop generation');
        }
        const rolled = generateItemInstance(template.templateId, context);
        const item: ItemInstance = {
            ...rolled, characterId,
        };

        const priceField = currency === 'GOLD' ? 'gold' : 'gems';
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
            currency,
            price,
            sold: false,
        };
    };

    const goldContext: ItemGenerationContext = {
        source: ItemSource.SHOP, maxRarity: Rarity.SR,
    };
    const gemsContext: ItemGenerationContext = {
        source: ItemSource.SHOP, minRarity: Rarity.SR,
    };

    let index = 0;
    const goldEquipmentSlots = Array.from(
        { length: SHOP_CONFIG.EQUIPMENT_SLOTS },
        () => rollSlot(equipmentTemplates, index++, 'GOLD', goldContext),
    );
    const goldPotionSlots = Array.from(
        { length: SHOP_CONFIG.POTION_SLOTS },
        () => rollSlot(potionTemplates, index++, 'GOLD', goldContext),
    );
    const gemsEquipmentSlots = Array.from(
        { length: SHOP_CONFIG.EQUIPMENT_SLOTS },
        () => rollSlot(equipmentTemplates, index++, 'GEMS', gemsContext),
    );
    const gemsPotionSlots = Array.from(
        { length: SHOP_CONFIG.POTION_SLOTS },
        () => rollSlot(potionTemplates, index++, 'GEMS', gemsContext),
    );

    return [
        ...goldEquipmentSlots,
        ...goldPotionSlots,
        ...gemsEquipmentSlots,
        ...gemsPotionSlots,
    ];
}
