/**
 * Character skills (character-skills): each of the 5 selectable archetypes
 * originally contributed 2 skills that echo its narrative/combat identity,
 * but skills are no longer exclusive to that archetype — any character can
 * unlock/equip any of the 10 skills (see `ALL_CHARACTER_SKILLS` below).
 * `archetypeId` on each `CharacterSkill` is kept as narrative/icon-grouping
 * metadata only. Each skill's `effectByLevel` is a Lv.1~10 query table —
 * leveling only strengthens the effect's numeric magnitude, `chargeSec` never
 * changes at the Lv.1~10 layer (star-rank bonuses on top of this are applied
 * separately, see `applyStarBonus`/`applyStarBonusToChargeSec`).
 *
 * ASSUMPTION (design.md Open Questions): `chargeSec`/`unlockFragmentCost`/
 * per-level magnitudes are initial balance values, freely tunable via
 * docs/game-design/balance later — only the shape (query table keyed by
 * level, static chargeSec) is load-bearing.
 *
 * Node/description copy follows docs/worldview.md's narrative rule: GK
 * universe lore can be stated openly, but any hint of the player's own
 * mechanization stays implicit (same rule talentTrees.ts follows).
 *
 * Shared (not server-only) so the character-selection screen can preview
 * each archetype's obtainable skills without duplicating this data — same
 * rationale as shared/constants/starterLoadout.ts.
 */

import { SKILL_MAX_LEVEL } from './skills';
import type {
    CharacterSkill, SkillEffect,
} from '../types/adventure';

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Lv.1~10 table for a damage-type skill (multiplier grows linearly per level). */
function damageLevels(
    kind: 'DAMAGE_SINGLE' | 'DAMAGE_AOE' | 'DAMAGE_SPLASH',
    baseMultiplier: number,
    perLevel: number,
    extra?: Partial<SkillEffect>,
): SkillEffect[] {
    return Array.from({ length: SKILL_MAX_LEVEL }, (_, i) => ({
        kind, multiplier: round2(baseMultiplier + perLevel * i), ...extra,
    }));
}

/** Lv.1~10 table for a percent-magnitude status skill (HEAL_SELF/DEFENSE_UP/ARMOR_BREAK/HASTE_SELF/SHIELD). */
function percentLevels(
    kind: 'HEAL_SELF' | 'DEFENSE_UP' | 'ARMOR_BREAK' | 'HASTE_SELF' | 'SHIELD',
    basePercent: number,
    perLevel: number,
    extra?: Partial<SkillEffect>,
): SkillEffect[] {
    return Array.from({ length: SKILL_MAX_LEVEL }, (_, i) => ({
        kind, percent: round2(basePercent + perLevel * i), ...extra,
    }));
}

/** Lv.1~10 table for CRIT_UP (flatPercent grows linearly). */
function critUpLevels(baseFlatPercent: number, perLevel: number, durationSec: number): SkillEffect[] {
    return Array.from({ length: SKILL_MAX_LEVEL }, (_, i) => ({
        kind: 'CRIT_UP' as const, flatPercent: round2(baseFlatPercent + perLevel * i), durationSec,
    }));
}

/** Lv.1~10 table for FREEZE (durationSec grows linearly). */
function freezeLevels(baseDurationSec: number, perLevel: number): SkillEffect[] {
    return Array.from({ length: SKILL_MAX_LEVEL }, (_, i) => ({
        kind: 'FREEZE' as const, durationSec: round2(baseDurationSec + perLevel * i),
    }));
}

