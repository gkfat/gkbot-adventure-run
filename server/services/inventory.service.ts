import { BaseService } from './base.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ItemRepository } from '../repositories/item.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { generateItemInstance } from './item.service';
import type {
    Inventory, ItemInstance, ItemGenerationContext,
} from '../../shared/types/item';
import {
    BusinessLogicError, NotFoundError,
} from '../../shared/types/errors';

export class InventoryService extends BaseService {
    protected serviceName = 'inventory';
    private inventoryRepo: InventoryRepository;
    private itemRepo: ItemRepository;
    private characterRepo: CharacterRepository;

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
}
