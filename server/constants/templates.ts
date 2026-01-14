/**
 * Game data templates (items, quests, achievements, etc.)
 * These are static definitions loaded into memory
 */

import type {
    ItemTemplate, QuestTemplate, AchievementTemplate, 
} from '../../shared/types';
import {
    ItemType, EquipmentSlot, Rarity, QuestType, AchievementType, 
} from '../../shared/types';

/**
 * Item templates
 * TODO: Expand with actual game items
 */
export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
    // Weapons
    'sword_basic': {
        templateId: 'sword_basic',
        name: 'Basic Sword',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        rarityWeights: {
            [Rarity.N]: 50,
            [Rarity.R]: 30,
            [Rarity.SR]: 15,
            [Rarity.SSR]: 4,
            [Rarity.L]: 1,
        },
        statRanges: {
            [Rarity.N]: {
                ATK: {
                    min: 5, max: 10, 
                }, 
            },
            [Rarity.R]: {
                ATK: {
                    min: 10, max: 20, 
                }, 
            },
            [Rarity.SR]: {
                ATK: {
                    min: 20, max: 35, 
                }, 
            },
            [Rarity.SSR]: {
                ATK: {
                    min: 35, max: 55, 
                }, 
            },
            [Rarity.L]: {
                ATK: {
                    min: 55, max: 80, 
                }, 
            },
        },
        priceRanges: {
            [Rarity.N]: {
                gold: {
                    min: 100, max: 200, 
                }, 
            },
            [Rarity.R]: {
                gold: {
                    min: 300, max: 500, 
                }, 
            },
            [Rarity.SR]: {
                gold: {
                    min: 800, max: 1200, 
                }, gems: {
                    min: 10, max: 20, 
                }, 
            },
            [Rarity.SSR]: {
                gems: {
                    min: 30, max: 50, 
                }, 
            },
            [Rarity.L]: {
                gems: {
                    min: 80, max: 120, 
                }, 
            },
        },
    },
  
    // Armor
    'helmet_basic': {
        templateId: 'helmet_basic',
        name: 'Basic Helmet',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        rarityWeights: {
            [Rarity.N]: 50,
            [Rarity.R]: 30,
            [Rarity.SR]: 15,
            [Rarity.SSR]: 4,
            [Rarity.L]: 1,
        },
        statRanges: {
            [Rarity.N]: {
                DEF: {
                    min: 3, max: 6, 
                }, HP: {
                    min: 10, max: 20, 
                }, 
            },
            [Rarity.R]: {
                DEF: {
                    min: 6, max: 12, 
                }, HP: {
                    min: 20, max: 40, 
                }, 
            },
            [Rarity.SR]: {
                DEF: {
                    min: 12, max: 20, 
                }, HP: {
                    min: 40, max: 70, 
                }, 
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 20, max: 30, 
                }, HP: {
                    min: 70, max: 110, 
                }, 
            },
            [Rarity.L]: {
                DEF: {
                    min: 30, max: 45, 
                }, HP: {
                    min: 110, max: 160, 
                }, 
            },
        },
        priceRanges: {
            [Rarity.N]: {
                gold: {
                    min: 100, max: 200, 
                }, 
            },
            [Rarity.R]: {
                gold: {
                    min: 300, max: 500, 
                }, 
            },
            [Rarity.SR]: {
                gold: {
                    min: 800, max: 1200, 
                }, gems: {
                    min: 10, max: 20, 
                }, 
            },
            [Rarity.SSR]: {
                gems: {
                    min: 30, max: 50, 
                }, 
            },
            [Rarity.L]: {
                gems: {
                    min: 80, max: 120, 
                }, 
            },
        },
    },
};

/**
 * Quest templates
 * TODO: Expand with actual quest definitions
 */
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
 * Achievement templates
 * TODO: Expand with actual achievement definitions
 */
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
 * Get all item templates as array
 */
export function getAllItemTemplates(): ItemTemplate[] {
    return Object.values(ITEM_TEMPLATES);
}

/**
 * Get item template by ID
 */
export function getItemTemplate(templateId: string): ItemTemplate | undefined {
    return ITEM_TEMPLATES[templateId];
}

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
