/**
 * Item Repository
 * Handles Firestore operations for the top-level `items` collection.
 *
 * One document per item (doc id = itemId) — the single source of truth for
 * item data. Every other container (permanent inventory, character equipment,
 * eventually run inventory / shop slots) only stores the itemId reference.
 */

import { BaseRepository } from './base.repository';
import type { ItemInstance } from '../../shared/types/item';
import { DatabaseError } from '../../shared/types/errors';

// Defensive chunk size for batched getAll() calls — not the Firestore 'in'-query
// 30-value cap (multi-document get by ref doesn't have that limit), just a
// sane ceiling so a single call never requests an unbounded number of docs.
const GET_BATCH_SIZE = 100;

export class ItemRepository extends BaseRepository<ItemInstance> {
    protected collectionName = 'items';

    /**
     * Persist a generated item as its own document. Writes exactly the
     * ItemInstance shape (no BaseRepository timestamp injection). Named
     * distinctly from BaseRepository.create, whose signature (id, partial data
     * + injected timestamps) doesn't fit an already-fully-formed ItemInstance.
     */
    async createItem(item: ItemInstance): Promise<ItemInstance> {
        try {
            await this.getDocumentRef(item.itemId).set(item);
            return item;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create item: ${message}`);
        }
    }

    /**
     * Batch-fetch items by id, preserving no particular order. Missing ids
     * (e.g. an item that was discarded/deleted) are silently skipped.
     */
    async getByIds(itemIds: string[]): Promise<ItemInstance[]> {
        if (itemIds.length === 0) {
            return [];
        }

        try {
            const batches = chunk(itemIds, GET_BATCH_SIZE);
            const results = await Promise.all(batches.map(async (ids) => {
                const refs = ids.map(id => this.getDocumentRef(id));
                const docs = await this.db.getAll(...refs);
                return docs.filter(doc => doc.exists).map(doc => doc.data() as ItemInstance);
            }));
            return results.flat();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to batch get items: ${message}`);
        }
    }
}

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}
