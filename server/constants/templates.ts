/**
 * Game data templates (items, quests, achievements, etc.)
 * These are static definitions loaded into memory
 */

import type {
    ItemTemplate, QuestTemplate, AchievementTemplate, 
} from '../../shared/types';
import {
    ItemType, EquipmentSlot, Rarity, WeaponWeightClass, QuestType, AchievementType,
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
        name: {
            [Rarity.N]: '防割工作手套',
            [Rarity.R]: '精密維修手套',
            [Rarity.SR]: '電弧絕緣手套',
            [Rarity.SSR]: 'GkBot 維修夾具',
            [Rarity.L]: '應急接線手套',
        },
        description: {
            [Rarity.N]: '普通的厚實工作手套，能抵禦碎金屬與鋒利零件。手指活動起來意外地靈活。',
            [Rarity.R]: '給 GK 精密技師使用的薄型手套，可以放大細微的觸覺反饋。你第一次戴上時，甚至能分辨出牆後齒輪轉動的節奏。',
            [Rarity.SR]: '原本是為高壓設備維修設計的防護手套。手掌內側有一層奇怪的金屬網，摸起來竟然有些溫熱。',
            [Rarity.SSR]: '嚴格來說，這不是給人使用的工具。裝上手腕後卻異常服貼，連接處還會自動調整鬆緊。',
            [Rarity.L]: '能快速連接斷裂電路的緊急維修裝備。說明書提醒使用者「請勿直接接觸自身接口」——你不知道為什麼會特別注意到這句話。',
        },
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
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
        name: {
            [Rarity.N]: '工程護腕',
            [Rarity.R]: '磁吸工具腕帶',
            [Rarity.SR]: '維修端子手套',
            [Rarity.SSR]: '液壓作業護臂',
            [Rarity.L]: '舊式校準手環',
        },
        description: {
            [Rarity.N]: '普通的工程護腕，能減少搬運重物時手腕受到的衝擊。戴上之後，你開始覺得螺絲起子特別順手。',
            [Rarity.R]: '能把小型工具固定在手腕上的實用裝備。奇怪的是，有幾次工具明明掉在地上，卻自己滾回了你的腳邊。',
            [Rarity.SR]: '原本用來接觸裸露電路的絕緣手套。戴上後，你似乎能感覺到附近設備的電流流向。',
            [Rarity.SSR]: '拆自工廠重型機械的輔助護臂。啟動時會發出低沉的嗡鳴聲，你的手臂卻沒有想像中那麼沉。',
            [Rarity.L]: '研究設施裡找到的測試設備。沒有電池、沒有開關，卻總能在你需要的時候亮起來。',
        },
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 4, max: 8,
                }, actionSpeedMod: {
                    min: 0.05, max: 0.1,
                }, dodgeChanceMod: {
                    min: -0.03, max: -0.015,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 8, max: 16,
                }, actionSpeedMod: {
                    min: 0.1, max: 0.18,
                }, dodgeChanceMod: {
                    min: -0.05, max: -0.03,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 16, max: 28,
                }, actionSpeedMod: {
                    min: 0.18, max: 0.28,
                }, dodgeChanceMod: {
                    min: -0.08, max: -0.05,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 28, max: 42,
                }, actionSpeedMod: {
                    min: 0.28, max: 0.4,
                }, dodgeChanceMod: {
                    min: -0.12, max: -0.08,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 42, max: 60,
                }, actionSpeedMod: {
                    min: 0.4, max: 0.55,
                }, dodgeChanceMod: {
                    min: -0.16, max: -0.12,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head
    'gkbot_faceplate': {
        templateId: 'gkbot_faceplate',
        name: {
            [Rarity.N]: 'GkBot 的頭部零件',
            [Rarity.R]: '維修技師護目鏡',
            [Rarity.SR]: '破損的技術人員校準頭盔',
            [Rarity.SSR]: '退役保全頭盔',
            [Rarity.L]: '黑色訊號罩',
        },
        description: {
            [Rarity.N]: '從 GKBot 施工型機器人頭部拆解下來的零部件。不曉得為什麼，好像有些卡榫能夠對到頭部的某些輪廓。',
            [Rarity.R]: '用來檢查精密零件的護目鏡。戴上它之後，總能第一時間看出哪一台機器「快壞了」。',
            [Rarity.SR]: '研究設施裡找到的實驗型頭盔，標籤寫著「僅供校準用途」。戴上後，視野角落偶爾會閃過一些看不懂的數字。',
            [Rarity.SSR]: '厚重得不像是給人戴的，內側還留著前任保全的名字。',
            [Rarity.L]: '由不明材質製成的薄型頭罩，能降低周遭的電子干擾。戴久了以後，摘下來反而讓你覺得四周太吵。',
        },
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
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
        name: {
            [Rarity.N]: '工程防護背心',
            [Rarity.R]: '防爆維修外套',
            [Rarity.SR]: '實驗室隔離衣',
            [Rarity.SSR]: 'GkBot 搬運工背甲',
            [Rarity.L]: '緊急維生外套',
        },
        description: {
            [Rarity.N]: '維修人員的標準裝備，口袋多得離譜。穿上後，搬零件、爬管線、鑽維修孔都變得順手許多。',
            [Rarity.R]: '厚重的耐熱外套，原本是給工廠技師使用的。',
            [Rarity.SR]: '研究設施裡留下的防護服。材質柔軟得不像防護裝備，胸口卻偶爾會傳來細微的震動。',
            [Rarity.SSR]: '從大型搬運機器上拆下來的防撞裝甲。正常人穿著它大概只能慢慢走，但你似乎很快就習慣了它的重量。',
            [Rarity.L]: '設計給長時間困在廢棄設施裡的維修人員使用，內建保溫、濾氣與簡易供能模組。你不確定最後一項功能是做什麼的，但它好像確實有在運作。',
        },
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 5, max: 9,
                }, HP: {
                    min: 15, max: 25,
                }, actionSpeedMod: {
                    min: 0.04, max: 0.08,
                }, dodgeChanceMod: {
                    min: -0.02, max: -0.01,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 9, max: 16,
                }, HP: {
                    min: 25, max: 50,
                }, actionSpeedMod: {
                    min: 0.08, max: 0.14,
                }, dodgeChanceMod: {
                    min: -0.04, max: -0.02,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 16, max: 26,
                }, HP: {
                    min: 50, max: 85,
                }, actionSpeedMod: {
                    min: 0.14, max: 0.22,
                }, dodgeChanceMod: {
                    min: -0.07, max: -0.04,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 26, max: 38,
                }, HP: {
                    min: 85, max: 130,
                }, actionSpeedMod: {
                    min: 0.22, max: 0.32,
                }, dodgeChanceMod: {
                    min: -0.1, max: -0.07,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 38, max: 55,
                }, HP: {
                    min: 130, max: 190,
                }, actionSpeedMod: {
                    min: 0.32, max: 0.45,
                }, dodgeChanceMod: {
                    min: -0.14, max: -0.1,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Shoes
    'servo_greaves': {
        templateId: 'servo_greaves',
        name: {
            [Rarity.N]: '工程安全靴',
            [Rarity.R]: '維修通道靴',
            [Rarity.SR]: '靜音工作鞋',
            [Rarity.SSR]: '磁力作業靴',
            [Rarity.L]: '回收型動力靴',
        },
        description: {
            [Rarity.N]: '鋼頭、防穿刺、防滑，標準的 GK 工程人員安全靴。鞋底磨損嚴重，卻比你找到的大多數新鞋都好走。',
            [Rarity.R]: '專門給需要長時間走在金屬管線上的技師使用。鞋底能牢牢抓住濕滑鋼板，讓你走過垂直維修梯時也異常穩。',
            [Rarity.SR]: '娛樂設施的維修人員使用的特殊鞋款，幾乎不會發出腳步聲。穿上後，你甚至開始嫌普通鞋走路太吵。',
            [Rarity.SSR]: '工廠高空維修用的磁吸靴。啟動後能牢牢吸住金屬地面，但你有時會忘記自己其實還沒有開啟它。',
            [Rarity.L]: '從某台報廢 GkBot 身上拆下來的實驗裝備。每走一步都會回收少量動能，鞋底偶爾傳來細微的機械聲。',
        },
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                actionSpeedMod: {
                    min: -0.05, max: -0.02,
                },
            },
            [Rarity.R]: {
                actionSpeedMod: {
                    min: -0.1, max: -0.05,
                },
            },
            [Rarity.SR]: {
                actionSpeedMod: {
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
        name: {
            [Rarity.N]: 'GK 員工識別環',
            [Rarity.R]: '備用記憶環',
            [Rarity.SR]: '微型磁力環',
            [Rarity.SSR]: '實驗型同步環',
            [Rarity.L]: '無標記黑環',
        },
        description: {
            [Rarity.N]: '不知道是哪個年代的員工識別裝置。晶片早已失效，但某些廢棄設施的門禁看見它時，偶爾還是會亮一下綠燈。',
            [Rarity.R]: '原本用來保存少量工作資料的可攜式儲存裝置。裡面的資料全毀了，只有一個檔案一直無法刪除。',
            [Rarity.SR]: '簡單的工業用磁力裝置。靠近散落零件時會微微發熱，偶爾還會讓附近的小螺絲自己滾過來。',
            [Rarity.SSR]: '研究設施中的未完成實驗品。戴上後，你會偶爾在機器啟動前就知道它準備做什麼。',
            [Rarity.L]: '沒有品牌、沒有序號，也找不到任何製造紀錄。它戴起來很舒服，舒服得讓你不太想把它拿下來。',
        },
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        weaponWeightClass: WeaponWeightClass.LIGHT,
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
                DEF: {
                    min: 6, max: 10,
                }, actionSpeedMod: {
                    min: -0.22, max: -0.14,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 10, max: 16,
                }, actionSpeedMod: {
                    min: -0.32, max: -0.22,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (LIGHT) — RIGHT_HAND, the 冒險家 starter weapon (character-starter-loadout)
    'scrap_daggers': {
        templateId: 'scrap_daggers',
        name: {
            [Rarity.N]: '拆信刀',
            [Rarity.R]: '精密裁切刀',
            [Rarity.SR]: '維修用手術刀',
            [Rarity.SSR]: 'GkBot 微型刀刃',
            [Rarity.L]: '無聲切割器',
        },
        description: {
            [Rarity.N]: '辦公室裡隨處可見的拆信刀，刀刃單薄卻異常鋒利。你發現自己揮動它的速度，比想像中快上不少。',
            [Rarity.R]: '技師用來裁切薄板與電纜外皮的精密刀具。輕巧得幾乎感覺不到重量，動作卻精準得嚇人。',
            [Rarity.SR]: '手術等級的維修用刀，原本用來處理最細微的線路。握著它時，你的手總是比腦子更快做出反應。',
            [Rarity.SSR]: '從報廢 GkBot 身上拆下的微型刀刃模組，輕得不像金屬。你甚至懷疑它其實比你的手還要敏捷。',
            [Rarity.L]: '幾乎沒有實體回饋的切割器，出手時沒有聲音、沒有阻力。你不確定自己是在使用它，還是它在借用你的手。',
        },
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                ATK: {
                    min: 3, max: 6,
                }, actionSpeedMod: {
                    min: -0.05, max: -0.02,
                },
            },
            [Rarity.R]: {
                ATK: {
                    min: 6, max: 12,
                }, actionSpeedMod: {
                    min: -0.1, max: -0.05,
                },
            },
            [Rarity.SR]: {
                ATK: {
                    min: 12, max: 20,
                }, actionSpeedMod: {
                    min: -0.18, max: -0.1,
                },
            },
            [Rarity.SSR]: {
                ATK: {
                    min: 20, max: 30,
                }, actionSpeedMod: {
                    min: -0.28, max: -0.18,
                },
            },
            [Rarity.L]: {
                ATK: {
                    min: 30, max: 42,
                }, actionSpeedMod: {
                    min: -0.4, max: -0.28,
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
