import type { SkillEffect } from '../../shared/types/adventure';

/** Short Chinese label per SkillEffectKind, used as a fallback/prefix in描述文字. */
export const SKILL_EFFECT_LABEL: Record<SkillEffect['kind'], string> = {
    DAMAGE_SINGLE: '單體傷害',
    DAMAGE_AOE: '範圍傷害',
    DAMAGE_SPLASH: '濺射傷害',
    FREEZE: '凍結',
    HASTE_SELF: '增加攻速',
    HEAL_SELF: '恢復生命',
    DEFENSE_UP: '提升防禦',
    CRIT_UP: '提升爆擊',
    ARMOR_BREAK: '降低敵防',
    DOT: '持續傷害',
    SHIELD: '護盾',
};

/**
 * Human-readable summary of a skill's effect at its current level
 * (character-skills「角色頁『技能』tab 呈現」dialog 內容).
 */
export function describeSkillEffect(effect: SkillEffect): string {
    switch (effect.kind) {
    case 'DAMAGE_SINGLE':
        return `對目標造成 ATK × ${effect.multiplier?.toFixed(2)} 傷害`;
    case 'DAMAGE_AOE':
        return `對全體敵人各造成 ATK × ${effect.multiplier?.toFixed(2)} 傷害`;
    case 'DAMAGE_SPLASH':
        return `主目標 ATK × ${effect.multiplier?.toFixed(2)}，其餘敵人 ATK × ${((effect.multiplier ?? 0) * (effect.splashRatio ?? 0)).toFixed(2)}`;
    case 'FREEZE':
        return `使目標下次行動延後 ${effect.durationSec} 秒`;
    case 'HASTE_SELF':
        return `自身攻速間隔縮短 ${effect.percent}%，持續 ${effect.durationSec} 秒`;
    case 'HEAL_SELF':
        return `恢復自身最大生命值 ${effect.percent}%`;
    case 'DEFENSE_UP':
        return `自身防禦力提升 ${effect.percent}%，持續 ${effect.durationSec} 秒`;
    case 'CRIT_UP':
        return `自身爆擊率提升 ${effect.flatPercent} 個百分點，持續 ${effect.durationSec} 秒`;
    case 'ARMOR_BREAK':
        return `目標防禦力降低 ${effect.percent}%，持續 ${effect.durationSec} 秒`;
    case 'DOT':
        return `造成 ATK × ${effect.multiplier?.toFixed(2)} 傷害，並附加 ${effect.ticks} 次、每次 ${effect.tickDamage} 點的持續傷害`;
    case 'SHIELD':
        return `為自身建立最大生命值 ${effect.percent}% 的護盾`;
    default:
        return SKILL_EFFECT_LABEL[effect.kind] ?? '';
    }
}

/**
 * The single number that changes level-to-level for a given effect kind, plus
 * how to format it — used by describeSkillEffectDiff for a compact「目前 →
 * 下一級」預覽（known-issue.md #2：強化前應該看得出會變強多少）。
 */
function primaryValue(effect: SkillEffect): { value: number; suffix: string } | null {
    switch (effect.kind) {
    case 'DAMAGE_SINGLE':
    case 'DAMAGE_AOE':
    case 'DAMAGE_SPLASH':
        return effect.multiplier === undefined ? null : {
            value: effect.multiplier, suffix: 'x',
        };
    case 'FREEZE':
        return effect.durationSec === undefined ? null : {
            value: effect.durationSec, suffix: 's',
        };
    case 'HASTE_SELF':
    case 'HEAL_SELF':
    case 'DEFENSE_UP':
    case 'ARMOR_BREAK':
    case 'SHIELD':
        return effect.percent === undefined ? null : {
            value: effect.percent, suffix: '%',
        };
    case 'CRIT_UP':
        return effect.flatPercent === undefined ? null : {
            value: effect.flatPercent, suffix: '%',
        };
    case 'DOT':
        return effect.tickDamage === undefined ? null : {
            value: effect.tickDamage, suffix: '',
        };
    default:
        return null;
    }
}

const formatPrimaryValue = (value: number, suffix: string) => (suffix === 'x' ? `Atk${value.toFixed(2)}${suffix}` : `${value}${suffix}`);

/**
 * Compact「目前效果 → 下一級效果」數值預覽，例如「傷害倍率 Atk1.50x → 1.60x」
 * （known-issue.md #2）。兩個 effect 須為同一個 kind（同一個技能不同等級）。
 */
export function describeSkillEffectDiff(current: SkillEffect, next: SkillEffect): string {
    const from = primaryValue(current);
    const to = primaryValue(next);
    if (!from || !to) return describeSkillEffect(next);

    return `${SKILL_EFFECT_LABEL[current.kind]}：${formatPrimaryValue(from.value, from.suffix)} → ${formatPrimaryValue(to.value, to.suffix)}`;
}

/**
 * 拆成 label／from／to 三段的版本，供 UI 把變動後的數值（to）用比較顯眼的樣式
 * 呈現（使用者要求：升級效果說明 panel 的變動後效果要更明顯）。兩個 effect 須
 * 為同一個 kind；效果種類沒有單一數值可比較時回傳 null，呼叫端應改用
 * describeSkillEffect 顯示純文字。
 */
export function describeSkillEffectDiffParts(current: SkillEffect, next: SkillEffect): { label: string; from: string; to: string } | null {
    const from = primaryValue(current);
    const to = primaryValue(next);
    if (!from || !to) return null;

    return {
        label: SKILL_EFFECT_LABEL[current.kind],
        from: formatPrimaryValue(from.value, from.suffix),
        to: formatPrimaryValue(to.value, to.suffix),
    };
}

/**
 * 控場型/持續型技能效果的戰鬥狀態指示樣式（known-issue.md #1：戰鬥中對方
 * 身上應顯示目前正受什麼技能效果影響）。只列出「持續一段時間、值得在敵人/
 * 玩家身上顯示狀態指示」的效果種類——瞬發的傷害/治療類效果不列在這裡，
 * useCombat.ts 的 statusBadgeFor 只會對出現在這張表的 kind 產生 badge。
 */
export const STATUS_BADGE_STYLE: Partial<Record<SkillEffect['kind'], { label: string; colorClass: string }>> = {
    FREEZE: {
        label: '凍結', colorClass: 'status-badge--freeze',
    },
    HASTE_SELF: {
        label: '加速', colorClass: 'status-badge--haste',
    },
    DEFENSE_UP: {
        label: '防禦提升', colorClass: 'status-badge--defense-up',
    },
    CRIT_UP: {
        label: '爆擊提升', colorClass: 'status-badge--crit-up',
    },
    ARMOR_BREAK: {
        label: '破甲', colorClass: 'status-badge--armor-break',
    },
    DOT: {
        label: '持續傷害', colorClass: 'status-badge--dot',
    },
    SHIELD: {
        label: '護盾', colorClass: 'status-badge--shield',
    },
};
