/**
 * Quest Service
 *
 * Handles both daily quests (reset every UTC day, lazy-generated via batch
 * write — see design.md) and persistent quests (never reset, lazily created
 * once, claimable once per character — same lifetime-once shape as
 * AchievementService). Both are scoped to a character, not an account (see
 * shared/types/quest.ts).
 *
 * Claiming credits the character's gold/gems inside the same Firestore
 * transaction that marks the quest claimed — the same multi-document
 * transaction pattern ShopService.purchaseItem uses, since Firestore doesn't
 * support nested transactions and this can't delegate to CharacterRepository.
 */

import type {
    DocumentReference, DocumentData, 
} from 'firebase-admin/firestore';
import { BaseService } from './base.service';
import {
    QuestRepository, dailyQuestId, persistentQuestId,
} from '../repositories/quest.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import {
    getAllQuestTemplates, getQuestTemplate,
    getAllPersistentQuestTemplates, getPersistentQuestTemplate,
} from '../constants/templates';
import type {
    DailyQuest, PersistentQuest, QuestTemplate, QuestType,
} from '../../shared/types/quest';
import type { Character } from '../../shared/types/character';
import { clampCurrency } from '../../shared/types/common';
import {
    NotFoundError, BusinessLogicError, ConflictError,
} from '../../shared/types/errors';
import type {
    DailyQuestWithTemplate, PersistentQuestWithTemplate,
} from '../../shared/schemas/api/quest.schema';

export type ClaimQuestResult = {
    goldEarned: number;
    gemsEarned: number;
};

export class QuestService extends BaseService {
    protected serviceName = 'quest';
    private questRepo = new QuestRepository();
    private characterRepo = new CharacterRepository();
    private db = getAdminFirestore();

    /**
     * Get today's daily quests for a character, lazily generating all 3 (no
     * reroll) if none exist yet for today.
     */
    async getOrGenerateDaily(characterId: string): Promise<DailyQuestWithTemplate[]> {
        const date = getTodayUtcDate();
        const existing = await this.questRepo.getDailyQuests(characterId, date);
        const quests = existing.length > 0
            ? existing
            : await this.generateDaily(characterId, date);

        return quests.map(quest => withTemplateInfo(quest, getQuestTemplate));
    }

    private async generateDaily(characterId: string, date: string): Promise<DailyQuest[]> {
        const quests = getAllQuestTemplates().map(template => buildDailyQuest(characterId, date, template));
        await this.questRepo.batchCreateDailyQuests(quests);
        return quests;
    }

    /**
     * Get a character's persistent quests, lazily creating any missing
     * template's document (never reset once created).
     */
    async getOrGeneratePersistent(characterId: string): Promise<PersistentQuestWithTemplate[]> {
        const existing = await this.questRepo.getPersistentQuests(characterId);
        const existingTemplateIds = new Set(existing.map(quest => quest.templateId));
        const missingTemplates = getAllPersistentQuestTemplates()
            .filter(template => !existingTemplateIds.has(template.templateId));

        const quests = missingTemplates.length === 0
            ? existing
            : await this.createMissingPersistent(characterId, existing, missingTemplates);

        return quests.map(quest => withTemplateInfo(quest, getPersistentQuestTemplate));
    }

    private async createMissingPersistent(
        characterId: string, existing: PersistentQuest[], missingTemplates: QuestTemplate[],
    ): Promise<PersistentQuest[]> {
        const created = missingTemplates.map(template => buildPersistentQuest(characterId, template));
        await this.questRepo.batchCreatePersistentQuests(created);
        return [...existing, ...created];
    }

    /**
     * Report that `eventType` happened `amount` times for a character —
     * bumps every not-yet-completed daily and persistent quest whose
     * template matches that event type. Caller doesn't need to know which
     * quests exist (see design.md's decoupled-interface decision).
     */
    async incrementProgress(characterId: string, eventType: QuestType, amount: number): Promise<void> {
        await Promise.all([this.incrementDaily(characterId, eventType, amount), this.incrementPersistent(characterId, eventType, amount)]);
    }

    async claimDaily(accountId: string, characterId: string, questId: string): Promise<ClaimQuestResult> {
        const date = getTodayUtcDate();
        const docRef = this.db.collection('dailyQuests').doc(questId);
        return this.claim(accountId, characterId, docRef, 'daily quest', (quest) => {
            if ((quest as DailyQuest).date !== date) {
                throw new NotFoundError('daily quest');
            }
        });
    }

