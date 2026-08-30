/**
 * Shared display data for equipment slots/rarity — used by the home screen's
 * equipment mini-slots (characterStage.vue) and the inventory page.
 */
import {
    EquipmentSlot, Rarity, HAND_SLOTS,
} from '../../shared/types/common';
import type { PixelIconName } from './pixelIcons';

export const EQUIP_SLOTS_LEFT: EquipmentSlot[] = [
    EquipmentSlot.HEAD,
    EquipmentSlot.BODY,
    EquipmentSlot.LEFT_HAND,
];
export const EQUIP_SLOTS_RIGHT: EquipmentSlot[] = [
    EquipmentSlot.RING,
    EquipmentSlot.SHOES,
    EquipmentSlot.RIGHT_HAND,
];
export const EQUIP_SLOTS_ALL: EquipmentSlot[] = [...EQUIP_SLOTS_LEFT, ...EQUIP_SLOTS_RIGHT];

// Generic placeholder icon for the always-visible "equipped slot" overview —
// shown regardless of whether the slot is currently filled. Deliberately
// simple/generic; an actual item's own picture is resolved separately by
// resolvePixelIcon() below.
export const SLOT_PIXEL_ICON: Record<EquipmentSlot, PixelIconName> = {
    [EquipmentSlot.HEAD]: 'hat',
    [EquipmentSlot.BODY]: 'tshirt',
    [EquipmentSlot.SHOES]: 'boot',
    [EquipmentSlot.LEFT_HAND]: 'hand',
    [EquipmentSlot.RIGHT_HAND]: 'hand',
    [EquipmentSlot.RING]: 'ring',
};

// Fallback item art for a future EQUIPMENT template that hasn't been given
// its own sprite in TEMPLATE_ICON yet — more detailed than the slot
// placeholders above, since this represents an actual item, not an empty slot.
const SLOT_FALLBACK_ITEM_ICON: Record<EquipmentSlot, PixelIconName> = {
    [EquipmentSlot.HEAD]: 'helmet',
    [EquipmentSlot.BODY]: 'chest',
    [EquipmentSlot.SHOES]: 'boot',
    [EquipmentSlot.LEFT_HAND]: 'shield',
    [EquipmentSlot.RIGHT_HAND]: 'sword',
    [EquipmentSlot.RING]: 'ring',
};

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
    [EquipmentSlot.HEAD]: '頭部',
    [EquipmentSlot.BODY]: '身體',
    [EquipmentSlot.SHOES]: '鞋子',
    [EquipmentSlot.LEFT_HAND]: '左手',
    [EquipmentSlot.RIGHT_HAND]: '右手',
    [EquipmentSlot.RING]: '戒指',
};

export const RARITY_COLOR: Record<Rarity, string> = {
    [Rarity.N]: '#8a8f98',
    [Rarity.R]: '#4fc3f7',
    [Rarity.SR]: '#ab47bc',
    [Rarity.SSR]: '#ffb300',
    [Rarity.L]: '#ff5252',
};

// Highest to lowest — used as the inventory page's default sort order
export const RARITY_ORDER_DESC: Rarity[] = [
    Rarity.L,
    Rarity.SSR,
    Rarity.SR,
    Rarity.R,
    Rarity.N,
];

// Display names for known item templates (kept in sync with `name` in
// server/constants/templates.ts — the API doesn't send template name/description,
// only the rolled instance, so the frontend keeps its own display copy).
// Falls back to the raw templateId for any template introduced later that
// hasn't been named here yet.
const TEMPLATE_NAMES: Record<string, string> = {
    salvaged_wrench: '維修殘骸扳手',
    riot_shield_scrap: '拾荒防爆盾',
    gkbot_faceplate: 'GkBot 頭部殘片',
    supply_crate_vest: '補給箱改造護甲',
    servo_greaves: '伺服關節護脛',
    research_chip_ring: '殘留運算晶片戒',
    engine_oil_basic: '機油',
};

// Detailed item art per template — takes priority over the slot-based fallback.
const TEMPLATE_ICON: Record<string, PixelIconName> = {
    salvaged_wrench: 'wrench',
    riot_shield_scrap: 'riotShield',
    gkbot_faceplate: 'faceplate',
    supply_crate_vest: 'crateVest',
    servo_greaves: 'greaves',
    research_chip_ring: 'chipRing',
    engine_oil_basic: 'engineOil',
};

// Flavor/lore text per template (kept in sync with `description` in
// server/constants/templates.ts) — no numbers, just what the item is.
const TEMPLATE_FLAVOR: Record<string, string> = {
    salvaged_wrench: '從維修設施的殘骸堆裡挖出來的重型扳手，握把上還留著上一位使用者的手汗痕跡——那個人後來怎麼了，沒人知道。',
    riot_shield_scrap: '補給設施保全機具的防爆盾牌殘件，邊緣還留著清晰的撞擊凹痕，扛起來卻莫名地順手。',
    gkbot_faceplate: '拆卸自失控 GkBot 的頭部外殼，戴上的瞬間有種說不出的熟悉感——熟悉到讓人有點不安。',
    supply_crate_vest: '拆解自倉儲區自動販賣機外殼焊接而成，內襯還印著一行褪色的 GK 公司標語。',
    servo_greaves: '維修型 GkBot 淘汰下來的腿部伺服機構，接上之後走起路來輕快得不太自然。',
    research_chip_ring: '研究設施實驗品上拆下的殘留運算晶片，塞進戒指後仍在微弱運轉，戴著它思考時反應快得連自己都嚇一跳。',
    engine_oil_basic: '為什麼喝機油會補血...？但真好喝，咕嚕咕嚕咕嚕。',
};

