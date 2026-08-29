/**
 * Inventory Repository
 * Handles Firestore operations for the permanent Inventory collection.
 *
 * One document per character (doc id = characterId). `items` holds only itemId
 * references — full item data lives in the top-level `items` collection
 * (see item.repository.ts). Capacity (500 items) is enforced here, on the
 * write path, inside a transaction so it's a hard limit even under
 * concurrent writes.
 */

import { BaseRepository } from './base.repository';
import type { Inventory } from '../../shared/types/item';
import { RESOURCE_LIMITS } from '../../shared/types/common';
import {
    DatabaseError, BusinessLogicError, NotFoundError,
} from '../../shared/types/errors';

export class InventoryRepository extends BaseRepository<Inventory> {
    protected collectionName = 'inventories';

    /**
     * Get the character's inventory, lazily creating an empty one if it doesn't exist yet.
     * Writes the doc directly (rather than BaseRepository.create) so it matches the
     * Inventory shape exactly — no extraneous `createdAt` field.
     */
    async getByCharacterId(characterId: string): Promise<Inventory> {
        const existing = await this.getById(characterId);
        if (existing) {
            return existing;
        }

        const inventory: Inventory = {
            characterId, items: [], updatedAt: Date.now(),
        };
        try {
            await this.getDocumentRef(characterId).set(inventory);
            return inventory;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create inventory: ${message}`);
        }
    }

    /**
     * Add an itemId reference to the character's inventory. Rejects with
     * BusinessLogicError once the inventory already holds
     * RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX references.
     */
    async addItem(characterId: string, itemId: string): Promise<Inventory> {
        const docRef = this.getDocumentRef(characterId);

        try {
            return await this.db.runTransaction(async (tx) => {
                const doc = await tx.get(docRef);
                const timestamp = Date.now();
                const current: Inventory = doc.exists
                    ? (doc.data() as Inventory)
                    : {
                        characterId, items: [], updatedAt: timestamp,
                    };

                if (current.items.length >= RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX) {
                    throw new BusinessLogicError('Inventory is full');
                }

                const updated: Inventory = {
                    characterId,
                    items: [...current.items, itemId],
                    updatedAt: timestamp,
                };
                tx.set(docRef, updated);
                return updated;
            });
        } catch (error: unknown) {
            if (error instanceof BusinessLogicError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to add item to inventory: ${message}`);
        }
    }

    /**
     * Remove an itemId reference from the character's inventory. Throws
     * NotFoundError if the inventory or the reference within it doesn't exist.
     */
    async removeItem(characterId: string, itemId: string): Promise<Inventory> {
        const docRef = this.getDocumentRef(characterId);

        try {
            return await this.db.runTransaction(async (tx) => {
                const doc = await tx.get(docRef);
                if (!doc.exists) {
                    throw new NotFoundError('inventory');
                }

                const current = doc.data() as Inventory;
                if (!current.items.includes(itemId)) {
                    throw new NotFoundError('item');
                }

                const updated: Inventory = {
                    ...current,
                    items: current.items.filter(existing => existing !== itemId),
                    updatedAt: Date.now(),
                };
                tx.set(docRef, updated);
                return updated;
            });
        } catch (error: unknown) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to remove item from inventory: ${message}`);
        }
    }
}
