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
 * Shared rarity weight curve for all equipment/potion templates below
 * (N/R/SR/SSR/L = 50/30/15/4/1).
 */
const STANDARD_RARITY_WEIGHTS = {
    [Rarity.N]: 50,
    [Rarity.R]: 30,
    [Rarity.SR]: 15,
    [Rarity.SSR]: 4,
    [Rarity.L]: 1,
};

/**
 * Shared price curve for equipment templates (identical across all EQUIPMENT
 * items so far — a template can override this if it needs to diverge later).
 */
const EQUIPMENT_PRICE_RANGE = {
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
};

/**
 * Shared price curve for potion templates.
 */
const POTION_PRICE_RANGE = {
    [Rarity.N]: {
        gold: {
            min: 20, max: 40,
        },
    },
    [Rarity.R]: {
        gold: {
            min: 60, max: 100,
        },
    },
    [Rarity.SR]: {
        gold: {
            min: 150, max: 250,
        }, gems: {
            min: 5, max: 10,
        },
    },
    [Rarity.SSR]: {
        gems: {
            min: 15, max: 25,
        },
    },
    [Rarity.L]: {
        gems: {
            min: 30, max: 50,
        },
    },
};

/**
 * Item templates
 *
 * Naming/flavor follows `docs/worldview.md`: gear is scavenged from the
 * "裂域" (GK Corp's abandoned facilities) — supply depots, repair bays,
 * research labs — rather than generic fantasy loot. Potion descriptions
 * hint at the player character's undisclosed partial mechanization (drinking
 * "engine oil" to heal) without ever stating it outright.
 */
export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
    // Weapon — RIGHT_HAND
    'salvaged_wrench': {
        templateId: 'salvaged_wrench',
        name: '維修殘骸扳手',
        description: '從維修設施的殘骸堆裡挖出來的重型扳手，握把上還留著上一位使用者的手汗痕跡——那個人後來怎麼了，沒人知道。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
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
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Off-hand — LEFT_HAND
    'riot_shield_scrap': {
        templateId: 'riot_shield_scrap',
        name: '拾荒防爆盾',
        description: '補給設施保全機具的防爆盾牌殘件，邊緣還留著清晰的撞擊凹痕，扛起來卻莫名地順手。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 4, max: 8,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 8, max: 16,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 16, max: 28,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 28, max: 42,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 42, max: 60,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head
    'gkbot_faceplate': {
        templateId: 'gkbot_faceplate',
        name: 'GkBot 頭部殘片',
        description: '拆卸自失控 GkBot 的頭部外殼，戴上的瞬間有種說不出的熟悉感——熟悉到讓人有點不安。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
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
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Body
    'supply_crate_vest': {
        templateId: 'supply_crate_vest',
        name: '補給箱改造護甲',
        description: '拆解自倉儲區自動販賣機外殼焊接而成，內襯還印著一行褪色的 GK 公司標語。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 5, max: 9,
                }, HP: {
                    min: 15, max: 25,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 9, max: 16,
                }, HP: {
                    min: 25, max: 50,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 16, max: 26,
                }, HP: {
                    min: 50, max: 85,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 26, max: 38,
                }, HP: {
                    min: 85, max: 130,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 38, max: 55,
                }, HP: {
                    min: 130, max: 190,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Shoes
    'servo_greaves': {
        templateId: 'servo_greaves',
        name: '伺服關節護脛',
        description: '維修型 GkBot 淘汰下來的腿部伺服機構，接上之後走起路來輕快得不太自然。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 2, max: 4,
                }, actionSpeedMod: {
                    min: -0.05, max: -0.02,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 4, max: 8,
                }, actionSpeedMod: {
                    min: -0.1, max: -0.05,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 8, max: 14,
                }, actionSpeedMod: {
                    min: -0.18, max: -0.1,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 14, max: 20,
                }, actionSpeedMod: {
                    min: -0.28, max: -0.18,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 20, max: 28,
                }, actionSpeedMod: {
                    min: -0.4, max: -0.28,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Ring
    'research_chip_ring': {
        templateId: 'research_chip_ring',
        name: '殘留運算晶片戒',
        description: '研究設施實驗品上拆下的殘留運算晶片，塞進戒指後仍在微弱運轉，戴著它思考時反應快得連自己都嚇一跳。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                actionSpeedMod: {
                    min: -0.04, max: -0.02,
                },
            },
            [Rarity.R]: {
                actionSpeedMod: {
                    min: -0.08, max: -0.04,
                },
            },
            [Rarity.SR]: {
                actionSpeedMod: {
                    min: -0.14, max: -0.08,
                },
            },
            [Rarity.SSR]: {
                actionSpeedMod: {
                    min: -0.22, max: -0.14,
                },
            },
            [Rarity.L]: {
                actionSpeedMod: {
                    min: -0.32, max: -0.22,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Potions (consumable, used at REST nodes)
    'engine_oil_basic': {
        templateId: 'engine_oil_basic',
        name: '機油',
        description: '為什麼喝機油會補血...？但真好喝，咕嚕咕嚕咕嚕。',
        type: ItemType.POTION,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        healPercentRange: {
            [Rarity.N]: {
                min: 15, max: 20,
            },
            [Rarity.R]: {
                min: 25, max: 30,
            },
            [Rarity.SR]: {
                min: 35, max: 40,
            },
            [Rarity.SSR]: {
                min: 40, max: 45,
            },
            [Rarity.L]: {
                min: 45, max: 50,
            },
        },
        priceRangeByRarity: POTION_PRICE_RANGE,
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
