/**
 * Quest Repository
 * Handles Firestore operations for the `dailyQuests` and `persistentQuests`
 * collections. Both are scoped to a character (see shared/types/quest.ts).
 *
 * Claiming (which also credits the character's gold/gems) is a cross-aggregate
 * operation and lives in QuestService, not here — same split as
 * ShopRepository/ShopService (Firestore doesn't support nested transactions).
 */

import { BaseRepository } from './base.repository';
import type {
    DailyQuest, PersistentQuest, 
} from '../../shared/types/quest';
import { DatabaseError } from '../../shared/types/errors';

export function dailyQuestId(characterId: string, date: string, templateId: string): string {
    return `${characterId}_${date}_${templateId}`;
}

export function persistentQuestId(characterId: string, templateId: string): string {
    return `${characterId}_${templateId}`;
}

export class QuestRepository extends BaseRepository<DailyQuest> {
    protected collectionName = 'dailyQuests';

    private get persistentCollection() {
        return this.db.collection('persistentQuests');
    }

    getDailyQuestRef(characterId: string, date: string, templateId: string) {
        return this.getDocumentRef(dailyQuestId(characterId, date, templateId));
    }

    getPersistentQuestRef(characterId: string, templateId: string) {
        return this.persistentCollection.doc(persistentQuestId(characterId, templateId));
    }

    async getDailyQuests(characterId: string, date: string): Promise<DailyQuest[]> {
        try {
            const snapshot = await this.collection
                .where('characterId', '==', characterId)
                .where('date', '==', date)
                .get();
            // Not this.snapshotToArray: it injects a synthetic `id: doc.id` field
            // (BaseRepository's convention) that dailyQuestSchema.strict() rejects
            // — these documents already self-identify via their own `questId` field.
            return snapshot.docs.map(doc => doc.data() as DailyQuest);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get daily quests: ${message}`);
        }
    }

    /**
     * Reset the day's quests in one batch write (see design.md — not a
     * single atomic write, but the whole set appears together in practice).
     */
    async batchCreateDailyQuests(quests: DailyQuest[]): Promise<void> {
        try {
            const batch = this.db.batch();
            quests.forEach((quest) => {
                batch.set(this.getDailyQuestRef(quest.characterId, quest.date, quest.templateId), quest);
            });
            await batch.commit();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create daily quests: ${message}`);
        }
    }

    async getPersistentQuests(characterId: string): Promise<PersistentQuest[]> {
        try {
            const snapshot = await this.persistentCollection.where('characterId', '==', characterId).get();
            return snapshot.docs.map(doc => doc.data() as PersistentQuest);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get persistent quests: ${message}`);
        }
    }

    /**
     * Create any persistent quest templates the character doesn't have a
     * document for yet. A race between two concurrent first-queries at worst
     * double-writes identical initial content (same tolerance as daily reset).
     */
    async batchCreatePersistentQuests(quests: PersistentQuest[]): Promise<void> {
        try {
            const batch = this.db.batch();
            quests.forEach((quest) => {
                batch.set(this.getPersistentQuestRef(quest.characterId, quest.templateId), quest);
            });
            await batch.commit();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create persistent quests: ${message}`);
        }
    }

    /**
     * Permanently delete every daily and persistent quest document belonging
     * to a character — used when the character itself is deleted.
     */
    async deleteAllByCharacterId(characterId: string): Promise<void> {
        try {
            const [dailySnapshot, persistentSnapshot] = await Promise.all([this.collection.where('characterId', '==', characterId).get(), this.persistentCollection.where('characterId', '==', characterId).get()]);

            if (dailySnapshot.empty && persistentSnapshot.empty) {
                return;
            }

            const batch = this.db.batch();
            dailySnapshot.docs.forEach(doc => batch.delete(doc.ref));
            persistentSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to delete quests: ${message}`);
        }
    }
}
