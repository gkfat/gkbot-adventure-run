/**
 * Item templates (equipment/potion static definitions)
 */

import type { ItemTemplate } from '../../../shared/types';
import {
    ItemType, EquipmentSlot, Rarity, WeaponWeightClass,
} from '../../../shared/types';

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
        // Not used for shop purchase (gold shop caps at SR) — only for
        // ItemService.getSellPriceGold(), since selling always pays gold
        // regardless of the item's own buy-price currency.
        gold: {
            min: 1000, max: 1500,
        },
    },
    [Rarity.L]: {
        gems: {
            min: 80, max: 120,
        },
        gold: {
            min: 2500, max: 3500,
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
        // See EQUIPMENT_PRICE_RANGE's SSR/L comment — sell-only.
        gold: {
            min: 500, max: 750,
        },
    },
    [Rarity.L]: {
        gems: {
            min: 30, max: 50,
        },
        gold: {
            min: 1200, max: 1800,
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
        name: '維修工作手套',
        description: '從裂域維修站翻出的耐磨工作手套，能抵禦碎金屬與鋒利零件。戴上之後，手指活動起來意外地靈活，彷彿手本來就該這樣動。',
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
        name: '工程維修護腕',
        description: '能把小型工具固定在腕上、減少搬運重物衝擊的實用裝備。戴上之後，你總能準確感覺到附近設備的細微震動。',
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

    // Off-hand (LIGHT) — LEFT_HAND
    'hydraulic_arm_guard': {
        templateId: 'hydraulic_arm_guard',
        name: '液壓作業護臂',
        description: '拆自工廠重型機械的輔助護臂。啟動時會發出低沉的嗡鳴聲，你的手臂卻沒有想像中那麼沉。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 3, max: 6,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 6, max: 12,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 12, max: 20,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 20, max: 30,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 30, max: 42,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Off-hand (LIGHT) — LEFT_HAND
    'maintenance_terminal_gloves': {
        templateId: 'maintenance_terminal_gloves',
        name: '維修端子手套',
        description: '原本用來接觸裸露電路的絕緣手套。戴上後，你似乎能感覺到附近設備的電流流向。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
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
                    min: 5, max: 8,
                }, actionSpeedMod: {
                    min: -0.22, max: -0.14,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 8, max: 13,
                }, actionSpeedMod: {
                    min: -0.32, max: -0.22,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head
    'gkbot_faceplate': {
        templateId: 'gkbot_faceplate',
        name: 'GkBot 頭部零件',
        description: '從施工型機器人頭部拆解下來的零部件。不曉得為什麼，卡榫奇異地貼合你的頭型，戴上後總能第一時間看出哪一台機器「快壞了」。',
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

    // Head (LIGHT)
    'tech_goggles': {
        templateId: 'tech_goggles',
        name: '維修技師護目鏡',
        description: '用來檢查精密零件的護目鏡。戴上它之後，總能第一時間看出哪一台機器「快壞了」。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
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
                    min: 5, max: 8,
                }, actionSpeedMod: {
                    min: -0.22, max: -0.14,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 8, max: 13,
                }, actionSpeedMod: {
                    min: -0.32, max: -0.22,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head (HEAVY)
    'veteran_security_helmet': {
        templateId: 'veteran_security_helmet',
        name: '退役保全頭盔',
        description: '厚重得不像是給人戴的，內側還留著前任保全的名字。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
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

    // Body
    'supply_crate_vest': {
        templateId: 'supply_crate_vest',
        name: '工程防護背心',
        description: '裂域維修人員的標準裝備，口袋多得離譜。穿上後，搬零件、爬管線、鑽維修孔都變得順手許多。',
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

    // Body (MEDIUM)
    'cargo_bot_plate': {
        templateId: 'cargo_bot_plate',
        name: 'GkBot 搬運工背甲',
        description: '從大型搬運機器上拆下來的防撞裝甲。正常人穿著它大概只能慢慢走，但你似乎很快就習慣了它的重量。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 3, max: 6,
                }, HP: {
                    min: 12, max: 20,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 6, max: 12,
                }, HP: {
                    min: 20, max: 38,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 12, max: 20,
                }, HP: {
                    min: 38, max: 65,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 20, max: 30,
                }, HP: {
                    min: 65, max: 100,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 30, max: 42,
                }, HP: {
                    min: 100, max: 145,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Body (LIGHT)
    'lab_isolation_suit': {
        templateId: 'lab_isolation_suit',
        name: '實驗室隔離衣',
        description: '研究設施裡留下的防護服。材質柔軟得不像防護裝備，胸口卻偶爾會傳來細微的震動。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
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
                    min: 12, max: 18,
                }, HP: {
                    min: 40, max: 65,
                }, actionSpeedMod: {
                    min: -0.28, max: -0.18,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 18, max: 25,
                }, HP: {
                    min: 65, max: 95,
                }, actionSpeedMod: {
                    min: -0.4, max: -0.28,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Shoes
    'servo_greaves': {
        templateId: 'servo_greaves',
        name: '工程安全靴',
        description: '鋼頭、防穿刺、防滑，標準的 GK 工程人員安全靴。鞋底磨損嚴重，卻比你找到的大多數新鞋都好走，走在金屬管線上也異常穩。',
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

    // Shoes (HEAVY)
    'magnetic_work_boots': {
        templateId: 'magnetic_work_boots',
        name: '磁力作業靴',
        description: '工廠高空維修用的磁吸靴。啟動後能牢牢吸住金屬地面，但你有時會忘記自己其實還沒有開啟它。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
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

    // Shoes (MEDIUM)
    'catwalk_maintenance_boots': {
        templateId: 'catwalk_maintenance_boots',
        name: '維修通道靴',
        description: '專門給需要長時間走在金屬管線上的技師使用。鞋底能牢牢抓住濕滑鋼板，讓你走過垂直維修梯時也異常穩。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 4, max: 7,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 7, max: 13,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 13, max: 22,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 22, max: 32,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 32, max: 45,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Ring
    'research_chip_ring': {
        templateId: 'research_chip_ring',
        name: 'GK 員工識別環',
        description: '不知道是哪個年代的員工識別裝置。晶片早已失效，但某些廢棄設施的門禁看見它時，偶爾還是會亮一下綠燈。',
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

    // Ring (MEDIUM)
    'micro_magnet_ring': {
        templateId: 'micro_magnet_ring',
        name: '微型磁力環',
        description: '簡單的工業用磁力裝置。靠近散落零件時會微微發熱，偶爾還會讓附近的小螺絲自己滾過來。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 2, max: 4,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 4, max: 8,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 8, max: 14,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 14, max: 20,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 20, max: 28,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Ring (HEAVY)
    'fallen_survivor_wedding_ring': {
        templateId: 'fallen_survivor_wedding_ring',
        name: '陣亡倖存者的婚戒',
        description: '從某個被搶劫殺害的倖存者身上取下的戒指，內側刻著一個名字和一個日期。你猜不出那個人是死於 GkBot，還是死於搶走這枚戒指的人手上。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                DEF: {
                    min: 2, max: 4,
                }, actionSpeedMod: {
                    min: 0.03, max: 0.06,
                }, dodgeChanceMod: {
                    min: -0.02, max: -0.01,
                },
            },
            [Rarity.R]: {
                DEF: {
                    min: 4, max: 8,
                }, actionSpeedMod: {
                    min: 0.06, max: 0.11,
                }, dodgeChanceMod: {
                    min: -0.035, max: -0.02,
                },
            },
            [Rarity.SR]: {
                DEF: {
                    min: 8, max: 14,
                }, actionSpeedMod: {
                    min: 0.11, max: 0.18,
                }, dodgeChanceMod: {
                    min: -0.06, max: -0.035,
                },
            },
            [Rarity.SSR]: {
                DEF: {
                    min: 14, max: 20,
                }, actionSpeedMod: {
                    min: 0.18, max: 0.26,
                }, dodgeChanceMod: {
                    min: -0.09, max: -0.06,
                },
            },
            [Rarity.L]: {
                DEF: {
                    min: 20, max: 28,
                }, actionSpeedMod: {
                    min: 0.26, max: 0.36,
                }, dodgeChanceMod: {
                    min: -0.12, max: -0.09,
                },
            },
        },
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (LIGHT) — RIGHT_HAND, the 冒險家 starter weapon (character-starter-loadout)
    'scrap_daggers': {
        templateId: 'scrap_daggers',
        name: '拆信刀',
        description: '辦公室裡隨處可見的拆信刀，刀刃單薄卻異常鋒利。握著它時，你的手總是比腦子更快做出反應。',
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

    // Weapon (HEAVY) — RIGHT_HAND
    'raider_commander_gauntlet': {
        templateId: 'raider_commander_gauntlet',
        name: '佔領軍指揮官護手',
        description: '擊敗某支武裝勢力的頭目後拿到的護手，握把處還留著別人的掌紋。你戴上去的瞬間，握感竟然比自己原本的手套還合。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: {
            [Rarity.N]: {
                ATK: {
                    min: 7, max: 14,
                }, actionSpeedMod: {
                    min: 0.05, max: 0.1,
                }, dodgeChanceMod: {
                    min: -0.03, max: -0.015,
                },
            },
            [Rarity.R]: {
                ATK: {
                    min: 14, max: 26,
                }, actionSpeedMod: {
                    min: 0.1, max: 0.18,
                }, dodgeChanceMod: {
                    min: -0.05, max: -0.03,
                },
            },
            [Rarity.SR]: {
                ATK: {
                    min: 26, max: 45,
                }, actionSpeedMod: {
                    min: 0.18, max: 0.28,
                }, dodgeChanceMod: {
                    min: -0.08, max: -0.05,
                },
            },
            [Rarity.SSR]: {
                ATK: {
                    min: 45, max: 70,
                }, actionSpeedMod: {
                    min: 0.28, max: 0.4,
                }, dodgeChanceMod: {
                    min: -0.12, max: -0.08,
                },
            },
            [Rarity.L]: {
                ATK: {
                    min: 70, max: 100,
                }, actionSpeedMod: {
                    min: 0.4, max: 0.55,
                }, dodgeChanceMod: {
                    min: -0.16, max: -0.12,
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
