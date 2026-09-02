/**
 * Starter loadout granted to every newly created character
 * (character-starter-loadout): one N-rarity weapon/armor piece (equipped)
 * and one N-rarity potion (left in the permanent inventory). The
 * equipment piece is themed per archetype (weapon/armor-by-class):
 * fighter gets a HEAVY weapon, adventurer a LIGHT weapon, scholar a MEDIUM
 * armor piece, tinkerer a MEDIUM weapon, gambler an attack-speed accessory.
 * The potion is the same for every archetype.
 */

import {
    EquipmentSlot, Rarity, 
} from '../types/common';
import { ItemType } from '../types/item';

export const STARTER_POTION_TEMPLATE_ID = 'engine_oil_basic';

export const DEFAULT_STARTER_EQUIPMENT_TEMPLATE_ID = 'salvaged_wrench';

/**
 * archetypeId -> starter equipment templateId. Falls back to
 * DEFAULT_STARTER_EQUIPMENT_TEMPLATE_ID for any archetype without an
 * explicit entry (e.g. a newly added archetype not yet themed here).
 */
export const STARTER_EQUIPMENT_TEMPLATE_ID_BY_ARCHETYPE: Record<string, string> = {
    fighter: 'riot_shield_scrap', // 重型武器
    adventurer: 'scrap_daggers', // 輕型武器
    scholar: 'gkbot_faceplate', // 中等防具
    tinkerer: 'salvaged_wrench', // 中等武器
    gambler: 'research_chip_ring', // 加攻速飾品
};

export function getStarterEquipmentTemplateId(archetypeId: string): string {
    return STARTER_EQUIPMENT_TEMPLATE_ID_BY_ARCHETYPE[archetypeId] ?? DEFAULT_STARTER_EQUIPMENT_TEMPLATE_ID;
}

export type StarterLoadoutItemPreview = {
  templateId: string;
  type: ItemType;
  equipSlot?: EquipmentSlot;
  rarity: Rarity;
  name: string;
  description: string;
  statLabel: string;
  // Empty — resolvePixelIcon()/equipmentDisplay's ItemLike shape only needs
  // this field to exist, not populated; the preview's stat readout is
  // statLabel above, not this.
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
const STARTER_EQUIPMENT_PREVIEW: Record<string, StarterLoadoutItemPreview> = {
    riot_shield_scrap: {
        templateId: 'riot_shield_scrap',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.LEFT_HAND,
        rarity: Rarity.N,
        name: '工程護腕',
        description: '普通的工程護腕，能減少搬運重物時手腕受到的衝擊。戴上之後，你開始覺得螺絲起子特別順手。',
        statLabel: '重型武器・防禦力 +4~8、攻擊間隔 +0.05~0.1s',
        stats: {},
    },
    scrap_daggers: {
        templateId: 'scrap_daggers',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        rarity: Rarity.N,
        name: '拆信刀',
        description: '辦公室裡隨處可見的拆信刀，刀刃單薄卻異常鋒利。你發現自己揮動它的速度，比想像中快上不少。',
        statLabel: '輕型武器・攻擊力 +3~6、攻擊間隔 -0.05~-0.02s',
        stats: {},
    },
    gkbot_faceplate: {
        templateId: 'gkbot_faceplate',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.HEAD,
        rarity: Rarity.N,
        name: 'GkBot 的頭部零件',
        description: '從 GKBot 施工型機器人頭部拆解下來的零部件。不曉得為什麼，好像有些卡榫能夠對到頭部的某些輪廓。',
        statLabel: '中等防具・防禦力 +3~6、生命上限 +10~20',
        stats: {},
    },
    salvaged_wrench: {
        templateId: 'salvaged_wrench',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        rarity: Rarity.N,
        name: '防割工作手套',
        description: '普通的厚實工作手套，能抵禦碎金屬與鋒利零件。手指活動起來意外地靈活。',
        statLabel: '中等武器・攻擊力 +5~10',
        stats: {},
    },
    research_chip_ring: {
        templateId: 'research_chip_ring',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RING,
        rarity: Rarity.N,
        name: 'GK 員工識別環',
        description: '不知道是哪個年代的員工識別裝置。晶片早已失效，但某些廢棄設施的門禁看見它時，偶爾還是會亮一下綠燈。',
        statLabel: '加攻速飾品・攻擊間隔 -0.04~-0.02s',
        stats: {},
    },
};

const STARTER_POTION_PREVIEW: StarterLoadoutItemPreview = {
    templateId: STARTER_POTION_TEMPLATE_ID,
    type: ItemType.POTION,
    rarity: Rarity.N,
    name: '機油',
    description: '為什麼喝機油會補血...？但真好喝，咕嚕咕嚕咕嚕。',
    statLabel: '使用後回復 15~20% 生命值',
    stats: {},
};

/**
 * Starter loadout preview (equipment + potion) for the given archetype —
 * used by the archetype-selection screen, before any character exists.
 */
export function getStarterLoadoutPreview(archetypeId: string): StarterLoadoutItemPreview[] {
    const equipmentTemplateId = getStarterEquipmentTemplateId(archetypeId);
    const equipmentPreview = STARTER_EQUIPMENT_PREVIEW[equipmentTemplateId]
        ?? STARTER_EQUIPMENT_PREVIEW[DEFAULT_STARTER_EQUIPMENT_TEMPLATE_ID] as StarterLoadoutItemPreview;

    return [equipmentPreview, STARTER_POTION_PREVIEW];
}
