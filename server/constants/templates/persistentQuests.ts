/**
 * Persistent quest templates — same content orientation as daily quests
 * (game-progress: complete runs, kill enemies, purchase from shop, earn
 * gold…) but with higher, escalating thresholds and no reset; each is
 * claimable once per character (lifetime), same as achievements.
 * templateId namespace is kept separate from QUEST_TEMPLATES (daily) and
 * ACHIEVEMENT_TEMPLATES so the three pools never collide even when they
 * cover the same QuestType/AchievementType.
 *
 * Gems are kept low (mostly 0, capped at 2 for the top tier of each track)
 * — persistent quests are a gold-focused, cumulative grind, not a gem
 * source; see openspec/changes/quests-and-achievements/design.md.
 */

import type { QuestTemplate } from '../../../shared/types';
import { QuestType } from '../../../shared/types';

export const PERSISTENT_QUEST_TEMPLATES: Record<string, QuestTemplate> = {
    // COMPLETE_RUN track
    'complete_20_runs': {
        templateId: 'complete_20_runs',
        type: QuestType.COMPLETE_RUN,
        name: '熟練冒險者',
        description: '累計完成 20 次冒險',
        targetCount: 20,
        rewardGold: 200,
        rewardGems: 0,
    },
    'complete_50_runs': {
        templateId: 'complete_50_runs',
        type: QuestType.COMPLETE_RUN,
        name: '資深冒險者',
        description: '累計完成 50 次冒險',
        targetCount: 50,
        rewardGold: 500,
        rewardGems: 0,
    },
    'complete_100_runs': {
        templateId: 'complete_100_runs',
        type: QuestType.COMPLETE_RUN,
        name: '冒險大師',
        description: '累計完成 100 次冒險',
        targetCount: 100,
        rewardGold: 1000,
        rewardGems: 1,
    },
    'complete_200_runs': {
        templateId: 'complete_200_runs',
        type: QuestType.COMPLETE_RUN,
        name: '傳奇冒險者',
        description: '累計完成 200 次冒險',
        targetCount: 200,
        rewardGold: 2000,
        rewardGems: 1,
    },
    'complete_300_runs': {
        templateId: 'complete_300_runs',
        type: QuestType.COMPLETE_RUN,
        name: '冒險之神',
        description: '累計完成 300 次冒險',
        targetCount: 300,
        rewardGold: 3000,
        rewardGems: 2,
    },

    // KILL_ENEMIES track
    'kill_200_enemies': {
        templateId: 'kill_200_enemies',
        type: QuestType.KILL_ENEMIES,
        name: '清道夫',
        description: '累計擊殺 200 隻敵人',
        targetCount: 200,
        rewardGold: 150,
        rewardGems: 0,
    },
    'kill_500_enemies': {
        templateId: 'kill_500_enemies',
        type: QuestType.KILL_ENEMIES,
        name: '滅絕者',
        description: '累計擊殺 500 隻敵人',
        targetCount: 500,
        rewardGold: 300,
        rewardGems: 0,
    },
    'kill_1000_enemies': {
        templateId: 'kill_1000_enemies',
        type: QuestType.KILL_ENEMIES,
        name: '殺戮機器',
        description: '累計擊殺 1,000 隻敵人',
        targetCount: 1000,
        rewardGold: 600,
        rewardGems: 1,
    },
    'kill_2000_enemies': {
        templateId: 'kill_2000_enemies',
        type: QuestType.KILL_ENEMIES,
        name: '戰爭機器',
        description: '累計擊殺 2,000 隻敵人',
        targetCount: 2000,
        rewardGold: 1200,
        rewardGems: 1,
    },
    'kill_3000_enemies': {
        templateId: 'kill_3000_enemies',
        type: QuestType.KILL_ENEMIES,
        name: '終焉獵手',
        description: '累計擊殺 3,000 隻敵人',
        targetCount: 3000,
        rewardGold: 1800,
        rewardGems: 2,
    },

    // PURCHASE_SHOP track
    'purchase_10_items': {
        templateId: 'purchase_10_items',
        type: QuestType.PURCHASE_SHOP,
        name: '小資買家',
        description: '累計在商店購買 10 次商品',
        targetCount: 10,
        rewardGold: 80,
        rewardGems: 0,
    },
    'purchase_20_items': {
        templateId: 'purchase_20_items',
        type: QuestType.PURCHASE_SHOP,
        name: '常客',
        description: '累計在商店購買 20 次商品',
        targetCount: 20,
        rewardGold: 200,
        rewardGems: 0,
    },
    'purchase_50_items': {
        templateId: 'purchase_50_items',
        type: QuestType.PURCHASE_SHOP,
        name: 'VIP 貴賓',
        description: '累計在商店購買 50 次商品',
        targetCount: 50,
        rewardGold: 500,
        rewardGems: 0,
    },
    'purchase_100_items': {
        templateId: 'purchase_100_items',
        type: QuestType.PURCHASE_SHOP,
        name: '購物狂',
        description: '累計在商店購買 100 次商品',
        targetCount: 100,
        rewardGold: 1000,
        rewardGems: 1,
    },
    'purchase_150_items': {
        templateId: 'purchase_150_items',
        type: QuestType.PURCHASE_SHOP,
        name: '商店贊助人',
        description: '累計在商店購買 150 次商品',
        targetCount: 150,
        rewardGold: 1500,
        rewardGems: 1,
    },

    // EARN_GOLD track
    'earn_5000_gold': {
        templateId: 'earn_5000_gold',
        type: QuestType.EARN_GOLD,
        name: '小額致富',
        description: '累計於冒險中獲得 5,000 枚金幣',
        targetCount: 5000,
        rewardGold: 300,
        rewardGems: 0,
    },
    'earn_10000_gold': {
        templateId: 'earn_10000_gold',
        type: QuestType.EARN_GOLD,
        name: '資本累積',
        description: '累計於冒險中獲得 10,000 枚金幣',
        targetCount: 10000,
        rewardGold: 600,
        rewardGems: 0,
    },
    'earn_20000_gold': {
        templateId: 'earn_20000_gold',
        type: QuestType.EARN_GOLD,
        name: '拾荒鉅子',
        description: '累計於冒險中獲得 20,000 枚金幣',
        targetCount: 20000,
        rewardGold: 1200,
        rewardGems: 1,
    },
    'earn_50000_gold': {
        templateId: 'earn_50000_gold',
        type: QuestType.EARN_GOLD,
        name: '廢土首富',
        description: '累計於冒險中獲得 50,000 枚金幣',
        targetCount: 50000,
        rewardGold: 3000,
        rewardGems: 1,
    },
    'earn_100000_gold': {
        templateId: 'earn_100000_gold',
        type: QuestType.EARN_GOLD,
        name: '末世巨賈',
        description: '累計於冒險中獲得 100,000 枚金幣',
        targetCount: 100000,
        rewardGold: 6000,
        rewardGems: 2,
    },
};

/**
 * Get all persistent quest templates as array
 */
export function getAllPersistentQuestTemplates(): QuestTemplate[] {
    return Object.values(PERSISTENT_QUEST_TEMPLATES);
}

/**
 * Get persistent quest template by ID
 */
export function getPersistentQuestTemplate(templateId: string): QuestTemplate | undefined {
    return PERSISTENT_QUEST_TEMPLATES[templateId];
}
