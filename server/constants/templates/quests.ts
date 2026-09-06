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
        name: '完成冒險',
        description: '完成 1 次冒險',
        targetCount: 1,
        rewardGold: 50,
        rewardGems: 0,
    },
    'kill_10_enemies': {
        templateId: 'kill_10_enemies',
        type: QuestType.KILL_ENEMIES,
        name: '怪物殺手',
        description: '擊殺 10 隻敵人',
        targetCount: 10,
        rewardGold: 30,
        rewardGems: 0,
    },
    'purchase_item': {
        templateId: 'purchase_item',
        type: QuestType.PURCHASE_SHOP,
        name: '購物血拼',
        description: '在商店購買 1 次商品',
        targetCount: 1,
        rewardGold: 20,
        rewardGems: 0,
    },
    'daily_login': {
        templateId: 'daily_login',
        type: QuestType.LOGIN,
        name: '每日登入',
        description: '每天登入遊戲一次',
        targetCount: 1,
        rewardGold: 100,
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
