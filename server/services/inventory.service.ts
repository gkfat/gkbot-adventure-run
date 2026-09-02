import { BaseService } from './base.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ItemRepository } from '../repositories/item.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import {
    generateItemInstance, getSellPriceGold, 
} from './item.service';
import type {
    Inventory, ItemInstance, ItemGenerationContext,
} from '../../shared/types/item';
import type { Character } from '../../shared/types/character';
import { clampCurrency } from '../../shared/types/common';
import {
    BusinessLogicError, NotFoundError,
} from '../../shared/types/errors';

export class InventoryService extends BaseService {
    protected serviceName = 'inventory';
    private inventoryRepo: InventoryRepository;
    private itemRepo: ItemRepository;
    private characterRepo: CharacterRepository;
    private db = getAdminFirestore();

    constructor() {
        super();
        this.inventoryRepo = new InventoryRepository();
        this.itemRepo = new ItemRepository();
        this.characterRepo = new CharacterRepository();
    }

    /**
     * Get the character's inventory (itemId references only, created lazily if
     * it doesn't exist yet).
     */
    async getInventory(characterId: string): Promise<Inventory> {
        return this.inventoryRepo.getByCharacterId(characterId);
    }

    /**
     * Get the character's inventory hydrated with full item data, batch-fetched
     * from the `items` collection.
     */
    async getInventoryWithItems(characterId: string): Promise<{ inventory: Inventory; items: ItemInstance[] }> {
        const inventory = await this.inventoryRepo.getByCharacterId(characterId);
        const items = await this.itemRepo.getByIds(inventory.items);
        return {
            inventory, items,
        };
    }

    /**
     * Roll a new item for a character and deliver it into their permanent
     * inventory: persist it as its own `items/{itemId}` document, then add
     * the itemId reference to the inventory. Rejects once the 500-item cap
     * (RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX) is reached.
     */
    async grantItem(characterId: string, templateId: string, context: ItemGenerationContext): Promise<ItemInstance> {
        const rolled = generateItemInstance(templateId, context);
        const item: ItemInstance = {
            ...rolled, characterId,
        };

        await this.itemRepo.createItem(item);
        await this.inventoryRepo.addItem(characterId, item.itemId);

        return item;
    }

    /**
     * Discard an item from the character's permanent inventory: removes the
     * itemId reference and permanently deletes the `items/{itemId}` document.
     * Rejects if the item is currently equipped on the character.
     */
    async discardItem(characterId: string, itemId: string): Promise<void> {
        const inventory = await this.inventoryRepo.getByCharacterId(characterId);
        if (!inventory.items.includes(itemId)) {
            throw new NotFoundError('item');
        }

        const character = await this.characterRepo.getById(characterId);
        const isEquipped = Boolean(character && Object.values(character.equipment).includes(itemId));
        if (isEquipped) {
            throw new BusinessLogicError('Cannot discard an item that is currently equipped');
        }

        await this.inventoryRepo.removeItem(characterId, itemId);
        await this.itemRepo.delete(itemId);
    }

    /**
     * Sell an item from the character's permanent inventory for gold: removes
     * the itemId reference, permanently deletes the `items/{itemId}` document,
     * and credits the character's gold — all in one Firestore transaction (a
     * raw cross-aggregate transaction like EquipmentService.equipItem, rather
     * than composing InventoryRepository/CharacterRepository calls, since
     * Firestore doesn't support nested transactions). Rejects if the item is
     * currently equipped, same rule as discardItem.
     */
    async sellItem(characterId: string, itemId: string): Promise<{ goldEarned: number }> {
        const characterRef = this.db.collection('characters').doc(characterId);
        const itemRef = this.db.collection('items').doc(itemId);
        const inventoryRef = this.db.collection('inventories').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const inventoryDoc = await tx.get(inventoryRef);
            const inventory = inventoryDoc.exists ? (inventoryDoc.data() as Inventory) : undefined;
            if (!inventory || !inventory.items.includes(itemId)) {
                throw new NotFoundError('item');
            }

            const itemDoc = await tx.get(itemRef);
            if (!itemDoc.exists) {
                throw new NotFoundError('item');
            }
            const item = itemDoc.data() as ItemInstance;

            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const character = characterDoc.data() as Character;

            const isEquipped = Object.values(character.equipment).includes(itemId);
            if (isEquipped) {
                throw new BusinessLogicError('Cannot sell an item that is currently equipped');
            }

            const goldEarned = getSellPriceGold(item.templateId, item.rarity);

            tx.update(characterRef, {
                gold: clampCurrency(character.gold + goldEarned),
                updatedAt: Date.now(),
            });
            tx.set(inventoryRef, {
                characterId,
                items: inventory.items.filter(existing => existing !== itemId),
                updatedAt: Date.now(),
            });
            tx.delete(itemRef);

            return { goldEarned };
        });
    }
}
