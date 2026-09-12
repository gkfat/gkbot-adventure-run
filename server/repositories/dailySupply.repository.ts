/**
 * Daily Supply Repository
 * Handles Firestore operations for the `dailySupplies` collection.
 *
 * One document per character per day (doc id = `{characterId}_{date}`) —
 * same lazy-generation shape as ShopRepository. Claiming (which also credits
 * the character's gold and delivers the item into inventory) is a
 * cross-aggregate operation and lives in ShopService, not here — same split
 * as ShopRepository/ShopService (Firestore doesn't support nested transactions).
 */

import { BaseRepository } from './base.repository';
import type { DailySupply } from '../../shared/schemas/firestore/shop.schema';
import { DatabaseError } from '../../shared/types/errors';

function docId(characterId: string, date: string): string {
    return `${characterId}_${date}`;
}

export class DailySupplyRepository extends BaseRepository<DailySupply> {
    protected collectionName = 'dailySupplies';

    async getDailySupply(characterId: string, date: string): Promise<DailySupply | null> {
        return this.getById(docId(characterId, date));
    }

    /**
     * Create the day's daily supply document. Uses Firestore `create()` (not
     * `set()`) so a concurrent duplicate generation fails instead of silently
     * overwriting — returns null in that case (caller falls back to reading
     * the document the other request already created) rather than throwing.
     */
    async createDailySupply(supply: DailySupply): Promise<DailySupply | null> {
        try {
            await this.getDocumentRef(docId(supply.characterId, supply.date)).create(supply);
            return supply;
        } catch (error: unknown) {
            if (isAlreadyExists(error)) {
                return null;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create daily supply: ${message}`);
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
