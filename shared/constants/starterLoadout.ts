/**
 * Starter loadout granted to every newly created character
 * (character-starter-loadout): two N-rarity equipment pieces (both
 * equipped) and one N-rarity potion (left in the permanent inventory). The
 * equipment pieces are themed per archetype (weapon/armor-by-class):
 * fighter gets a HEAVY off-hand + BODY armor, adventurer a LIGHT weapon +
 * SHOES, scholar a MEDIUM armor + LIGHT off-hand, tinkerer a MEDIUM weapon +
 * MEDIUM off-hand, gambler an attack-speed ring + HEAD gear.
 * The potion is the same for every archetype.
 */

import {
    EquipmentSlot, Rarity, WeaponWeightClass,
} from '../types/common';
import { ItemType } from '../types/item';

export const STARTER_POTION_TEMPLATE_ID = 'engine_oil_basic';

export const DEFAULT_STARTER_EQUIPMENT_TEMPLATE_IDS: readonly string[] = ['salvaged_wrench', 'hydraulic_arm_guard'];

/**
 * archetypeId -> starter equipment templateIds (2 pieces, each in a
 * different equip slot). Falls back to
 * DEFAULT_STARTER_EQUIPMENT_TEMPLATE_IDS for any archetype without an
 * explicit entry (e.g. a newly added archetype not yet themed here).
 */
export const STARTER_EQUIPMENT_TEMPLATE_IDS_BY_ARCHETYPE: Record<string, readonly string[]> = {
    fighter: ['riot_shield_scrap', 'supply_crate_vest'], // 重型武器 + 重型防具
    adventurer: ['scrap_daggers', 'servo_greaves'], // 輕型武器 + 輕型鞋類
    scholar: ['gkbot_faceplate', 'maintenance_terminal_gloves'], // 中等防具 + 輕型武器
    tinkerer: ['salvaged_wrench', 'hydraulic_arm_guard'], // 中等武器 + 中等副手
    gambler: ['research_chip_ring', 'tech_goggles'], // 加攻速飾品 + 輕型頭部裝備
};

export function getStarterEquipmentTemplateIds(archetypeId: string): readonly string[] {
    return STARTER_EQUIPMENT_TEMPLATE_IDS_BY_ARCHETYPE[archetypeId] ?? DEFAULT_STARTER_EQUIPMENT_TEMPLATE_IDS;
}

export type StarterLoadoutItemPreview = {
  templateId: string;
  type: ItemType;
  equipSlot?: EquipmentSlot;
  weaponWeightClass?: WeaponWeightClass;
  rarity: Rarity;
  name: string;
  description: string;
  // Preview of the N-tier stat pool as ranges (mirrors describeItem()'s
  // per-row effect breakdown) — a real roll only picks a random subset of
  // these, so this shows what's POSSIBLE, not a guaranteed exact roll.
  effects: { label: string; value: string; positive: boolean }[];
  // Empty — resolvePixelIcon()/equipmentDisplay's ItemLike shape only needs
  // this field to exist, not populated; the preview's stat readout is
  // effects above, not this.
  stats: Record<string, never>;
};

/**
 * N-rarity preview text for every possible starter equipment template.
 * Mirrors the N-rarity name/description/stats baked into
 * `server/constants/templates.ts`'s ITEM_TEMPLATES for these template ids —
 * kept here (rather than derived from ITEM_TEMPLATES) so the
 * archetype-selection screen can show it without a server round trip;
 * update both places together if the N-rarity text/numbers ever change.
 */
// Weight-class signature mod previews (actionSpeedMod/dodgeChanceMod), shared
// across templates of the same class — mirrors LIGHT_MODS/MEDIUM_MODS/
// HEAVY_MODS in server/constants/templates/items.ts.
const LIGHT_MOD_EFFECTS = [
    {
        label: '攻擊間隔', value: '-0.03~-0.015s', positive: true,
    }, {
        label: '閃避率', value: '+1.0~2.0%', positive: true,
    },
];
const MEDIUM_MOD_EFFECTS = [
    {
        label: '攻擊間隔', value: '-0.015~-0.008s', positive: true,
    }, {
        label: '閃避率', value: '+0.5~1.0%', positive: true,
    },
];
const HEAVY_MOD_EFFECTS = [
    {
        label: '攻擊間隔', value: '+0.03~0.06s', positive: false,
    }, {
        label: '閃避率', value: '-3.0~-1.5%', positive: false,
    },
];

