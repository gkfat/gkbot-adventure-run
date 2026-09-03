/**
 * Blessing/Curse RunModifier definitions (VO-009's concrete content) and
 * candidate-selection weights.
 *
 * ASSUMPTION (see events-and-blessings/design.md): `10_事件祝福與詛咒.md`
 * doesn't exist in this repo, so the specific set of Blessings/Curses below
 * is invented for this change, themed after docs/worldview.md's "研究設施"
 * (research facility) flavor for Blessing nodes.
 *
 * Uses the `RunModifier` shape already implemented by `adventure-run-core`/
 * `combat-engine` (`statModifiers`/`dropRateMultiplier`) — NOT the
 * `{target,op,value}` shape design.md's Risk/Trade-offs section speculated
 * about before combat-engine's `applyModifiers()` had actually shipped.
 *
 * blessing-leveling: each Blessing is now a single family with a `rarity`
 * (COMMON/RARE/EPIC, replacing `tier`) and a fixed-length `levels` tuple
 * (Lv1~Lv3 effect values, name/description shared across levels) — see
 * openspec/changes/blessing-leveling/design.md Decision 1. Curses stay flat.
 */

import type {
    RunModifier, BlessingEntry,
} from '../types/adventure';

export type BlessingRarity = 'COMMON' | 'RARE' | 'EPIC';

/** Per-level effect values for a Blessing family — Lv1~Lv3, name/description shared. */
export type BlessingLevelEffect = Pick<RunModifier, 'statModifiers' | 'dropRateMultiplier'>;

export type BlessingTemplate = {
    modifierId: string;
    name: string;
    description: string;
    isBlessing: true;
    rarity: BlessingRarity;
    levels: [BlessingLevelEffect, BlessingLevelEffect, BlessingLevelEffect]; // Lv1, Lv2, Lv3
};

/** A generated Blessing candidate — a template resolved to the level it would grant/upgrade to if picked. */
export type BlessingCandidate = BlessingLevelEffect & {
    modifierId: string;
    name: string;
    description: string;
    isBlessing: true;
    rarity: BlessingRarity;
    level: number;
};

export const BLESSING_TEMPLATES: BlessingTemplate[] = [
    {
        modifierId: 'blessing_atk_boost',
        name: '戰鬥意志',
        description: '殘留的作戰輔助程式短暫接管你的反應速度，攻擊力提升。',
        isBlessing: true,
        rarity: 'COMMON',
        levels: [
            { statModifiers: { ATK: 8 } },
            { statModifiers: { ATK: 16 } },
            { statModifiers: { ATK: 26 } },
        ],
    },
    {
        modifierId: 'blessing_def_boost',
        name: '強化裝甲',
        description: '外殼被臨時噴塗一層實驗性塗層，防禦力提升。',
        isBlessing: true,
        rarity: 'COMMON',
        levels: [
            { statModifiers: { DEF: 6 } },
            { statModifiers: { DEF: 12 } },
            { statModifiers: { DEF: 20 } },
        ],
    },
    {
        modifierId: 'blessing_crit_boost',
        name: '瞄準協定',
        description: '殘留的射控模組重新校準，暴擊率提升。',
        isBlessing: true,
        rarity: 'COMMON',
        levels: [
            { statModifiers: { critChance: 0.03 } },
            { statModifiers: { critChance: 0.06 } },
            { statModifiers: { critChance: 0.10 } },
        ],
    },
    {
        modifierId: 'blessing_hp_boost',
        name: '緊急修復',
        description: '研究設施的自我修復模組替你補上一層額外的結構冗餘，生命上限提升。',
        isBlessing: true,
        rarity: 'RARE',
        levels: [
            { statModifiers: { HP_MAX: 40 } },
            { statModifiers: { HP_MAX: 80 } },
            { statModifiers: { HP_MAX: 130 } },
        ],
    },
    {
        modifierId: 'blessing_luck_drop',
        name: '幸運符文',
        description: '不明來源的訊號持續在你耳邊低語「這邊，往這邊」，掉落率提升。',
        isBlessing: true,
        rarity: 'RARE',
        levels: [
            { dropRateMultiplier: 1.3 },
            { dropRateMultiplier: 1.6 },
            { dropRateMultiplier: 2.0 },
        ],
    },
    {
        modifierId: 'blessing_dodge_boost',
        name: '相位殘影',
        description: '外殼表層殘留的隱形塗層規律性閃爍，閃避率提升。',
        isBlessing: true,
        rarity: 'RARE',
        levels: [
            { statModifiers: { dodgeChance: 0.03 } },
            { statModifiers: { dodgeChance: 0.06 } },
            { statModifiers: { dodgeChance: 0.10 } },
        ],
    },
    {
        modifierId: 'blessing_speed',
        name: '過載超頻',
        description: '關節伺服機構被強制超頻，攻擊間隔縮短。',
        isBlessing: true,
        rarity: 'EPIC',
        levels: [
            { statModifiers: { actionIntervalSec: -0.3 } },
            { statModifiers: { actionIntervalSec: -0.5 } },
            { statModifiers: { actionIntervalSec: -0.7 } },
        ],
    },
    {
        modifierId: 'blessing_overclock_core',
        name: '核心超載',
        description: '危險但強大的超頻協定同時提升攻擊力與暴擊倍率。',
        isBlessing: true,
        rarity: 'EPIC',
        levels: [
            {
                statModifiers: {
                    ATK: 10, critMultiplier: 0.1, 
                }, 
            },
            {
                statModifiers: {
                    ATK: 20, critMultiplier: 0.2, 
                }, 
            },
            {
                statModifiers: {
                    ATK: 34, critMultiplier: 0.35, 
                }, 
            },
        ],
    },
];

