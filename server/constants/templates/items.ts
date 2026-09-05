/**
 * Item templates (equipment/potion static definitions)
 */

import type {
    ItemTemplate, ItemStats, StatRange,
} from '../../../shared/types';
import {
    ItemType, EquipmentSlot, Rarity, WeaponWeightClass,
} from '../../../shared/types';

/**
 * Shared rarity weight curve for all equipment/potion templates below
 * (N/R/SR/SSR/L = 50.89/30.54/15.27/3/0.3).
 */
const STANDARD_RARITY_WEIGHTS = {
    [Rarity.N]: 50.89,
    [Rarity.R]: 30.54,
    [Rarity.SR]: 15.27,
    [Rarity.SSR]: 3,
    [Rarity.L]: 0.3,
};

/**
 * Growth curve for primary/HP stats (ATK/DEF/HP), applied to each template's
 * N-tier baseline to derive R/SR/SSR/L. Kept steep (~2.5-3x per step) so L —
 * now a 0.3% roll — reads as a genuine jackpot rather than a marginal upgrade.
 */
const PRIMARY_STAT_MULTIPLIER: Record<Rarity, number> = {
    [Rarity.N]: 1,
    [Rarity.R]: 2.5,
    [Rarity.SR]: 6,
    [Rarity.SSR]: 15,
    [Rarity.L]: 35,
};

/**
 * Growth curve for percentage-based mods (actionSpeedMod/dodgeChanceMod).
 * These are bounded fractions (e.g. -0.4..0.4), so they use a gentler curve
 * than PRIMARY_STAT_MULTIPLIER to avoid absurd swings (e.g. -900% dodge) at L.
 */
const MOD_STAT_MULTIPLIER: Record<Rarity, number> = {
    [Rarity.N]: 1,
    [Rarity.R]: 1.8,
    [Rarity.SR]: 3,
    [Rarity.SSR]: 4.6,
    [Rarity.L]: 6.5,
};

/** One pool stat key's N-tier baseline range, used as input to `buildStatsRange`. */
type StatBaseline = {
    key: keyof ItemStats;
    base: StatRange;
    /** actionSpeedMod/dodgeChanceMod — scaled by MOD_STAT_MULTIPLIER instead of PRIMARY_STAT_MULTIPLIER. */
    fractional?: boolean;
};

