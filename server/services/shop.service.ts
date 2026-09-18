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
import { DailySupplyRepository } from '../repositories/dailySupply.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { QuestAchievementProgressTracker } from './progress-tracker.service';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import { generateItemInstance } from './item.service';
import {
    getAllItemTemplates, getCharacterSkillsByArchetypeId, getCharacterSkillById,
} from '../constants/templates';
import type {
    DailyShop, ShopItem, CurrencyType,
} from '../../shared/types/shop';
import {
    PurchaseDestination, SHOP_CONFIG,
} from '../../shared/types/shop';
import type { DailySupply } from '../../shared/schemas/firestore/shop.schema';
import type {
    ItemInstance, ItemGenerationContext, Inventory,
} from '../../shared/types/item';
import {
    ItemType, ItemSource,
} from '../../shared/types/item';
import {
    Rarity, RESOURCE_LIMITS, HAND_SLOTS, clampCurrency, type EquipmentSlot,
} from '../../shared/types/common';
import type { Character } from '../../shared/types/character';
import {
    NotFoundError, ValidationError, ConflictError, BusinessLogicError, DatabaseError,
} from '../../shared/types/errors';

export type PurchaseResult = {
    // Present for `type: 'ITEM'` slots; absent for `SKILL_FRAGMENT` slots
    // (character-skills「商店技能碎片商品」).
    item?: ItemInstance;
    skillFragment?: {
        skillId: string; amount: number; name: string; icon: string;
    };
    goldSpent?: number;
    gemsSpent?: number;
    unequipped?: ItemInstance;
};

/**
 * Skill-fragment shop slots (character-skills「商店技能碎片商品」): one GOLD-priced
 * and one GEMS-priced slot per daily shop, each granting a fixed fragment
 * amount of a randomly-picked skill from the character's own archetype.
 * ASSUMPTION: values are initial balance numbers, freely tunable.
 */
const SKILL_FRAGMENT_SHOP_SLOTS: { currency: CurrencyType; price: number; fragmentAmount: number }[] = [
    {
        currency: 'GOLD', price: 60, fragmentAmount: 4,
    }, {
        currency: 'GEMS', price: 3, fragmentAmount: 4,
    },
];

/** Gold granted by a single daily supply claim. */
const DAILY_SUPPLY_REWARD_GOLD = 100;

export type ClaimDailySupplyResult = {
    rewardGold: number;
    item: ItemInstance;
};

export class ShopService extends BaseService {
    protected serviceName = 'shop';
    private shopRepo: ShopRepository;
    private dailySupplyRepo: DailySupplyRepository;
    private characterRepo: CharacterRepository;
    private progressTracker: QuestAchievementProgressTracker;
    private db = getAdminFirestore();

    constructor() {
        super();
        this.shopRepo = new ShopRepository();
        this.dailySupplyRepo = new DailySupplyRepository();
        this.characterRepo = new CharacterRepository();
        this.progressTracker = new QuestAchievementProgressTracker();
    }

