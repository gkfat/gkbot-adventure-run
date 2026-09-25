/**
 * Mailbox Repository
 * Handles Firestore operations for the mailMessages collection.
 *
 * One document per mail (mailId = Firestore auto-id). Recipient is
 * characterId — rewards (gold/gems/items) are character-level resources,
 * see mailbox/design.md. Claiming is a cross-collection transaction
 * (mail + character + inventory) and lives in MailboxService, not here —
 * same split as AchievementRepository/AchievementService.claim.
 */

import { BaseRepository } from './base.repository';
import type { MailMessage } from '../../shared/types/mailbox';
import { DatabaseError } from '../../shared/types/errors';

export class MailboxRepository extends BaseRepository<MailMessage> {
    protected collectionName = 'mailMessages';

    /**
     * Create a new unclaimed mail for a character.
     */
    async createMail(
        characterId: string,
        title: string,
        body: string,
        rewards: { gold?: number; gems?: number; itemIds?: string[] },
    ): Promise<MailMessage> {
        try {
            const docRef = this.collection.doc();
            const mail: MailMessage = {
                mailId: docRef.id,
                characterId,
                title,
                body,
                rewardGold: rewards.gold ?? 0,
                rewardGems: rewards.gems ?? 0,
                rewardItemIds: rewards.itemIds ?? [],
                status: 'unclaimed',
                createdAt: Date.now(),
            };
            await docRef.set(mail);
            return mail;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create mail: ${message}`);
        }
    }

    /**
     * All mail for a character, newest first.
     */
    async listByCharacter(characterId: string): Promise<MailMessage[]> {
        try {
            const snapshot = await this.collection
                .where('characterId', '==', characterId)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => doc.data() as MailMessage);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to list mail: ${message}`);
        }
    }

    /**
     * Doc reference for a mail, for use inside a cross-collection transaction.
     */
    getMailRef(mailId: string) {
        return this.getDocumentRef(mailId);
    }
}
