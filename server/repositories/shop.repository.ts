/**
 * Shop Repository
 * Handles Firestore operations for the `dailyShops` collection.
 *
 * One document per character per day (doc id = `{characterId}_{date}`) —
 * shop is per-character (gold/gems are Character fields, see
 * shared/types/character.ts). Only used by the lazy-generation read path
 * (ShopService.getOrGenerateShop); the purchase transaction reads/writes
 * this collection directly via raw Firestore calls (see
 * ShopService.purchaseItem) since Firestore doesn't support nested
 * transactions.
 */

import { BaseRepository } from './base.repository';
import type { DailyShop } from '../../shared/types/shop';
import { DatabaseError } from '../../shared/types/errors';

function docId(characterId: string, date: string): string {
    return `${characterId}_${date}`;
}

export class ShopRepository extends BaseRepository<DailyShop> {
    protected collectionName = 'dailyShops';

    async getShop(characterId: string, date: string): Promise<DailyShop | null> {
        return this.getById(docId(characterId, date));
    }

    /**
     * Create the day's shop document. Uses Firestore `create()` (not
     * `set()`) so a concurrent duplicate generation fails instead of silently
     * overwriting — returns null in that case (caller falls back to reading
     * the document the other request already created) rather than throwing.
     */
    async createShop(shop: DailyShop): Promise<DailyShop | null> {
        try {
            await this.getDocumentRef(docId(shop.characterId, shop.date)).create(shop);
            return shop;
        } catch (error: unknown) {
            if (isAlreadyExists(error)) {
                return null;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create shop: ${message}`);
        }
    }

    /**
     * Best-effort delete for the lazy-destroy cleanup (see design.md) — a
     * missing document (never generated, or already cleaned up) is not an error.
     */
    async deleteShop(characterId: string, date: string): Promise<void> {
        try {
            await this.getDocumentRef(docId(characterId, date)).delete();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to delete shop: ${message}`);
        }
    }

    /**
     * Delete every shop document for this character other than `keepDate`
     * (today's, just generated) — not just "yesterday's", so a character
     * that skips several days still has every stale, unsold-item shop
     * document cleaned up instead of only the single most recent one.
     */
    async deleteOldShops(characterId: string, keepDate: string): Promise<void> {
        try {
            const snapshot = await this.collection.where('characterId', '==', characterId).get();
            const stale = snapshot.docs.filter(doc => doc.get('date') !== keepDate);
            if (stale.length === 0) return;

            const batch = this.db.batch();
            stale.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to delete old shops: ${message}`);
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
