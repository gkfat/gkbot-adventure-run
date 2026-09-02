/**
 * Shop Repository
 * Handles Firestore operations for the `shopsGold`/`shopsGems` collections.
 *
 * One document per character per day (doc id = `{characterId}_{date}`) for
 * both collections — shop is per-character (gold/gems are Character fields,
 * see shared/types/character.ts). Only used by the lazy-generation read path
 * (ShopService.getOrGenerateGoldShop/getOrGenerateGemsShop); the purchase
 * transaction reads/writes these collections directly via raw Firestore
 * calls (see ShopService.purchaseItem) since Firestore doesn't support
 * nested transactions.
 */

import type { CollectionReference } from 'firebase-admin/firestore';
import { BaseRepository } from './base.repository';
import type {
    DailyGoldShop, DailyGemsShop,
} from '../../shared/types/shop';
import { DatabaseError } from '../../shared/types/errors';

function docId(characterId: string, date: string): string {
    return `${characterId}_${date}`;
}

export class ShopRepository extends BaseRepository<DailyGoldShop> {
    protected collectionName = 'shopsGold';

    private get gemsCollection() {
        return this.db.collection('shopsGems');
    }

    async getGoldShop(characterId: string, date: string): Promise<DailyGoldShop | null> {
        return this.getById(docId(characterId, date));
    }

    async getGemsShop(characterId: string, date: string): Promise<DailyGemsShop | null> {
        try {
            const doc = await this.gemsCollection.doc(docId(characterId, date)).get();
            return doc.exists ? (doc.data() as DailyGemsShop) : null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get gems shop: ${message}`);
        }
    }

    /**
     * Create the day's gold shop document. Uses Firestore `create()` (not
     * `set()`) so a concurrent duplicate generation fails instead of silently
     * overwriting — returns null in that case (caller falls back to reading
     * the document the other request already created) rather than throwing.
     */
    async createGoldShop(shop: DailyGoldShop): Promise<DailyGoldShop | null> {
        try {
            await this.getDocumentRef(docId(shop.characterId, shop.date)).create(shop);
            return shop;
        } catch (error: unknown) {
            if (isAlreadyExists(error)) {
                return null;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create gold shop: ${message}`);
        }
    }

    async createGemsShop(shop: DailyGemsShop): Promise<DailyGemsShop | null> {
        try {
            await this.gemsCollection.doc(docId(shop.characterId, shop.date)).create(shop);
            return shop;
        } catch (error: unknown) {
            if (isAlreadyExists(error)) {
                return null;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create gems shop: ${message}`);
        }
    }

    /**
     * Best-effort delete for the lazy-destroy cleanup (see design.md) — a
     * missing document (never generated, or already cleaned up) is not an error.
     */
    async deleteGoldShop(characterId: string, date: string): Promise<void> {
        try {
            await this.getDocumentRef(docId(characterId, date)).delete();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to delete gold shop: ${message}`);
        }
    }

    async deleteGemsShop(characterId: string, date: string): Promise<void> {
        try {
            await this.gemsCollection.doc(docId(characterId, date)).delete();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to delete gems shop: ${message}`);
        }
    }

    /**
     * Delete every gold shop document for this character other than
     * `keepDate` (today's, just generated) — not just "yesterday's", so a
     * character that skips several days still has every stale, unsold-item
     * shop document cleaned up instead of only the single most recent one.
     */
    async deleteOldGoldShops(characterId: string, keepDate: string): Promise<void> {
        await this.deleteOldShops(this.collection, characterId, keepDate, 'gold shop');
    }

    async deleteOldGemsShops(characterId: string, keepDate: string): Promise<void> {
        await this.deleteOldShops(this.gemsCollection, characterId, keepDate, 'gems shop');
    }

    private async deleteOldShops(
        collection: CollectionReference,
        characterId: string,
        keepDate: string,
        label: string,
    ): Promise<void> {
        try {
            const snapshot = await collection.where('characterId', '==', characterId).get();
            const stale = snapshot.docs.filter(doc => doc.get('date') !== keepDate);
            if (stale.length === 0) return;

            const batch = this.db.batch();
            stale.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to delete old ${label}s: ${message}`);
        }
    }
}

/**
 * Firestore Admin SDK throws with grpc status code 6 (ALREADY_EXISTS) when
 * `DocumentReference.create()` targets an existing document.
 */
function isAlreadyExists(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 6;
}
