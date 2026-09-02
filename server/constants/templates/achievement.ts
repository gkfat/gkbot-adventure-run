/**
 * Achievement templates
 * TODO: Expand with actual achievement definitions
 */

import type { AchievementTemplate } from '../../../shared/types';
import { AchievementType } from '../../../shared/types';

export const ACHIEVEMENT_TEMPLATES: Record<string, AchievementTemplate> = {
    'first_blood': {
        templateId: 'first_blood',
        type: AchievementType.TOTAL_KILLS,
        name: 'First Blood',
        description: 'Kill your first enemy',
        targetCount: 1,
        rewardGems: 3,
    },
    'monster_hunter': {
        templateId: 'monster_hunter',
        type: AchievementType.TOTAL_KILLS,
        name: 'Monster Hunter',
        description: 'Kill 100 enemies',
        targetCount: 100,
        rewardGems: 5,
    },
    'adventurer': {
        templateId: 'adventurer',
        type: AchievementType.TOTAL_RUNS,
        name: 'Adventurer',
        description: 'Complete 10 adventure runs',
        targetCount: 10,
        rewardGems: 5,
    },
    'high_score': {
        templateId: 'high_score',
        type: AchievementType.MAX_SCORE,
        name: 'High Scorer',
        description: 'Reach 10,000 score in a single run',
        targetCount: 10000,
        rewardGems: 5,
    },
};

/**
 * Get all achievement templates as array
 */
export function getAllAchievementTemplates(): AchievementTemplate[] {
    return Object.values(ACHIEVEMENT_TEMPLATES);
}

/**
 * Get achievement template by ID
 */
export function getAchievementTemplate(templateId: string): AchievementTemplate | undefined {
    return ACHIEVEMENT_TEMPLATES[templateId];
}
