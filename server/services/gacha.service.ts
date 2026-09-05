/**
 * Gacha Service
 *
 * The equipment gacha (老虎機): spend a fixed amount of gold or gems to roll
 * one random equipment item, delivered straight into the character's
 * permanent inventory. Unlike the shop, there is no "list then buy" flow —
 * every pull rolls and delivers in the same call, inside a single Firestore
 * transaction (resource check → deduct → roll → write item → add to
 * inventory), so a failure anywhere leaves no partial state (see design.md).
 *
 * This is a 2-aggregate transaction (Character + Item/Inventory), the same
 * shape as `EquipmentService.equipItem` — no shop document involved.
 */

import { BaseService } from './base.service';
import { CharacterRepository } from '../repositories/character.repository';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import { generateItemInstance } from './item.service';
import { getAllItemTemplates } from '../constants/templates';
import {
    GACHA_CONFIG, GACHA_GOLD_RARITY_WEIGHTS, GACHA_GEMS_RARITY_WEIGHTS,
} from '../constants/gacha';
import type {
    GachaCurrency, GachaPullResult, 
} from '../../shared/types/shop';
import type {
    ItemInstance, Inventory, 
} from '../../shared/types/item';
import {
    ItemType, ItemSource, 
} from '../../shared/types/item';
import { RESOURCE_LIMITS } from '../../shared/types/common';
import type { Character } from '../../shared/types/character';
import {
    NotFoundError, BusinessLogicError, DatabaseError,
} from '../../shared/types/errors';

export class GachaService extends BaseService {
    protected serviceName = 'gacha';
    private characterRepo: CharacterRepository;
    private db = getAdminFirestore();

    constructor() {
        super();
        this.characterRepo = new CharacterRepository();
    }

    /**
     * Pull once: checks the character can afford the fixed cost for
     * `currency`, deducts it, rolls one equipment item with the
     * currency-specific rarity weights, and adds it to the character's
     * permanent inventory. All in one Firestore transaction.
     */
    async pull(accountId: string, characterId: string, currency: GachaCurrency): Promise<GachaPullResult> {
        const ownedCharacter = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!ownedCharacter) {
            throw new NotFoundError('character');
        }

        const cost = currency === 'GOLD' ? GACHA_CONFIG.GOLD_COST : GACHA_CONFIG.GEMS_COST;
        const characterRef = this.db.collection('characters').doc(characterId);
        const inventoryRef = this.db.collection('inventories').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const character = characterDoc.data() as Character;
            const balance = currency === 'GOLD' ? character.gold : character.gems;
            if (balance < cost) {
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

            const rolled = generateItemInstance(rollTemplateId(), {
                source: ItemSource.SHOP,
                rarityWeightsOverride: currency === 'GOLD' ? GACHA_GOLD_RARITY_WEIGHTS : GACHA_GEMS_RARITY_WEIGHTS,
            });
            const item: ItemInstance = {
                ...rolled, characterId,
            };

            const itemRef = this.db.collection('items').doc(item.itemId);
            tx.set(itemRef, item);
            tx.set(inventoryRef, {
                characterId,
                items: [...inventory.items, item.itemId],
                updatedAt: Date.now(),
            });

            const remainingBalance = balance - cost;
            tx.update(characterRef, {
                updatedAt: Date.now(),
                ...(currency === 'GOLD' ? { gold: remainingBalance } : { gems: remainingBalance }),
            });

            return {
                item,
                currency,
                amountSpent: cost,
                remainingBalance,
            };
        });
    }
}

/**
 * Gacha only pulls equipment, never potions (see equipment-gacha spec).
 */
function rollTemplateId(): string {
    const equipmentTemplates = getAllItemTemplates().filter(t => t.type === ItemType.EQUIPMENT);
    const template = equipmentTemplates[Math.floor(Math.random() * equipmentTemplates.length)];
    if (!template) {
        throw new DatabaseError('No equipment templates available for gacha');
    }
    return template.templateId;
}