    /**
     * Get today's shop for a character, generating it (and best-effort
     * deleting every other, stale shop document for this character) if it
     * doesn't exist yet.
     */
    async getOrGenerateShop(characterId: string, archetypeId: string): Promise<DailyShop> {
        const today = getTodayUtcDate();
        const existing = await this.shopRepo.getShop(characterId, today);
        if (existing) {
            return existing;
        }

        const shop: DailyShop = {
            characterId,
            date: today,
            items: generateShopItems(characterId, archetypeId),
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

        const result = await this.db.runTransaction(async (tx) => {
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

            // Skill fragment slots (character-skills「商店技能碎片商品」) deliver
            // straight into `skillFragments` — no ItemInstance, no permanent
            // inventory/capacity check, `destination` is ignored.
            if (slot.type === 'SKILL_FRAGMENT') {
                const skillId = slot.skillId as string;
                const fragmentAmount = slot.fragmentAmount as number;
                const skillFragments = {
                    ...character.skillFragments, [skillId]: (character.skillFragments?.[skillId] ?? 0) + fragmentAmount,
                };
                tx.update(characterRef, {
                    updatedAt: Date.now(),
                    skillFragments,
                    ...(currency === 'GOLD' ? { gold: balance - price } : { gems: balance - price }),
                });

                const updatedShopItems = [...shop.items];
                updatedShopItems[slotIndex] = {
                    ...slot, sold: true, purchasedAt: Date.now(),
                };
                tx.set(shopRef, {
                    ...shop, items: updatedShopItems,
                });

                const skillDefinition = getCharacterSkillById(skillId);
                return {
                    skillFragment: {
                        skillId,
                        amount: fragmentAmount,
                        name: skillDefinition?.name ?? skillId,
                        icon: skillDefinition?.icon ?? 'mysteryCapsule',
                    },
                    goldSpent: currency === 'GOLD' ? price : undefined,
                    gemsSpent: currency === 'GEMS' ? price : undefined,
                } satisfies PurchaseResult;
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

            // Reaching here means type is 'ITEM' (or the undefined-legacy
            // equivalent) — `item` is always populated for those slots.
            const item = slot.item as ItemInstance;
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

        await this.progressTracker.incrementProgress({
            accountId, characterId, type: 'PURCHASE_SHOP', amount: 1,
        });

        return result;
    }

    /**
     * Get today's daily supply for a character — a free once-a-day claim of
     * 100 gold plus one pre-rolled N-rarity equipment item — lazily
     * generating it if it doesn't exist yet. Same lazy-generation shape as
     * getOrGenerateShop; the item is rolled once at generation time and
     * delivered unchanged by claimDailySupply, never re-rolled.
     */
    async getOrGenerateDailySupply(characterId: string): Promise<DailySupply> {
        const today = getTodayUtcDate();
        const existing = await this.dailySupplyRepo.getDailySupply(characterId, today);
        if (existing) {
            return existing;
        }

        const timestamp = Date.now();
        const supply: DailySupply = {
            characterId,
            date: today,
            rewardGold: DAILY_SUPPLY_REWARD_GOLD,
            item: rollDailySupplyItem(characterId),
            claimed: false,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        const created = await this.dailySupplyRepo.createDailySupply(supply);
        const result = created ?? await this.dailySupplyRepo.getDailySupply(characterId, today);
        if (!result) {
            throw new DatabaseError('Failed to generate daily supply');
        }
        return result;
    }

    /**
     * Claim today's daily supply: verifies it's unclaimed, credits the gold
     * and delivers the item into the character's permanent inventory, and
     * marks it claimed — all in one Firestore transaction (Shop + Character +
     * Item/Inventory), same shape as purchaseItem.
     */
    async claimDailySupply(accountId: string, characterId: string): Promise<ClaimDailySupplyResult> {
        const ownedCharacter = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!ownedCharacter) {
            throw new NotFoundError('character');
        }

        const today = getTodayUtcDate();
        const supplyRef = this.db.collection('dailySupplies').doc(`${characterId}_${today}`);
        const characterRef = this.db.collection('characters').doc(characterId);
        const inventoryRef = this.db.collection('inventories').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const supplyDoc = await tx.get(supplyRef);
            if (!supplyDoc.exists) {
                throw new NotFoundError('daily supply');
            }
            const supply = supplyDoc.data() as DailySupply;
            if (supply.claimed) {
                throw new ConflictError('Daily supply already claimed');
            }

            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const character = characterDoc.data() as Character;

            const inventoryDoc = await tx.get(inventoryRef);
            const inventory: Inventory = inventoryDoc.exists
                ? (inventoryDoc.data() as Inventory)
                : {
                    characterId, items: [], updatedAt: Date.now(),
                };
            if (inventory.items.length >= RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX) {
                throw new BusinessLogicError('Inventory is full');
            }

            const item = supply.item;
            const itemRef = this.db.collection('items').doc(item.itemId);
            tx.set(itemRef, item);
            tx.set(inventoryRef, {
                characterId,
                items: [...inventory.items, item.itemId],
                updatedAt: Date.now(),
            });

            const gold = clampCurrency(character.gold + supply.rewardGold);
            tx.update(characterRef, {
                gold, updatedAt: Date.now(),
            });
            tx.update(supplyRef, {
                claimed: true, claimedAt: Date.now(), updatedAt: Date.now(),
            });

            return {
                rewardGold: supply.rewardGold,
                item,
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
function generateShopItems(characterId: string, archetypeId: string): ShopItem[] {
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

    const skillCatalog = getCharacterSkillsByArchetypeId(archetypeId);
    const skillFragmentSlots: ShopItem[] = skillCatalog.length > 0
        ? SKILL_FRAGMENT_SHOP_SLOTS.map((config) => {
            const skill = skillCatalog[Math.floor(Math.random() * skillCatalog.length)]!;
            const slot: ShopItem = {
                slotId: `slot-${index++}`,
                type: 'SKILL_FRAGMENT',
                skillId: skill.skillId,
                fragmentAmount: config.fragmentAmount,
                currency: config.currency,
                price: config.price,
                sold: false,
            };
            return slot;
        })
        : [];

    return [
        ...goldEquipmentSlots,
        ...goldPotionSlots,
        ...gemsEquipmentSlots,
        ...gemsPotionSlots,
        ...skillFragmentSlots,
    ];
}

/**
 * Roll the single N-rarity equipment item granted by a daily supply claim.
 */
function rollDailySupplyItem(characterId: string): ItemInstance {
    const equipmentTemplates = getAllItemTemplates().filter(t => t.type === ItemType.EQUIPMENT);
    const template = equipmentTemplates[Math.floor(Math.random() * equipmentTemplates.length)];
    if (!template) {
        throw new DatabaseError('No equipment templates available for daily supply generation');
    }
    const rolled = generateItemInstance(template.templateId, {
        source: ItemSource.SHOP, minRarity: Rarity.N, maxRarity: Rarity.N,
    });
    return {
        ...rolled, characterId,
    };
}