function roundTo(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/**
 * Builds a full N/R/SR/SSR/L `baseStatsRange` pool for one equipment template
 * from its N-tier baseline per stat key, scaling each rarity by the shared
 * growth curves above. Centralizing the curve here keeps every template's
 * relative power ordering intact even when the curve itself is retuned.
 */
function buildStatsRange(
    baselines: StatBaseline[],
): Partial<Record<Rarity, Partial<Record<keyof ItemStats, StatRange>>>> {
    const result: Partial<Record<Rarity, Partial<Record<keyof ItemStats, StatRange>>>> = {};
    for (const rarity of [
        Rarity.N,
        Rarity.R,
        Rarity.SR,
        Rarity.SSR,
        Rarity.L,
    ]) {
        const layer: Partial<Record<keyof ItemStats, StatRange>> = {};
        for (const {
            key, base, fractional, 
        } of baselines) {
            const multiplier = fractional ? MOD_STAT_MULTIPLIER[rarity] : PRIMARY_STAT_MULTIPLIER[rarity];
            layer[key] = fractional
                ? {
                    min: roundTo(base.min * multiplier, 3),
                    max: roundTo(base.max * multiplier, 3),
                }
                : {
                    min: Math.round(base.min * multiplier),
                    max: Math.round(base.max * multiplier),
                };
        }
        result[rarity] = layer;
    }
    return result;
}

/**
 * Weight-class signature mods for actionSpeedMod/dodgeChanceMod, shared across
 * all templates of that class so the tradeoff identity (LIGHT = faster + more
 * evasive, HEAVY = slower + less evasive in exchange for higher ATK/DEF/HP,
 * MEDIUM = mild version of both) stays consistent item to item.
 */
const LIGHT_MODS: StatBaseline[] = [
    {
        key: 'actionSpeedMod', base: {
            min: -0.03, max: -0.015, 
        }, fractional: true,
    }, {
        key: 'dodgeChanceMod', base: {
            min: 0.01, max: 0.02, 
        }, fractional: true,
    },
];
const MEDIUM_MODS: StatBaseline[] = [
    {
        key: 'actionSpeedMod', base: {
            min: -0.015, max: -0.008, 
        }, fractional: true,
    }, {
        key: 'dodgeChanceMod', base: {
            min: 0.005, max: 0.01, 
        }, fractional: true,
    },
];
const HEAVY_MODS: StatBaseline[] = [
    {
        key: 'actionSpeedMod', base: {
            min: 0.03, max: 0.06, 
        }, fractional: true,
    }, {
        key: 'dodgeChanceMod', base: {
            min: -0.03, max: -0.015, 
        }, fractional: true,
    },
];

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
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 5, max: 10, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 15, max: 30, 
                }, 
            },
            ...MEDIUM_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 8, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 12, max: 24, 
                }, 
            },
            ...HEAVY_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 3, max: 6, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 9, max: 18, 
                }, 
            },
            ...MEDIUM_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12, 
                }, 
            },
            ...LIGHT_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 3, max: 6, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 10, max: 20, 
                }, 
            },
            ...MEDIUM_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12, 
                }, 
            },
            ...LIGHT_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 5, max: 9, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 15, max: 25, 
                }, 
            },
            ...HEAVY_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 5, max: 9, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 15, max: 25, 
                }, 
            },
            ...HEAVY_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 3, max: 6, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 12, max: 20, 
                }, 
            },
            ...MEDIUM_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 6, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 12, max: 18, 
                }, 
            },
            ...LIGHT_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 5, max: 7, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 15, max: 21, 
                }, 
            },
            ...LIGHT_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 8, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 12, max: 24, 
                }, 
            },
            ...HEAVY_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 7, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 12, max: 21, 
                }, 
            },
            ...MEDIUM_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 3, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 6, max: 9, 
                }, 
            },
            ...LIGHT_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12, 
                }, 
            },
            ...MEDIUM_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12, 
                }, 
            },
            ...HEAVY_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 3, max: 6, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 9, max: 18, 
                }, 
            },
            ...LIGHT_MODS,
        ]),
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
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 7, max: 14, 
                }, 
            },
            {
                key: 'HP', base: {
                    min: 21, max: 42, 
                }, 
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (LIGHT) — RIGHT_HAND, 虛擬實境設施 (VR training facility)
    'vr_training_bracer': {
        templateId: 'vr_training_bracer',
        name: 'VR 格鬥訓練護腕',
        description: '虛擬訓練場遺留下來的體感護腕，原本用來讓學員在模擬環境裡練習格鬥。訊號早已錯亂閃爍，但戴上去的瞬間，你的拳頭還是照著它給的節奏出手，準得不像自己。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 3, max: 6,
                },
            },
            {
                key: 'HP', base: {
                    min: 9, max: 18,
                },
            },
            ...LIGHT_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head (MEDIUM) — 虛擬實境設施
    'vr_precognition_visor': {
        templateId: 'vr_precognition_visor',
        name: 'VR 預判感知頭盔',
        description: '用來訓練 GkBot 表演反應速度的感知頭盔，鏡面畫面早已亂碼閃爍。奇怪的是，只要戴著它，你總能在對方出手前半拍就先閃開身子。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 3, max: 6,
                },
            },
            {
                key: 'HP', base: {
                    min: 10, max: 20,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Ring (MEDIUM) — 娛樂場所 (entertainment / casino facility)
    'jackpot_token_ring': {
        templateId: 'jackpot_token_ring',
        name: '老虎機代幣戒指',
        description: '拿賭場代幣手工磨成的戒指，邊緣還留著吐幣口的刮痕。你分不清是幸運還是巧合，但戴著它做的每個決定，結果總是比預期好一點。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4,
                },
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Off-hand (LIGHT) — 娛樂場所
    'bartender_grip_gloves': {
        templateId: 'bartender_grip_gloves',
        name: '調酒師工作手套',
        description: '娛樂場所吧台留下的止滑手套，原本用來甩瓶調酒。手感輕巧得誇張，你甚至能單手接住從天花板震落的零件，還不灑出一滴。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4,
                },
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12,
                },
            },
            ...LIGHT_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Body (MEDIUM) — 百貨商場
    'department_store_uniform_vest': {
        templateId: 'department_store_uniform_vest',
        name: '百貨專櫃制服背心',
        description: '百貨公司專櫃人員的制服背心，燙得筆挺，胸口別針還亮著「歡迎光臨」。穿上後你走路的姿態莫名端正，連被打飛時都下意識保持著微笑。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 3, max: 6,
                },
            },
            {
                key: 'HP', base: {
                    min: 12, max: 20,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Shoes (LIGHT) — 百貨商場
    'limited_edition_sneakers': {
        templateId: 'limited_edition_sneakers',
        name: '絕版聯名球鞋',
        description: '百貨商場過期促銷海報上還印著它的原價，鞋盒早被搶購的人潮踩爛。穿上去卻意外地合腳，彷彿它本來就是照著你的腳型做的。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 5, max: 7,
                },
            },
            {
                key: 'HP', base: {
                    min: 15, max: 21,
                },
            },
            ...LIGHT_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (LIGHT) — RIGHT_HAND, 小賣店 (corner convenience store)
    'convenience_store_bat': {
        templateId: 'convenience_store_bat',
        name: '收銀台防身球棒',
        description: '小賣店收銀台底下常備的防身球棒，木頭紋理磨得發亮。掄起來的手感輕得不像話，速度卻快得連自己都嚇一跳。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 3, max: 6,
                },
            },
            {
                key: 'HP', base: {
                    min: 9, max: 18,
                },
            },
            ...LIGHT_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Off-hand (HEAVY) — 研究設施
    'lab_serum_injector_brace': {
        templateId: 'lab_serum_injector_brace',
        name: '實驗藥劑注射護臂',
        description: '研究設施留下的自動注射裝置，原本用來替 GkBot 樣本施打實驗藥劑。針頭早已鏽死不會再刺下來，但護臂內側傳來的微弱震動，讓你的手臂莫名感到踏實。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 8,
                },
            },
            {
                key: 'HP', base: {
                    min: 12, max: 24,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (HEAVY) — RIGHT_HAND, 工廠 (production line, cyberpunk-industrial)
    'quantum_breach_drill_arm': {
        templateId: 'quantum_breach_drill_arm',
        name: '量子鑽掘機械臂',
        description: '從量產線末端拆下的破拆用機械臂，鑽頭上仍殘留著切開裝甲時濺出的火光痕跡。裝上手臂的瞬間，你聽見自己骨頭發出了一聲細微的、金屬般的回應。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 7, max: 14,
                },
            },
            {
                key: 'HP', base: {
                    min: 21, max: 42,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (MEDIUM) — RIGHT_HAND, 研究設施 (cyberpunk neural research)
    'neural_pulse_gauntlet': {
        templateId: 'neural_pulse_gauntlet',
        name: '神經脈衝拳套',
        description: '研究設施用來測試人體神經傳導極限的實驗拳套，指節內建的脈衝發射器早已失控。揮拳的瞬間，你的手臂比訊號燈還快出手。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 5, max: 10,
                },
            },
            {
                key: 'HP', base: {
                    min: 15, max: 30,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Off-hand (MEDIUM) — LEFT_HAND, 虛擬實境設施 (cyberpunk hologram)
    'holo_deflector_shield': {
        templateId: 'holo_deflector_shield',
        name: '全息偏導護盾',
        description: '虛擬實境設施的展示用全息投影裝置，本該只是唬人的光影特效。可是每次舉起它擋下攻擊，你都能真實感覺到那股撞擊力道傳進手臂。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 3, max: 6,
                },
            },
            {
                key: 'HP', base: {
                    min: 9, max: 18,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head (LIGHT) — 研究設施 / 駭客 (cyberpunk neural interface)
    'neural_interface_circlet': {
        templateId: 'neural_interface_circlet',
        name: '神經連結頭環',
        description: '駭進 GK 內網用的神經連結裝置，戴上後太陽穴會傳來規律的電流搏動。奇怪的是，這種感覺讓你莫名安心，彷彿早就習慣了。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4,
                },
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12,
                },
            },
            ...LIGHT_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head (HEAVY) — 末世盜賊團 (cyberpunk military faceguard)
    'tactical_faceguard': {
        templateId: 'tactical_faceguard',
        name: '戰術強化面罩',
        description: '末世盜賊團私兵的制式面罩，內建的紅色瞄準熱顯像早已校正失準。你卻總能透過它精準看出敵人下一步要往哪裡動。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 5, max: 9,
                },
            },
            {
                key: 'HP', base: {
                    min: 15, max: 25,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Body (LIGHT) — 百貨商場 (cyberpunk tech boutique)
    'fiber_optic_bodysuit': {
        templateId: 'fiber_optic_bodysuit',
        name: '光纖強化緊身衣',
        description: '百貨商場科技專櫃的展示品，內建光纖會隨心跳明滅閃爍。穿上後你的心跳莫名穩定得像是被什麼東西同步校正過。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 6,
                },
            },
            {
                key: 'HP', base: {
                    min: 12, max: 18,
                },
            },
            ...LIGHT_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Shoes (MEDIUM) — 工廠 / 物流 (cyberpunk mag-lev)
    'maglev_sprint_boots': {
        templateId: 'maglev_sprint_boots',
        name: '磁浮助跑鞋',
        description: '物流中心搬運機器人使用的磁浮輔助鞋，離地懸浮的瞬間會有微弱電流竄過腳底。你的步伐從此再也沒有踩空過一次。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 7,
                },
            },
            {
                key: 'HP', base: {
                    min: 12, max: 21,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Ring (HEAVY) — 娛樂場所 / 駭客地下經濟 (cyberpunk data chip)
    'hacker_data_ring': {
        templateId: 'hacker_data_ring',
        name: '駭客資料指環',
        description: '投機者圈子裡流通的地下資料指環，內嵌晶片還存著上一個主人沒來得及刪除的帳目。戴上它之後，你總能比對方早一步算出勝算。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4,
                },
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (HEAVY) — RIGHT_HAND, 遊樂園「騎士競技場」表演道具
    'jousting_arena_warhammer': {
        templateId: 'jousting_arena_warhammer',
        name: '競技場巨錘',
        description: '遊樂園「騎士競技場」表演用的巨錘道具，錘頭本體其實是灌鉛的塑膠殼，重量卻扎實得不像道具。掄起來的瞬間，你甚至能感覺到金屬骨架該有的重心。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 7, max: 14,
                },
            },
            {
                key: 'HP', base: {
                    min: 21, max: 42,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Weapon (MEDIUM) — RIGHT_HAND, 遊樂園紀念品店
    'crusader_replica_longsword': {
        templateId: 'crusader_replica_longsword',
        name: '十字軍複製長劍',
        description: '遊樂園紀念品店販售的十字軍長劍複製品，包裝上還印著「純觀賞用，禁止實戰」。可是劍刃劈下去的手感，跟真劍幾乎沒有分別。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'ATK', base: {
                    min: 5, max: 10,
                },
            },
            {
                key: 'HP', base: {
                    min: 15, max: 30,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Off-hand (HEAVY) — LEFT_HAND, 遊樂園「騎士競技場」
    'tournament_kite_shield': {
        templateId: 'tournament_kite_shield',
        name: '競技場鳶形盾',
        description: '騎士競技場開幕典禮用的鳶形盾牌道具，塗裝的紋章早已斑駁脫落。舉起它擋下攻擊的瞬間，你的手臂穩得完全沒有後座力該有的顫抖。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 8,
                },
            },
            {
                key: 'HP', base: {
                    min: 12, max: 24,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Off-hand (MEDIUM) — LEFT_HAND, 遊樂園「騎士競技場」
    'plate_armor_gauntlet': {
        templateId: 'plate_armor_gauntlet',
        name: '板甲護手',
        description: '競技場騎士造型的板甲護手，指節部位刻意做得誇張厚重只為了上鏡好看。實際握拳的觸感卻精準地卡進你的每一根手指關節。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 3, max: 6,
                },
            },
            {
                key: 'HP', base: {
                    min: 9, max: 18,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Head (HEAVY) — 遊樂園「騎士競技場」
    'grand_tournament_helm': {
        templateId: 'grand_tournament_helm',
        name: '大型比武頭盔',
        description: '騎士競技場主持人專用的誇張頭盔，面罩上的鍍金鷹徽已經氧化發黑。戴上後視野變得極窄，你卻莫名能準確聽出敵人腳步落在哪個方向。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 5, max: 9,
                },
            },
            {
                key: 'HP', base: {
                    min: 15, max: 25,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Body (HEAVY) — 工廠（屠宰／裁切產線防護裝備）
    'chainmail_cutting_vest': {
        templateId: 'chainmail_cutting_vest',
        name: '防切割鎖子甲背心',
        description: '屠宰產線工人用來抵禦刀具意外的鏈甲防護背心，一環扣一環的金屬網重得驚人。穿上後你才發現，自己扛著它走路完全不喘。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 5, max: 9,
                },
            },
            {
                key: 'HP', base: {
                    min: 15, max: 25,
                },
            },
            ...HEAVY_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Shoes (MEDIUM) — GK 保全騎警隊
    'mounted_patrol_riding_boots': {
        templateId: 'mounted_patrol_riding_boots',
        name: '騎警巡邏馬靴',
        description: 'GK 保全騎警隊配發的高筒馬靴，馬鞍磨損的痕跡還留在靴身內側。踩上馬鐙的瞬間，你的腳踝穩得像是天生就該站在那裡。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 4, max: 7,
                },
            },
            {
                key: 'HP', base: {
                    min: 12, max: 21,
                },
            },
            ...MEDIUM_MODS,
        ]),
        priceRangeByRarity: EQUIPMENT_PRICE_RANGE,
    },

    // Ring (MEDIUM) — 遊樂園紀念品店
    'knights_order_signet_ring': {
        templateId: 'knights_order_signet_ring',
        name: '騎士團紋章戒指',
        description: '遊樂園紀念品店的鍍金紋章戒指，印花騎士團徽章其實是隨便設計的行銷符號。可是戴著它做出的每個格擋動作，總是精準得像被誰預先設計過。',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarityWeights: STANDARD_RARITY_WEIGHTS,
        baseStatsRange: buildStatsRange([
            {
                key: 'DEF', base: {
                    min: 2, max: 4,
                },
            },
            {
                key: 'HP', base: {
                    min: 6, max: 12,
                },
            },
            ...MEDIUM_MODS,
        ]),
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
