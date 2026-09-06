/**
 * Achievement Repository
 * Handles Firestore operations for the `achievementProgress` collection,
 * scoped to a character (see shared/types/quest.ts — lifetime-once per
 * character, not per account).
 *
 * Claiming (which also credits the character's gems) is a cross-aggregate
 * operation and lives in AchievementService, not here — same split as
 * ShopRepository/ShopService (Firestore doesn't support nested transactions).
 */

import { BaseRepository } from './base.repository';
import type { AchievementProgress } from '../../shared/types/quest';
import { DatabaseError } from '../../shared/types/errors';

export function achievementId(characterId: string, templateId: string): string {
    return `${characterId}_${templateId}`;
}

export class AchievementRepository extends BaseRepository<AchievementProgress> {
    protected collectionName = 'achievementProgress';

    getAchievementRef(characterId: string, templateId: string) {
        return this.getDocumentRef(achievementId(characterId, templateId));
    }

    async getAll(characterId: string): Promise<AchievementProgress[]> {
        try {
            const snapshot = await this.collection.where('characterId', '==', characterId).get();
            // Not this.snapshotToArray: it injects a synthetic `id: doc.id` field
            // (BaseRepository's convention) that achievementProgressSchema.strict()
            // rejects — these documents already self-identify via `achievementId`.
            return snapshot.docs.map(doc => doc.data() as AchievementProgress);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get achievements: ${message}`);
        }
    }

    /**
     * Create any achievement templates the character doesn't have a document
     * for yet. A race between two concurrent first-queries at worst
     * double-writes identical initial content.
     */
    async batchCreate(achievements: AchievementProgress[]): Promise<void> {
        try {
            const batch = this.db.batch();
            achievements.forEach((achievement) => {
                batch.set(this.getAchievementRef(achievement.characterId, achievement.templateId), achievement);
            });
            await batch.commit();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create achievements: ${message}`);
        }
    }
}