export const CURSE_TEMPLATES: RunModifier[] = [
    {
        modifierId: 'curse_signal_noise',
        name: '訊號干擾',
        description: '一陣刺耳的雜訊竄過感測器，攻擊力下降。',
        isBlessing: false,
        statModifiers: { ATK: -5 },
    },
    {
        modifierId: 'curse_armor_corrosion',
        name: '裝甲腐蝕',
        description: '不明液體腐蝕了外殼接縫，防禦力下降。',
        isBlessing: false,
        statModifiers: { DEF: -4 },
    },
    {
        modifierId: 'curse_overheat',
        name: '過熱降頻',
        description: '核心溫度持續異常升高，攻擊間隔拉長。',
        isBlessing: false,
        statModifiers: { actionIntervalSec: 0.3 },
    },
    {
        modifierId: 'curse_bad_luck',
        name: '厄運纏身',
        description: '裂域裡的某種東西盯上了你，掉落率下降。',
        isBlessing: false,
        dropRateMultiplier: 0.7,
    },
];

// ASSUMPTION: base rarity weights, shifted toward EPIC (and to a lesser
// extent RARE) as LUCK increases — see design.md Decision 2. Exact curve
// non-binding, freely tunable.
const BASE_COMMON_WEIGHT = 60;
const BASE_RARE_WEIGHT = 30;
const BASE_EPIC_WEIGHT = 10;
const RARE_WEIGHT_PER_LUCK = 0.4;
const RARE_WEIGHT_CAP = 45;
const EPIC_WEIGHT_PER_LUCK = 0.8;
const EPIC_WEIGHT_CAP = 45;

/**
 * Rarity weights for a given LUCK — higher LUCK shifts weight from COMMON
 * toward RARE/EPIC (each capped independently), mirroring the old
 * `majorTierChance` shape extended to 3 rarities.
 */
export function rarityWeights(luck: number): Record<BlessingRarity, number> {
    const epic = Math.min(EPIC_WEIGHT_CAP, BASE_EPIC_WEIGHT + luck * EPIC_WEIGHT_PER_LUCK);
    const rare = Math.min(RARE_WEIGHT_CAP, BASE_RARE_WEIGHT + luck * RARE_WEIGHT_PER_LUCK);
    const common = Math.max(0, BASE_COMMON_WEIGHT + BASE_RARE_WEIGHT + BASE_EPIC_WEIGHT - epic - rare);
    return {
        COMMON: common, RARE: rare, EPIC: epic,
    };
}

/**
 * Pick a rarity from a single RNG draw in [0, 1), weighted by `weights`
 * (EPIC first, then RARE, remainder COMMON — order doesn't matter for a
 * weighted pick, just needs consistent cumulative thresholds).
 */
export function pickWeightedRarity(weights: Record<BlessingRarity, number>, rngValue: number): BlessingRarity {
    const total = weights.COMMON + weights.RARE + weights.EPIC;
    if (total <= 0) return 'COMMON';
    const epicThreshold = weights.EPIC / total;
    const rareThreshold = epicThreshold + weights.RARE / total;
    if (rngValue < epicThreshold) return 'EPIC';
    if (rngValue < rareThreshold) return 'RARE';
    return 'COMMON';
}

/** Lookup table from `modifierId` back to its Blessing family template. */
export const BLESSING_TEMPLATES_BY_ID: Record<string, BlessingTemplate> = Object.fromEntries(
    BLESSING_TEMPLATES.map(template => [template.modifierId, template]),
);

/** Lookup table from `modifierId` back to its (flat) Curse template. */
export const CURSE_TEMPLATES_BY_ID: Record<string, RunModifier> = Object.fromEntries(
    CURSE_TEMPLATES.map(template => [template.modifierId, template]),
);

export function findCurseTemplate(modifierId: string): RunModifier | undefined {
    return CURSE_TEMPLATES_BY_ID[modifierId];
}

/** A Blessing family's effect at a given level (1~3), or undefined if the family/level doesn't exist. */
export function blessingLevelEffect(modifierId: string, level: number): BlessingLevelEffect | undefined {
    if (level < 1) return undefined;
    return BLESSING_TEMPLATES_BY_ID[modifierId]?.levels[level - 1];
}

/**
 * Resolve an owned Blessing entry (`{modifierId, level}`) into its concrete
 * `RunModifier` for the entry's current level (design.md Decision 4).
 */
export function resolveBlessingModifier(entry: BlessingEntry): RunModifier | undefined {
    const template = BLESSING_TEMPLATES_BY_ID[entry.modifierId];
    const effect = blessingLevelEffect(entry.modifierId, entry.level);
    if (!template || !effect) return undefined;
    return {
        modifierId: template.modifierId,
        name: template.name,
        description: template.description,
        isBlessing: true,
        ...effect,
    };
}
