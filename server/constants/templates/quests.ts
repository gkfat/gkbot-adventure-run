/**
 * Quest templates
 * TODO: Expand with actual quest definitions
 */

import type { QuestTemplate } from '../../../shared/types';
import { QuestType } from '../../../shared/types';

export const QUEST_TEMPLATES: Record<string, QuestTemplate> = {
    'complete_run': {
        templateId: 'complete_run',
        type: QuestType.COMPLETE_RUN,
        name: 'Complete Adventure',
        description: 'Complete 1 adventure run',
        targetCount: 1,
        rewardGold: 50,
        rewardGems: 1,
    },
    'kill_10_enemies': {
        templateId: 'kill_10_enemies',
        type: QuestType.KILL_ENEMIES,
        name: 'Monster Slayer',
        description: 'Kill 10 enemies',
        targetCount: 10,
        rewardGold: 30,
        rewardGems: 0,
    },
    'purchase_item': {
        templateId: 'purchase_item',
        type: QuestType.PURCHASE_SHOP,
        name: 'Shopping Spree',
        description: 'Purchase 1 item from shop',
        targetCount: 1,
        rewardGold: 20,
        rewardGems: 0,
    },
};

/**
 * Get all quest templates as array
 */
export function getAllQuestTemplates(): QuestTemplate[] {
    return Object.values(QUEST_TEMPLATES);
}

/**
 * Get quest template by ID
 */
export function getQuestTemplate(templateId: string): QuestTemplate | undefined {
    return QUEST_TEMPLATES[templateId];
}
