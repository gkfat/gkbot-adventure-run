/**
 * Achievement Service
 *
 * Milestone-oriented, lifetime-once-per-character progress tracking (see
 * design.md for the distinction from persistent quests: content orientation
 * and reward fields differ — achievements only pay gems). Claiming credits
 * the character's gems inside the same Firestore transaction that marks the
 * achievement claimed, same multi-document transaction pattern as
 * QuestService.claim / ShopService.purchaseItem.
 */

import { BaseService } from './base.service';
import {
    AchievementRepository, achievementId, 
} from '../repositories/achievement.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import {
    getAllAchievementTemplates, getAchievementTemplate, 
} from '../constants/templates';
import type {
    AchievementProgress, AchievementType,  
} from '../../shared/types/quest';
import type { Character } from '../../shared/types/character';
import { clampCurrency } from '../../shared/types/common';
import {
    NotFoundError, BusinessLogicError, ConflictError,
} from '../../shared/types/errors';
import type { AchievementWithTemplate } from '../../shared/schemas/api/quest.schema';

export class AchievementService extends BaseService {
    protected serviceName = 'achievement';
    private achievementRepo = new AchievementRepository();
    private characterRepo = new CharacterRepository();
    private db = getAdminFirestore();

    /**
     * Get a character's achievement progress, lazily creating any missing
     * template's document.
     */
    async getAll(characterId: string): Promise<AchievementWithTemplate[]> {
        const achievements = await this.getOrCreateAll(characterId);

        // Achievements whose template was removed (e.g. a retired
        // MAX_SCORE achievement) leave orphaned progress docs behind —
        // skip them rather than showing a raw templateId as the name.
        return achievements
            .filter(achievement => getAchievementTemplate(achievement.templateId) !== undefined)
            .map((achievement) => {
                const template = getAchievementTemplate(achievement.templateId);
                const isPeak = template?.mode === 'PEAK';
                return {
                    ...achievement,
                    name: template!.name,
                    description: template!.description,
                    // PEAK achievements (e.g. MAX_SCORE) track a single-attempt
                    // peak value internally, not a running total — showing the
                    // raw score/step against its threshold reads like a
                    // cumulative counter it isn't, so the client only ever sees
                    // a plain 0/1 (see AchievementProgressMode).
                    currentCount: isPeak ? (achievement.completed ? 1 : 0) : achievement.currentCount,
                    targetCount: isPeak ? 1 : achievement.targetCount,
                };
            });
    }

    /**
     * Raw (non-display-transformed) progress docs, lazily creating any
     * missing template's document. Shared by getAll() and incrementProgress()
     * so a character that has never opened the achievements screen still
     * gets its docs created (and thus its progress recorded) the first time
     * an event fires, not only when it first requests the list.
     */
    private async getOrCreateAll(characterId: string): Promise<AchievementProgress[]> {
        const existing = await this.achievementRepo.getAll(characterId);
        const existingTemplateIds = new Set(existing.map(achievement => achievement.templateId));
        const missingTemplates = getAllAchievementTemplates()
            .filter(template => !existingTemplateIds.has(template.templateId));

        return missingTemplates.length === 0
            ? existing
            : this.createMissing(characterId, existing, missingTemplates);
    }

    private async createMissing(
        characterId: string,
        existing: AchievementProgress[],
        missingTemplates: ReturnType<typeof getAllAchievementTemplates>,
    ): Promise<AchievementProgress[]> {
        const created = missingTemplates.map(template => buildAchievementProgress(characterId, template.templateId, template.targetCount, template.rewardGems));
        await this.achievementRepo.batchCreate(created);
        return [...existing, ...created];
    }

    /**
     * Report that `eventType` happened `amount` times for a character —
     * bumps every not-yet-completed achievement whose template matches that
     * event type.
     */
    async incrementProgress(characterId: string, eventType: AchievementType, amount: number): Promise<void> {
        // getOrCreateAll(), not achievementRepo.getAll(): a character that
        // has never opened the achievements screen has no achievementProgress
        // docs yet, so a bare repo read would find nothing to bump and
        // silently drop this progress.
        const achievements = await this.getOrCreateAll(characterId);
        const affected = achievements.filter((achievement) => {
            if (achievement.completed) return false;
            const template = getAchievementTemplate(achievement.templateId);
            return template?.type === eventType;
        });
        if (affected.length === 0) return;

        const batch = this.db.batch();
        affected.forEach((achievement) => {
            const template = getAchievementTemplate(achievement.templateId);
            // PEAK mode: `amount` is this attempt's value (e.g. a run's
            // score, or a stat reading), never summed across attempts — it
            // either clears the threshold on its own or it doesn't (see
            // AchievementProgressMode/AchievementCompare).
            const meetsThreshold = template?.compare === 'LTE'
                ? amount <= achievement.targetCount
                : amount >= achievement.targetCount;
            const currentCount = template?.mode === 'PEAK'
                ? (meetsThreshold ? achievement.targetCount : achievement.currentCount)
                : Math.min(achievement.currentCount + amount, achievement.targetCount);
            batch.update(this.achievementRepo.getAchievementRef(characterId, achievement.templateId), {
                currentCount,
                completed: currentCount >= achievement.targetCount,
                updatedAt: Date.now(),
            });
        });
        await batch.commit();
    }

    async claim(accountId: string, characterId: string, achievementIdValue: string): Promise<{ gemsEarned: number }> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        const docRef = this.db.collection('achievementProgress').doc(achievementIdValue);
        const characterRef = this.db.collection('characters').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const doc = await tx.get(docRef);
            if (!doc.exists) {
                throw new NotFoundError('achievement');
            }
            const achievement = doc.data() as AchievementProgress;
            if (achievement.characterId !== characterId) {
                throw new NotFoundError('achievement');
            }
            if (!achievement.completed) {
                throw new BusinessLogicError('Achievement not completed yet');
            }
            if (achievement.claimed) {
                throw new ConflictError('Achievement already claimed');
            }

            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const currentCharacter = characterDoc.data() as Character;
            const gems = clampCurrency(currentCharacter.gems + achievement.rewardGems);

            tx.update(characterRef, {
                gems, updatedAt: Date.now(),
            });
            tx.update(docRef, {
                claimed: true, claimedAt: Date.now(), updatedAt: Date.now(),
            });

            return { gemsEarned: achievement.rewardGems };
        });
    }
}

function buildAchievementProgress(
    characterId: string, templateId: string, targetCount: number, rewardGems: number,
): AchievementProgress {
    const timestamp = Date.now();
    return {
        achievementId: achievementId(characterId, templateId),
        templateId,
        characterId,
        currentCount: 0,
        targetCount,
        completed: false,
        rewardGems,
        claimed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}
