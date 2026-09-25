/**
 * Mailbox Service
 *
 * Generic reward-delivery channel: `send()` is called by other services
 * (e.g. leaderboard season settlement) to mail a character, `claim()` is
 * called by the player. Claiming credits gold/gems and adds items to the
 * character's permanent inventory inside the same Firestore transaction
 * that marks the mail claimed — same multi-document transaction pattern as
 * AchievementService.claim/QuestService.claim.
 */

import { BaseService } from './base.service';
import { MailboxRepository } from '../repositories/mailbox.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import type { MailMessage } from '../../shared/types/mailbox';
import type { Character } from '../../shared/types/character';
import type { Inventory } from '../../shared/types/item';
import {
    clampCurrency, RESOURCE_LIMITS,
} from '../../shared/types/common';
import {
    NotFoundError, ConflictError, BusinessLogicError,
} from '../../shared/types/errors';

export class MailboxService extends BaseService {
    protected serviceName = 'mailbox';
    private mailboxRepo = new MailboxRepository();
    private characterRepo = new CharacterRepository();
    private db = getAdminFirestore();

    /**
     * Send a mail to a character. Called by other services — no ownership
     * check (the caller already knows which character it's addressing).
     */
    async send(
        characterId: string,
        title: string,
        body: string,
        rewards: { gold?: number; gems?: number; itemIds?: string[] } = {},
    ): Promise<MailMessage> {
        return this.mailboxRepo.createMail(characterId, title, body, rewards);
    }

    /**
     * A character's mail, newest first. Throws NotFoundError if the
     * character doesn't exist or doesn't belong to `accountId`.
     */
    async getMailbox(accountId: string, characterId: string): Promise<MailMessage[]> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }
        return this.mailboxRepo.listByCharacter(characterId);
    }

    /**
     * Claim a mail's reward: credits gold/gems and adds items to inventory,
     * then marks the mail claimed — all inside one transaction so a claim
     * can't partially apply.
     */
    async claim(
        accountId: string,
        characterId: string,
        mailId: string,
    ): Promise<{ goldEarned: number; gemsEarned: number; itemIdsAdded: string[] }> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        const mailRef = this.mailboxRepo.getMailRef(mailId);
        const characterRef = this.db.collection('characters').doc(characterId);
        const inventoryRef = this.db.collection('inventories').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const mailDoc = await tx.get(mailRef);
            if (!mailDoc.exists) {
                throw new NotFoundError('mail');
            }
            const mail = mailDoc.data() as MailMessage;
            if (mail.characterId !== characterId) {
                throw new NotFoundError('mail');
            }
            if (mail.status === 'claimed') {
                throw new ConflictError('Mail already claimed');
            }

            const hasItems = mail.rewardItemIds.length > 0;
            const hasCurrency = mail.rewardGold > 0 || mail.rewardGems > 0;

            // All reads must happen before any writes in a Firestore transaction.
            const inventoryDoc = hasItems ? await tx.get(inventoryRef) : undefined;
            const characterDoc = hasCurrency ? await tx.get(characterRef) : undefined;

            if (hasItems) {
                const currentItems = inventoryDoc!.exists ? (inventoryDoc!.data() as Inventory).items : [];
                if (currentItems.length + mail.rewardItemIds.length > RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX) {
                    throw new BusinessLogicError('Inventory is full');
                }
                tx.set(inventoryRef, {
                    characterId,
                    items: [...currentItems, ...mail.rewardItemIds],
                    updatedAt: Date.now(),
                });
            }

            if (hasCurrency) {
                const currentCharacter = characterDoc!.data() as Character;
                tx.update(characterRef, {
                    gold: clampCurrency(currentCharacter.gold + mail.rewardGold),
                    gems: clampCurrency(currentCharacter.gems + mail.rewardGems),
                    updatedAt: Date.now(),
                });
            }

            tx.update(mailRef, {
                status: 'claimed', claimedAt: Date.now(),
            });

            return {
                goldEarned: mail.rewardGold,
                gemsEarned: mail.rewardGems,
                itemIdsAdded: mail.rewardItemIds,
            };
        });
    }
}
