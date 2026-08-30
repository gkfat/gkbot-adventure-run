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
 */

import type { RunModifier } from '../../shared/types/adventure';

export type BlessingTier = 'MINOR' | 'MAJOR';

export type BlessingTemplate = RunModifier & { tier: BlessingTier };

export const BLESSING_TEMPLATES: BlessingTemplate[] = [
    {
        modifierId: 'blessing_atk_boost',
        name: '戰鬥意志',
        description: '殘留的作戰輔助程式短暫接管你的反應速度，攻擊力提升。',
        isBlessing: true,
        tier: 'MINOR',
        statModifiers: { ATK: 8 },
    },
    {
        modifierId: 'blessing_def_boost',
        name: '強化裝甲',
        description: '外殼被臨時噴塗一層實驗性塗層，防禦力提升。',
        isBlessing: true,
        tier: 'MINOR',
        statModifiers: { DEF: 6 },
    },
    {
        modifierId: 'blessing_hp_boost',
        name: '緊急修復',
        description: '研究設施的自我修復模組替你補上一層額外的結構冗餘，生命上限提升。',
        isBlessing: true,
        tier: 'MAJOR',
        statModifiers: { HP_MAX: 40 },
    },
    {
        modifierId: 'blessing_luck_drop',
        name: '幸運符文',
        description: '不明來源的訊號持續在你耳邊低語「這邊，往這邊」，掉落率提升。',
        isBlessing: true,
        tier: 'MAJOR',
        dropRateMultiplier: 1.3,
    },
    {
        modifierId: 'blessing_speed',
        name: '過載超頻',
        description: '關節伺服機構被強制超頻，攻擊間隔縮短。',
        isBlessing: true,
        tier: 'MAJOR',
        statModifiers: { actionIntervalSec: -0.3 },
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

// ASSUMPTION: base tier weights, shifted toward MAJOR as LUCK increases.
const BASE_MINOR_WEIGHT = 70;
const BASE_MAJOR_WEIGHT = 30;
const MAJOR_WEIGHT_PER_LUCK = 1;
const MAJOR_WEIGHT_CAP = 80;

export function majorTierChance(luck: number): number {
    const majorWeight = Math.min(MAJOR_WEIGHT_CAP, BASE_MAJOR_WEIGHT + luck * MAJOR_WEIGHT_PER_LUCK);
    const minorWeight = BASE_MINOR_WEIGHT + BASE_MAJOR_WEIGHT - majorWeight;
    return majorWeight / (majorWeight + minorWeight);
}
