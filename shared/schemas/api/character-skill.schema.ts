/**
 * API schemas for character skill endpoints (character-skills)
 */

import { z } from 'zod';

const skillEffectSchema = z.object({
    kind: z.enum([
        'DAMAGE_SINGLE',
        'DAMAGE_AOE',
        'DAMAGE_SPLASH',
        'FREEZE',
        'HASTE_SELF',
        'HEAL_SELF',
        'DEFENSE_UP',
        'CRIT_UP',
        'ARMOR_BREAK',
        'DOT',
        'SHIELD',
    ]),
    multiplier: z.number().optional(),
    splashRatio: z.number().optional(),
    percent: z.number().optional(),
    flatPercent: z.number().optional(),
    durationSec: z.number().optional(),
    tickDamage: z.number().optional(),
    ticks: z.number().optional(),
});

/**
 * One skill entry in the skills view. `description`/`effect`/`level`/`exp`/
 * `isEquipped` are only present once the character has taken/unlocked the
 * skill — see spec.md「查詢角色技能資料」for the exact disclosure rule.
 */
const skillEntrySchema = z.object({
    skillId: z.string(),
    name: z.string(),
    icon: z.string(),
    unlockFragmentCost: z.number().int().min(0),
    fragmentCount: z.number().int().min(0).optional(),
    description: z.string().optional(),
    unlocked: z.boolean(),
    level: z.number().int().min(1).max(10).optional(),
    exp: z.number().int().min(0).optional(),
    effect: skillEffectSchema.optional(),
    // 只有已解鎖的技能才附上——Lv.1~SKILL_MAX_LEVEL 全部等級的效果數值，供強化
    // UI 依「目前選擇要消耗的碎片數量」即時算出會落在哪一級、預覽該級的實際效果
    // （known-issue.md #2：疊加大量碎片時應該能連續往後計算多級，不能卡在下一級
    // 就不動）。
    effectByLevel: z.array(skillEffectSchema).optional(),
    // 只有已解鎖的技能才附上（不影響未解鎖技能的資訊揭露規則）——供前端戰鬥
    // 演出畫出充能條使用，見 adventure-run-presentation 的技能充能條需求。
    chargeSec: z.number().optional(),
    isEquipped: z.boolean().optional(),
});

/**
 * GET /api/character/:characterId/skills
 */
export const getCharacterSkillsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        skills: z.array(skillEntrySchema),
        unlockedSlotCount: z.number().int().min(1).max(3),
        equippedSkillIds: z.tuple([
            z.string().nullable(),
            z.string().nullable(),
            z.string().nullable(),
        ]),
    }),
});

/**
 * POST /api/character/:characterId/skills/unlock
 */
export const unlockSkillRequestSchema = z.object({ skillId: z.string().min(1) }).strict();

export const unlockSkillResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        skillFragments: z.record(z.string(), z.number().int().min(0)),
        unlockedSkills: z.record(z.string(), z.object({
            exp: z.number().int().min(0), level: z.number().int().min(1).max(10),
        })),
    }),
});

/**
 * POST /api/character/:characterId/skills/strengthen
 */
export const strengthenSkillRequestSchema = z.object({
    skillId: z.string().min(1),
    fragmentsToSpend: z.number().int().min(1),
}).strict();

export const strengthenSkillResponseSchema = unlockSkillResponseSchema;

/**
 * POST /api/character/:characterId/skills/equip
 */
export const equipSkillRequestSchema = z.object({
    skillId: z.string().nullable(),
    slotIndex: z.union([
        z.literal(0),
        z.literal(1),
        z.literal(2),
    ]),
}).strict();

export const equipSkillResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        equippedSkillIds: z.tuple([
            z.string().nullable(),
            z.string().nullable(),
            z.string().nullable(),
        ]), 
    }),
});

export type SkillEntry = z.infer<typeof skillEntrySchema>;
export type GetCharacterSkillsResponse = z.infer<typeof getCharacterSkillsResponseSchema>;
export type UnlockSkillRequest = z.infer<typeof unlockSkillRequestSchema>;
export type UnlockSkillResponse = z.infer<typeof unlockSkillResponseSchema>;
export type StrengthenSkillRequest = z.infer<typeof strengthenSkillRequestSchema>;
export type StrengthenSkillResponse = z.infer<typeof strengthenSkillResponseSchema>;
export type EquipSkillRequest = z.infer<typeof equipSkillRequestSchema>;
export type EquipSkillResponse = z.infer<typeof equipSkillResponseSchema>;
