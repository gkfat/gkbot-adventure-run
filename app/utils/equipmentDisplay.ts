/**
 * Shared display data for equipment slots/rarity — used by the home screen's
 * equipment mini-slots (game/character-stage/equipSlots.vue) and the inventory page.
 */
import {
    EquipmentSlot, Rarity, HAND_SLOTS, WeaponWeightClass, WeaponType,
} from '../../shared/types/common';
import { deriveWeaponWeightClass } from '../../shared/constants/equipmentWeight';
import type { PixelIconName } from './pixelIcons';

export const EQUIP_SLOTS_LEFT: EquipmentSlot[] = [
    EquipmentSlot.HEAD,
    EquipmentSlot.RIGHT_HAND,
    EquipmentSlot.RING,
];
export const EQUIP_SLOTS_RIGHT: EquipmentSlot[] = [
    EquipmentSlot.BODY,
    EquipmentSlot.LEFT_HAND,
    EquipmentSlot.SHOES,
];
export const EQUIP_SLOTS_ALL: EquipmentSlot[] = [...EQUIP_SLOTS_LEFT, ...EQUIP_SLOTS_RIGHT];

// Generic placeholder icon for the always-visible "equipped slot" overview —
// shown regardless of whether the slot is currently filled. Deliberately
// simple/generic; an actual item's own picture is resolved separately by
// resolvePixelIcon() below.
export const SLOT_PIXEL_ICON: Record<EquipmentSlot, PixelIconName> = {
    [EquipmentSlot.HEAD]: 'hat',
    [EquipmentSlot.BODY]: 'tshirt',
    [EquipmentSlot.SHOES]: 'foot',
    [EquipmentSlot.LEFT_HAND]: 'hand',
    [EquipmentSlot.RIGHT_HAND]: 'hand',
    [EquipmentSlot.RING]: 'ringSlot',
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

export const WEIGHT_CLASS_LABEL: Record<WeaponWeightClass, string> = {
    [WeaponWeightClass.LIGHT]: '輕型',
    [WeaponWeightClass.MEDIUM]: '中等',
    [WeaponWeightClass.HEAVY]: '重型',
};

export const WEIGHT_CLASS_COLOR: Record<WeaponWeightClass, string> = {
    [WeaponWeightClass.LIGHT]: 'rgb(var(--v-theme-green))',
    [WeaponWeightClass.MEDIUM]: 'rgb(var(--v-theme-secondary))',
    [WeaponWeightClass.HEAVY]: 'rgb(var(--v-theme-warning))',
};

// Light-to-heavy order for rendering the weight spectrum's group labels.
export const WEIGHT_CLASS_ORDER: WeaponWeightClass[] = [
    WeaponWeightClass.LIGHT,
    WeaponWeightClass.MEDIUM,
    WeaponWeightClass.HEAVY,
];

// Detail dialog's weight bar always shows 9 cells (weight 1-9, 3 per weight
// class per WEIGHT_CLASS_THRESHOLDS) regardless of the item's actual weight
// range, so a weight above 9 (e.g. a high-rarity roll) still marks the last
// cell rather than overflowing the bar.
const WEIGHT_BAR_CELL_COUNT = 9;

export function buildWeightBarCells(weight: number | undefined): { weightClass: WeaponWeightClass; active: boolean }[] {
    const activeIndex = Math.min(Math.max(weight ?? 0, 1), WEIGHT_BAR_CELL_COUNT) - 1;
    return Array.from({ length: WEIGHT_BAR_CELL_COUNT }, (_, index) => ({
        weightClass: deriveWeaponWeightClass(index + 1),
        active: index === activeIndex,
    }));
}

export const WEAPON_TYPE_LABEL: Record<WeaponType, string> = {
    [WeaponType.FIST]: '拳套',
    [WeaponType.BLADE]: '刀劍',
    [WeaponType.BLUNT]: '鈍器',
    [WeaponType.POLEARM]: '長柄',
    [WeaponType.RANGED]: '槍械',
};

/**
 * An item's WeaponWeightClass, derived from its `weight` (weapon-weight-class
 * D6) — `weaponWeightClass` is no longer a field on ItemInstance itself.
 */
export function resolveWeaponWeightClass(item: Pick<ItemLike, 'weight'>): WeaponWeightClass {
    return deriveWeaponWeightClass(item.weight);
}

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

// Detailed item art per template — takes priority over the slot-based fallback.
const TEMPLATE_ICON: Record<string, PixelIconName> = {
    salvaged_wrench: 'workGloves',
    riot_shield_scrap: 'riotShield',
    gkbot_faceplate: 'faceplate',
    supply_crate_vest: 'crateVest',
    servo_greaves: 'greaves',
    research_chip_ring: 'chipRing',
    engine_oil_basic: 'engineOil',
    tech_goggles: 'techGoggles',
    cargo_bot_plate: 'cargoBotPlate',
    hydraulic_arm_guard: 'hydraulicArmGuard',
    raider_commander_gauntlet: 'raiderGauntlet',
    micro_magnet_ring: 'magnetRing',
    magnetic_work_boots: 'magneticBoots',
    maintenance_terminal_gloves: 'terminalGloves',
    veteran_security_helmet: 'securityHelmet',
    lab_isolation_suit: 'isolationSuit',
    catwalk_maintenance_boots: 'catwalkBoots',
    fallen_survivor_wedding_ring: 'weddingRing',
    vr_training_bracer: 'vrBracer',
    vr_precognition_visor: 'vrVisor',
    jackpot_token_ring: 'tokenRing',
    bartender_grip_gloves: 'bartenderGloves',
    department_store_uniform_vest: 'storeVest',
    limited_edition_sneakers: 'sneakers',
    convenience_store_bat: 'storeBat',
    lab_serum_injector_brace: 'serumInjector',
    quantum_breach_drill_arm: 'drillArm',
    neural_pulse_gauntlet: 'pulseGauntlet',
    holo_deflector_shield: 'holoShield',
    neural_interface_circlet: 'neuralCirclet',
    tactical_faceguard: 'tacticalFaceguard',
    fiber_optic_bodysuit: 'fiberSuit',
    maglev_sprint_boots: 'maglevBoots',
    hacker_data_ring: 'dataRing',
    jousting_arena_warhammer: 'warhammer',
    crusader_replica_longsword: 'crusaderSword',
    tournament_kite_shield: 'kiteShield',
    plate_armor_gauntlet: 'plateGauntlet',
    grand_tournament_helm: 'tournamentHelm',
    chainmail_cutting_vest: 'chainmailVest',
    mounted_patrol_riding_boots: 'ridingBoots',
    knights_order_signet_ring: 'signetRing',
    scrap_daggers: 'scrapDagger',
    maintenance_breach_pike: 'breachPike',
    patrol_riot_halberd: 'riotHalberd',
    electromagnetic_pistol: 'emPistol',
    salvaged_laser_rifle: 'laserRifle',
    exhibition_pulse_crossbow: 'pulseCrossbow',
};

export type ItemLike = {
    templateId: string;
    type: string;
    equipSlot?: EquipmentSlot;
    weight?: number;
    weaponType?: WeaponType;
    rarity: Rarity;
    name?: string;
    description?: string;
    stats: {
        ATK?: number;
        DEF?: number;
        HP?: number;
        actionSpeedMod?: number;
        dodgeChanceMod?: number;
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
// (per-stat breakdown for the detail dialog), so the two can't drift apart.
// `formatValue`/`compact` prepend '+' only for positive values — ATK/DEF/HP
// can now roll as a negative "拖累" debuff, and a negative number's own '-'
// sign already reads correctly without extra handling.
// `isBeneficial` decides the green/red readout in the detail dialog — for
// most stats a positive number is the good outcome, but actionSpeedMod is
// inverted (a *lower* action interval means faster attacks, so negative is
// the beneficial direction there).
const STAT_DISPLAY_ORDER: {
    key: StatKey;
    label: string;
    formatValue: (value: number) => string;
    compact: (value: number) => string;
    isBeneficial: (value: number) => boolean;
}[] = [
    {
        key: 'ATK', label: '攻擊力', formatValue: v => `${v > 0 ? '+' : ''}${Math.round(v)}`, compact: v => `${v > 0 ? '+' : ''}${Math.round(v)}`, isBeneficial: v => v > 0,
    },
    {
        key: 'DEF', label: '防禦力', formatValue: v => `${v > 0 ? '+' : ''}${Math.round(v)}`, compact: v => `${v > 0 ? '+' : ''}${Math.round(v)}`, isBeneficial: v => v > 0,
    },
    {
        key: 'HP', label: '生命上限', formatValue: v => `${v > 0 ? '+' : ''}${Math.round(v)}`, compact: v => `${v > 0 ? '+' : ''}${Math.round(v)}`, isBeneficial: v => v > 0,
    },
    {
        key: 'actionSpeedMod',
        label: '攻擊間隔',
        formatValue: v => `${v > 0 ? '+' : ''}${v.toFixed(2)}s`,
        compact: v => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}`,
        isBeneficial: v => v < 0,
    },
    {
        key: 'dodgeChanceMod',
        label: '閃避率',
        formatValue: v => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`,
        compact: v => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`,
        isBeneficial: v => v > 0,
    },
    {
        key: 'healPercent', label: '使用後回復', formatValue: v => `+${Math.round(v)}% 生命值`, compact: v => `+${Math.round(v)}`, isBeneficial: () => true,
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
 * Build the display name, a per-stat effect breakdown (`effects`, one entry
 * per bonus — for a one-row-per-stat detail dialog layout), the same
 * breakdown flattened into a single line (`effectText` — for compact
 * single-line summaries), and a flavor/lore line for an item.
 */
export function describeItem(item: ItemLike): {
    name: string;
    effects: { label: string; value: string; positive: boolean }[];
    effectText: string;
    flavor: string;
} {
    const name = item.name ?? item.templateId;

    const effects = STAT_DISPLAY_ORDER
        .filter(({ key }) => item.stats[key])
        .map(({
            key, label, formatValue, isBeneficial,
        }) => ({
            label, value: formatValue(item.stats[key] as number), positive: isBeneficial(item.stats[key] as number),
        }));

    const effectText = effects.length > 0
        ? effects.map(({
            label, value,
        }) => `${label} ${value}`).join('、')
        : '沒有額外效果';
    const flavor = item.description
        ?? (item.type === 'POTION' ? '一瓶用途不明的藥水。' : '一件來歷不明的裝備。');

    return {
        name, effects, effectText, flavor,
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
    if (!item.equipSlot || !HAND_SLOTS.includes(item.equipSlot)) {
        // Non-hand items always use their own equipSlot — leave `requestedSlot`
        // unset rather than echoing it back, since the server now rejects a
        // `requestedSlot` on a non-hand item.
        return undefined;
    }

    const emptyHand = HAND_SLOTS.find(slot => !equipment[slot]);
    return emptyHand ?? item.equipSlot;
}