export type ItemLike = {
    templateId: string;
    type: string;
    equipSlot?: EquipmentSlot;
    rarity: Rarity;
    stats: {
        ATK?: number;
        DEF?: number;
        HP?: number;
        actionSpeedMod?: number;
        healPercent?: number;
    };
};

/**
 * Pick the pixel-art sprite for an item: a known template gets its own art;
 * otherwise fall back to a generic sprite for its type/slot.
 */
export function resolvePixelIcon(item: ItemLike): PixelIconName {
    const known = TEMPLATE_ICON[item.templateId];
    if (known) {
        return known;
    }
    if (item.type === 'POTION') {
        return 'potion';
    }
    return item.equipSlot ? SLOT_FALLBACK_ITEM_ICON[item.equipSlot] : 'potion';
}

type StatKey = keyof ItemLike['stats'];

// Single source of truth for stat display priority/formatting — used by both
// primaryStatValue() (compact "+N" for the item grid) and describeItem()
// (full effect text for the detail dialog), so the two can't drift apart.
const STAT_DISPLAY_ORDER: {
    key: StatKey;
    effectLabel: (value: number) => string;
    compact: (value: number) => string;
}[] = [
    {
        key: 'ATK', effectLabel: v => `攻擊力 +${v}`, compact: v => `+${Math.round(v)}`, 
    },
    {
        key: 'DEF', effectLabel: v => `防禦力 +${v}`, compact: v => `+${Math.round(v)}`, 
    },
    {
        key: 'HP', effectLabel: v => `生命上限 +${v}`, compact: v => `+${Math.round(v)}`, 
    },
    {
        key: 'actionSpeedMod',
        effectLabel: v => `攻擊間隔 ${v > 0 ? '+' : ''}${v}s`,
        compact: v => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}`,
    },
    {
        key: 'healPercent', effectLabel: v => `使用後回復 ${v}% 生命值`, compact: v => `+${Math.round(v)}`, 
    },
];

/**
 * Compact "+N" readout for the item grid's small icon — the single most
 * relevant stat number, without naming which attribute it is (full
 * breakdown lives in the detail dialog via describeItem()).
 */
export function primaryStatValue(item: ItemLike): string | null {
    for (const {
        key, compact, 
    } of STAT_DISPLAY_ORDER) {
        const value = item.stats[key];
        if (value) return compact(value);
    }
    return null;
}

/**
 * Raw magnitude of an item's primary stat (same stat primaryStatValue()
 * picks) — used for numeric sorting in the inventory grid, where the
 * formatted "+N"/"-N" string isn't directly comparable.
 */
export function primaryStatMagnitude(item: ItemLike): number {
    for (const { key } of STAT_DISPLAY_ORDER) {
        const value = item.stats[key];
        if (value) return Math.abs(value);
    }
    return 0;
}

/**
 * Build the display name, the mechanical effect text (stat numbers), and a
 * flavor/lore line for an item, for the inventory detail dialog. Effect text
 * and flavor text are shown in separate places in the dialog by design.
 */
export function describeItem(item: ItemLike): { name: string; effectText: string; flavor: string } {
    const name = TEMPLATE_NAMES[item.templateId] ?? item.templateId;

    const effects = STAT_DISPLAY_ORDER
        .filter(({ key }) => item.stats[key])
        .map(({
            key, effectLabel, 
        }) => effectLabel(item.stats[key] as number));

    const effectText = effects.length > 0 ? effects.join('、') : '沒有額外效果';
    const flavor = TEMPLATE_FLAVOR[item.templateId]
        ?? (item.type === 'POTION' ? '一瓶用途不明的藥水。' : '一件來歷不明的裝備。');

    return {
        name, effectText, flavor,
    };
}

/**
 * Compact "+N" value + rarity color for an equipped slot, or blanks for an
 * empty one — shared by the home screen's equip-slot overview and the
 * inventory page's "目前裝備" row (both show the same equipped-item readout).
 */
export function equippedStatValue(item: ItemLike | undefined): string | null {
    return item ? primaryStatValue(item) : null;
}

export function equippedStatColor(item: ItemLike | undefined): string | undefined {
    return item ? RARITY_COLOR[item.rarity] : undefined;
}

/**
 * Decide which slot to request when equipping an item. Hand items (sword/
 * dagger-type equipment) prefer whichever hand is currently empty — right
 * first, then left — so the player doesn't have to think about it; if both
 * hands are full, falls back to the item's own default slot (replacing
 * whatever is there). Any other equipSlot is used as-is.
 */
export function pickTargetSlot(
    item: ItemLike,
    equipment: Partial<Record<EquipmentSlot, string>>,
): EquipmentSlot | undefined {
    if (!item.equipSlot) {
        return undefined;
    }
    if (!HAND_SLOTS.includes(item.equipSlot)) {
        return item.equipSlot;
    }

    const emptyHand = HAND_SLOTS.find(slot => !equipment[slot]);
    return emptyHand ?? item.equipSlot;
}