    async claimPersistent(accountId: string, characterId: string, questId: string): Promise<ClaimQuestResult> {
        const docRef = this.db.collection('persistentQuests').doc(questId);
        return this.claim(accountId, characterId, docRef, 'persistent quest');
    }

    private async incrementDaily(characterId: string, eventType: QuestType, amount: number): Promise<void> {
        // getOrGenerateDaily(), not a bare repo read: a character with no
        // daily quest docs yet for today would otherwise have nothing to
        // bump and this progress would be silently dropped.
        const quests = await this.getOrGenerateDaily(characterId);
        await this.applyIncrement(quests, eventType, amount, getQuestTemplate, 'dailyQuests');
    }

    private async incrementPersistent(characterId: string, eventType: QuestType, amount: number): Promise<void> {
        // Same reasoning as incrementDaily — lazily create first.
        const quests = await this.getOrGeneratePersistent(characterId);
        await this.applyIncrement(quests, eventType, amount, getPersistentQuestTemplate, 'persistentQuests');
    }

    private async applyIncrement(
        quests: (DailyQuest | PersistentQuest)[],
        eventType: QuestType,
        amount: number,
        lookupTemplate: (_templateId: string) => QuestTemplate | undefined,
        collectionName: 'dailyQuests' | 'persistentQuests',
    ): Promise<void> {
        const affected = quests.filter((quest) => {
            if (quest.completed) return false;
            const template = lookupTemplate(quest.templateId);
            return template?.type === eventType;
        });
        if (affected.length === 0) return;

        const batch = this.db.batch();
        affected.forEach((quest) => {
            const currentCount = Math.min(quest.currentCount + amount, quest.targetCount);
            batch.update(this.db.collection(collectionName).doc(quest.questId), {
                currentCount,
                completed: currentCount >= quest.targetCount,
                updatedAt: Date.now(),
            });
        });
        await batch.commit();
    }

    /**
     * Shared claim transaction for daily/persistent quests: verify the quest
     * belongs to the character and is completed-but-unclaimed, then credit
     * the character's gold/gems and mark it claimed, all in one transaction.
     */
    private async claim(
        accountId: string,
        characterId: string,
        docRef: DocumentReference<DocumentData>,
        resourceName: string,
        extraCheck?: (_quest: DailyQuest | PersistentQuest) => void,
    ): Promise<ClaimQuestResult> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        const characterRef = this.db.collection('characters').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const doc = await tx.get(docRef);
            if (!doc.exists) {
                throw new NotFoundError(resourceName);
            }
            const quest = doc.data() as DailyQuest | PersistentQuest;
            if (quest.characterId !== characterId) {
                throw new NotFoundError(resourceName);
            }
            extraCheck?.(quest);
            if (!quest.completed) {
                throw new BusinessLogicError(`${resourceName} not completed yet`);
            }
            if (quest.claimed) {
                throw new ConflictError(`${resourceName} already claimed`);
            }

            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const currentCharacter = characterDoc.data() as Character;

            const gold = clampCurrency(currentCharacter.gold + quest.rewardGold);
            const gems = clampCurrency(currentCharacter.gems + quest.rewardGems);

            tx.update(characterRef, {
                gold, gems, updatedAt: Date.now(),
            });
            tx.update(docRef, {
                claimed: true, claimedAt: Date.now(), updatedAt: Date.now(),
            });

            return {
                goldEarned: quest.rewardGold,
                gemsEarned: quest.rewardGems,
            };
        });
    }
}

function withTemplateInfo<T extends { templateId: string }>(
    quest: T, lookupTemplate: (_templateId: string) => QuestTemplate | undefined,
): T & { name: string; description: string } {
    const template = lookupTemplate(quest.templateId);
    return {
        ...quest,
        name: template?.name ?? quest.templateId,
        description: template?.description ?? '',
    };
}

function getTodayUtcDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function buildDailyQuest(characterId: string, date: string, template: QuestTemplate): DailyQuest {
    const timestamp = Date.now();
    return {
        questId: dailyQuestId(characterId, date, template.templateId),
        templateId: template.templateId,
        characterId,
        date,
        currentCount: 0,
        targetCount: template.targetCount,
        completed: false,
        rewardGold: template.rewardGold,
        rewardGems: template.rewardGems,
        claimed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

function buildPersistentQuest(characterId: string, template: QuestTemplate): PersistentQuest {
    const timestamp = Date.now();
    return {
        questId: persistentQuestId(characterId, template.templateId),
        templateId: template.templateId,
        characterId,
        currentCount: 0,
        targetCount: template.targetCount,
        completed: false,
        rewardGold: template.rewardGold,
        rewardGems: template.rewardGems,
        claimed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}