const STARTER_EQUIPMENT_PREVIEW: Record<string, StarterLoadoutItemPreview> = {
    riot_shield_scrap: {
        templateId: 'riot_shield_scrap',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarity: Rarity.N,
        name: '工程護腕',
        description: '普通的工程護腕，能減少搬運重物時手腕受到的衝擊。戴上之後，你開始覺得螺絲起子特別順手。',
        effects: [
            {
                label: '防禦力', value: '+4~8', positive: true, 
            },
            {
                label: '生命上限', value: '+12~24', positive: true, 
            },
            ...HEAVY_MOD_EFFECTS,
        ],
        stats: {},
    },
    scrap_daggers: {
        templateId: 'scrap_daggers',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarity: Rarity.N,
        name: '拆信刀',
        description: '辦公室裡隨處可見的拆信刀，刀刃單薄卻異常鋒利。你發現自己揮動它的速度，比想像中快上不少。',
        effects: [
            {
                label: '攻擊力', value: '+3~6', positive: true, 
            },
            {
                label: '生命上限', value: '+9~18', positive: true, 
            },
            ...LIGHT_MOD_EFFECTS,
        ],
        stats: {},
    },
    gkbot_faceplate: {
        templateId: 'gkbot_faceplate',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarity: Rarity.N,
        name: 'GkBot 的頭部零件',
        description: '從 GKBot 施工型機器人頭部拆解下來的零部件。不曉得為什麼，好像有些卡榫能夠對到頭部的某些輪廓。',
        effects: [
            {
                label: '防禦力', value: '+3~6', positive: true, 
            },
            {
                label: '生命上限', value: '+10~20', positive: true, 
            },
            ...MEDIUM_MOD_EFFECTS,
        ],
        stats: {},
    },
    salvaged_wrench: {
        templateId: 'salvaged_wrench',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarity: Rarity.N,
        name: '防割工作手套',
        description: '普通的厚實工作手套，能抵禦碎金屬與鋒利零件。手指活動起來意外地靈活。',
        effects: [
            {
                label: '攻擊力', value: '+5~10', positive: true, 
            },
            {
                label: '生命上限', value: '+15~30', positive: true, 
            },
            ...MEDIUM_MOD_EFFECTS,
        ],
        stats: {},
    },
    research_chip_ring: {
        templateId: 'research_chip_ring',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarity: Rarity.N,
        name: 'GK 員工識別環',
        description: '不知道是哪個年代的員工識別裝置。晶片早已失效，但某些廢棄設施的門禁看見它時，偶爾還是會亮一下綠燈。',
        effects: [
            {
                label: '防禦力', value: '+2~3', positive: true, 
            },
            {
                label: '生命上限', value: '+6~9', positive: true, 
            },
            ...LIGHT_MOD_EFFECTS,
        ],
        stats: {},
    },
    supply_crate_vest: {
        templateId: 'supply_crate_vest',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.BODY,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarity: Rarity.N,
        name: '工程防護背心',
        description: '裂域維修人員的標準裝備，口袋多得離譜。穿上後，搬零件、爬管線、鑽維修孔都變得順手許多。',
        effects: [
            {
                label: '防禦力', value: '+5~9', positive: true, 
            },
            {
                label: '生命上限', value: '+15~25', positive: true, 
            },
            ...HEAVY_MOD_EFFECTS,
        ],
        stats: {},
    },
    servo_greaves: {
        templateId: 'servo_greaves',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.SHOES,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarity: Rarity.N,
        name: '工程安全靴',
        description: '鋼頭、防穿刺、防滑，標準的 GK 工程人員安全靴。鞋底磨損嚴重，卻比你找到的大多數新鞋都好走，走在金屬管線上也異常穩。',
        effects: [
            {
                label: '防禦力', value: '+5~7', positive: true, 
            },
            {
                label: '生命上限', value: '+15~21', positive: true, 
            },
            ...LIGHT_MOD_EFFECTS,
        ],
        stats: {},
    },
    maintenance_terminal_gloves: {
        templateId: 'maintenance_terminal_gloves',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarity: Rarity.N,
        name: '維修端子手套',
        description: '原本用來接觸裸露電路的絕緣手套。戴上後，你似乎能感覺到附近設備的電流流向。',
        effects: [
            {
                label: '防禦力', value: '+2~4', positive: true, 
            },
            {
                label: '生命上限', value: '+6~12', positive: true, 
            },
            ...LIGHT_MOD_EFFECTS,
        ],
        stats: {},
    },
    hydraulic_arm_guard: {
        templateId: 'hydraulic_arm_guard',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        weaponWeightClass: WeaponWeightClass.MEDIUM,
        rarity: Rarity.N,
        name: '液壓作業護臂',
        description: '拆自工廠重型機械的輔助護臂。啟動時會發出低沉的嗡鳴聲，你的手臂卻沒有想像中那麼沉。',
        effects: [
            {
                label: '防禦力', value: '+3~6', positive: true, 
            },
            {
                label: '生命上限', value: '+9~18', positive: true, 
            },
            ...MEDIUM_MOD_EFFECTS,
        ],
        stats: {},
    },
    tech_goggles: {
        templateId: 'tech_goggles',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        weaponWeightClass: WeaponWeightClass.LIGHT,
        rarity: Rarity.N,
        name: '維修技師護目鏡',
        description: '用來檢查精密零件的護目鏡。戴上它之後，總能第一時間看出哪一台機器「快壞了」。',
        effects: [
            {
                label: '防禦力', value: '+2~4', positive: true, 
            },
            {
                label: '生命上限', value: '+6~12', positive: true, 
            },
            ...LIGHT_MOD_EFFECTS,
        ],
        stats: {},
    },
};

const STARTER_POTION_PREVIEW: StarterLoadoutItemPreview = {
    templateId: STARTER_POTION_TEMPLATE_ID,
    type: ItemType.POTION,
    rarity: Rarity.N,
    name: '機油',
    description: '為什麼喝機油會補血...？但真好喝，咕嚕咕嚕咕嚕。',
    effects: [
        {
            label: '使用後回復', value: '+15~20% 生命值', positive: true, 
        },
    ],
    stats: {},
};

/**
 * Starter loadout preview (2 equipment pieces + potion) for the given
 * archetype — used by the archetype-selection screen, before any character
 * exists.
 */
export function getStarterLoadoutPreview(archetypeId: string): StarterLoadoutItemPreview[] {
    const equipmentTemplateIds = getStarterEquipmentTemplateIds(archetypeId);
    const equipmentPreviews = equipmentTemplateIds.map(templateId => STARTER_EQUIPMENT_PREVIEW[templateId]
        ?? STARTER_EQUIPMENT_PREVIEW[DEFAULT_STARTER_EQUIPMENT_TEMPLATE_IDS[0]] as StarterLoadoutItemPreview);

    return [...equipmentPreviews, STARTER_POTION_PREVIEW];
}
