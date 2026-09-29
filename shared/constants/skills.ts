/**
 * Character/enemy skills (character-skills): Lv.1-10 exp curve for unlocked
 * skills, fragment/exp conversion rates, and the level -> equip-slot-count
 * formula. Shared (not server-only) so the frontend skill tab can render
 * exp-to-next-level progress without duplicating the curve — same rationale
 * as shared/constants/weaponProficiency.ts.
 *
 * ASSUMPTION (design.md Open Questions): exact numeric values are initial
 * balance values, freely tunable via docs/game-design/balance later.
 */
export const SKILL_MAX_LEVEL = 10;

/** Cumulative exp required to REACH each level (level 1 = 0, the floor). */
export const SKILL_EXP_TABLE: Record<number, number> = {
    1: 0,
    2: 40,
    3: 100,
    4: 200,
    5: 360,
    6: 600,
    7: 950,
    8: 1450,
    9: 2150,
    10: 3100,
};

/** exp granted per actual in-combat skill trigger (combat-engine settlement). */
export const EXP_PER_SKILL_TRIGGER = 8;

/** Fixed fragment amount granted per successful combat-victory fragment drop. */
export const SKILL_FRAGMENT_DROP_AMOUNT = 1;

/** Highest star rank a skill can reach. */
export const SKILL_STAR_MAX = 5;

/**
 * Fragments required to star-up TO the given star rank (only keys 2..SKILL_STAR_MAX
 * are meaningful — a skill starts at star 1 on unlock, so there is no cost to
 * "reach" star 1).
 */
export const SKILL_STAR_UP_FRAGMENT_COST: Record<number, number> = {
    2: 50,
    3: 200,
    4: 450,
    5: 800,
};

/** Fixed skill exp granted per consumed Skill Exp Chip (use-exp-chip action). */
export const SKILL_EXP_PER_CHIP = 50;

/** Fixed chip amount granted per successful combat-victory chip drop. */
export const SKILL_EXP_CHIP_DROP_AMOUNT = 1;

/** Every N character levels opens one more equip slot, up to MAX_EQUIPPED_SKILLS. */
export const SKILL_SLOT_LEVEL_INTERVAL = 7;

/** Hard cap on simultaneously equipped skills, regardless of level. */
export const MAX_EQUIPPED_SKILLS = 3;

/**
 * Derive the skill level (1-10) for a given cumulative exp total.
 */
export function getSkillLevelForExp(exp: number): number {
    let level = 1;
    for (let l = SKILL_MAX_LEVEL; l >= 1; l--) {
        if (exp >= (SKILL_EXP_TABLE[l] ?? 0)) {
            level = l;
            break;
        }
    }
    return level;
}

/**
 * Number of skill-equip slots open at a given character level:
 * Lv.1~6 -> 1, Lv.7~13 -> 2, Lv.14+ -> 3 (character-skills「技能佩戴欄位依角色等級開放」).
 */
export function getUnlockedSkillSlotCount(level: number): number {
    return Math.min(MAX_EQUIPPED_SKILLS, 1 + Math.floor(level / SKILL_SLOT_LEVEL_INTERVAL));
}
