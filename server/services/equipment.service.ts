/**
 * Equipment Service
 *
 * Equip/unequip is the first cross-aggregate operation in this codebase:
 * `characters/{characterId}.equipment` (slot -> itemId) and the referenced
 * `items/{itemId}` documents must be read consistently within a single
 * Firestore transaction (see design.md RULE-019). Only the character document
 * is written — the item's own `characterId` field is enough to verify
 * ownership, so there's no need to touch `inventories` at all here.
 */

import { BaseService } from './base.service';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import type { Character } from '../../shared/types/character';
import type { ItemInstance } from '../../shared/types/item';
import type { EquipmentSlot } from '../../shared/types';
import {
    ItemType, HAND_SLOTS,
} from '../../shared/types';
import {
    NotFoundError, ValidationError,
} from '../../shared/types/errors';

export type EquipResult = {
    equipped: ItemInstance;
    unequipped?: ItemInstance;
};

export class EquipmentService extends BaseService {
    protected serviceName = 'equipment';
    private db = getAdminFirestore();

    /**
     * Equip an item onto one of the account's characters. If the target slot
     * is already occupied, the previous item is replaced (its `items` document
     * is untouched) and returned as `unequipped`.
     *
     * `requestedSlot` only takes effect for hand items (sword/dagger-type
     * equipment, whose `equipSlot` is LEFT_HAND or RIGHT_HAND) — it lets the
     * caller choose which hand instead of always using the item's own
     * default. Any other requested slot is ignored.
     */
    async equipItem(
        accountId: string, characterId: string, itemId: string, requestedSlot?: EquipmentSlot,
    ): Promise<EquipResult> {
        const characterRef = this.db.collection('characters').doc(characterId);
        const itemRef = this.db.collection('items').doc(itemId);

        return this.db.runTransaction(async (tx) => {
            const characterDoc = await tx.get(characterRef);
            const character = this.getOwnedCharacterOrThrow(characterDoc.data() as Character | undefined, accountId);

            const itemDoc = await tx.get(itemRef);
            const item = this.getOwnedItemOrThrow(itemDoc.exists ? itemDoc.data() as ItemInstance : undefined, characterId);

            if (item.type !== ItemType.EQUIPMENT || !item.equipSlot) {
                throw new ValidationError('Item is not equipment');
            }

            const slot = (HAND_SLOTS.includes(item.equipSlot) && requestedSlot && HAND_SLOTS.includes(requestedSlot))
                ? requestedSlot
                : item.equipSlot;
            const previousItemId = character.equipment[slot];
            let unequipped: ItemInstance | undefined;
            if (previousItemId) {
                const previousDoc = await tx.get(this.db.collection('items').doc(previousItemId));
                unequipped = previousDoc.exists ? previousDoc.data() as ItemInstance : undefined;
            }

            const equipment = {
                ...character.equipment, [slot]: itemId,
            };
            tx.update(characterRef, {
                equipment, updatedAt: Date.now(),
            });

            return {
                equipped: item, unequipped,
            };
        });
    }

    /**
     * Unequip whatever item currently occupies the given slot on a character.
     */
    async unequipItem(accountId: string, characterId: string, slot: EquipmentSlot): Promise<ItemInstance> {
        const characterRef = this.db.collection('characters').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const characterDoc = await tx.get(characterRef);
            const character = this.getOwnedCharacterOrThrow(characterDoc.data() as Character | undefined, accountId);

            const itemId = character.equipment[slot];
            if (!itemId) {
                throw new ValidationError(`Slot ${slot} is empty`);
            }

            const itemDoc = await tx.get(this.db.collection('items').doc(itemId));
            if (!itemDoc.exists) {
                throw new NotFoundError('item');
            }
            const item = itemDoc.data() as ItemInstance;

            const equipment = Object.fromEntries(
                Object.entries(character.equipment).filter(([existingSlot]) => existingSlot !== slot),
            ) as Character['equipment'];
            tx.update(characterRef, {
                equipment, updatedAt: Date.now(),
            });

            return item;
        });
    }

    private getOwnedCharacterOrThrow(character: Character | undefined, accountId: string): Character {
        if (!character || character.accountId !== accountId) {
            throw new NotFoundError('character');
        }
        return character;
    }

    private getOwnedItemOrThrow(item: ItemInstance | undefined, characterId: string): ItemInstance {
        if (!item || item.characterId !== characterId) {
            throw new ValidationError('Item not found in inventory');
        }
        return item;
    }
}