export const CHARACTER_SKILLS: Record<string, readonly CharacterSkill[]> = {
    fighter: [
        {
            skillId: 'fighter_crushing_blow',
            archetypeId: 'fighter',
            name: '重擊崩擊',
            description: '把全身重量灌注在這一拳上，砸向眼前最靠近的目標。',
            icon: 'warhammer',
            chargeSec: 16,
            unlockFragmentCost: 20,
            effectByLevel: damageLevels('DAMAGE_SINGLE', 1.5, 0.1),
        }, {
            skillId: 'fighter_iron_body',
            archetypeId: 'fighter',
            name: '鋼鐵之軀',
            description: '繃緊全身肌肉，硬扛下接下來的每一次打擊。',
            icon: 'shield',
            chargeSec: 12,
            unlockFragmentCost: 15,
            effectByLevel: percentLevels('DEFENSE_UP', 20, 3, { durationSec: 8 }),
        },
    ],
    adventurer: [
        {
            skillId: 'adventurer_gale_slash',
            archetypeId: 'adventurer',
            name: '疾風連斬',
            description: '腳步一輕，出手的節奏跟著快了起來。',
            icon: 'sneakers',
            chargeSec: 10,
            unlockFragmentCost: 15,
            effectByLevel: percentLevels('HASTE_SELF', 15, 2, { durationSec: 6 }),
        }, {
            skillId: 'adventurer_second_wind',
            archetypeId: 'adventurer',
            name: '絕地翻身',
            description: '瀕死之際，總能想辦法喘過這口氣。',
            icon: 'potion',
            chargeSec: 18,
            unlockFragmentCost: 20,
            effectByLevel: percentLevels('HEAL_SELF', 12, 2),
        },
    ],
    scholar: [
        {
            skillId: 'scholar_weak_point_mark',
            archetypeId: 'scholar',
            name: '弱點標記',
            description: '找出對手裝甲最脆弱的接縫，標記起來留給後續攻擊。',
            icon: 'techGoggles',
            chargeSec: 14,
            unlockFragmentCost: 15,
            effectByLevel: percentLevels('ARMOR_BREAK', 15, 2, { durationSec: 8 }),
        }, {
            skillId: 'scholar_calculated_strike',
            archetypeId: 'scholar',
            name: '精算爆擊',
            description: '把命中率與角度都算得清清楚楚，出手自然更準。',
            icon: 'neuralCirclet',
            chargeSec: 12,
            unlockFragmentCost: 15,
            effectByLevel: critUpLevels(10, 1.5, 8),
        },
    ],
    tinkerer: [
        {
            skillId: 'tinkerer_overload_shock',
            archetypeId: 'tinkerer',
            name: '過載電擊',
            description: '把隨身工具超頻到極限，電流一次擴散向周圍所有目標。',
            icon: 'pulseGauntlet',
            chargeSec: 20,
            unlockFragmentCost: 25,
            effectByLevel: damageLevels('DAMAGE_AOE', 1.0, 0.08),
        }, {
            skillId: 'tinkerer_cryo_trap',
            archetypeId: 'tinkerer',
            name: '急凍陷阱',
            description: '在腳邊布下自製陷阱，凍結貿然靠近的對手。',
            icon: 'engineOil',
            chargeSec: 16,
            unlockFragmentCost: 20,
            effectByLevel: freezeLevels(3, 0.3),
        },
    ],
    gambler: [
        {
            skillId: 'gambler_all_in',
            archetypeId: 'gambler',
            name: '孤注一擲',
            description: '把身家全押上去的這一擊，連帶波及周圍的目標。',
            icon: 'storeBat',
            chargeSec: 18,
            unlockFragmentCost: 25,
            effectByLevel: damageLevels('DAMAGE_SPLASH', 1.4, 0.12, { splashRatio: 0.5 }),
        }, {
            skillId: 'gambler_lucky_ward',
            archetypeId: 'gambler',
            name: '幸運護盾',
            description: '賭一把運氣站在自己這邊，先擋下這一輪的傷害。',
            icon: 'holoShield',
            chargeSec: 14,
            unlockFragmentCost: 15,
            effectByLevel: percentLevels('SHIELD', 18, 2),
        },
    ],
} as const;

/**
 * Every selectable archetype's skills, flattened into a single catalog
 * (character-skills「解鎖技能」/「查詢角色技能資料」): skills are no longer
 * exclusive to the archetype that originally defined them — any character can
 * unlock/equip any of these 10 skills. `archetypeId` on `CharacterSkill` is
 * kept purely as narrative/icon-grouping metadata.
 */
export const ALL_CHARACTER_SKILLS: readonly CharacterSkill[] = Object.values(CHARACTER_SKILLS).flat();

export function getCharacterSkillsByArchetypeId(archetypeId: string): readonly CharacterSkill[] {
    return CHARACTER_SKILLS[archetypeId] ?? [];
}

export function getCharacterSkillById(skillId: string): CharacterSkill | undefined {
    return ALL_CHARACTER_SKILLS.find(skill => skill.skillId === skillId);
}

/**
 * Star-rank bonus applied on top of `effectByLevel[level-1]` (character-skills
 * 「星等對技能效果的加成」): magnitude fields scale up `1 + 0.1 * (star - 1)`.
 * `FREEZE`'s `durationSec` IS a magnitude field (the freeze length itself);
 * every other kind's `durationSec` is a buff-duration field and does NOT
 * scale with star.
 */
export function applyStarBonus(effect: SkillEffect, star: number): SkillEffect {
    const scale = 1 + 0.1 * (star - 1);
    if (scale === 1) return effect;

    return {
        ...effect,
        ...(effect.multiplier !== undefined ? { multiplier: round2(effect.multiplier * scale) } : {}),
        ...(effect.percent !== undefined ? { percent: round2(effect.percent * scale) } : {}),
        ...(effect.flatPercent !== undefined ? { flatPercent: round2(effect.flatPercent * scale) } : {}),
        ...(effect.kind === 'FREEZE' && effect.durationSec !== undefined
            ? { durationSec: round2(effect.durationSec * scale) }
            : {}),
    };
}

/**
 * Star-rank charge-time reduction (character-skills「星等對技能效果的加成」):
 * `chargeSec` shortens by `5% * (star - 1)`, floored at 60% of the original
 * value.
 */
export function applyStarBonusToChargeSec(chargeSec: number, star: number): number {
    const factor = Math.max(0.6, 1 - 0.05 * (star - 1));
    return round2(chargeSec * factor);
}
