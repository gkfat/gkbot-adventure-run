/**
 * Achievement templates — milestone-oriented, lifetime-once per character.
 * Reward gems scale 3-10 with difficulty (see openspec/changes/quests-and-achievements).
 *
 * Wiring status (see server/services/progress-tracker.service.ts and
 * openspec/changes/quests-and-achievements/design.md's event type reference):
 * TOTAL_KILLS, TOTAL_RUNS, KILL_GKBOT, KILL_HUMAN, CHARACTER_LEVEL,
 * DISCOVER_FACILITIES, and NO_DAMAGE_CLEAR are wired to real adventure-run-core
 * events. MAX_SCORE,
 * REACH_STEP, TOTAL_GOLD, EQUIP_LEGENDARY, and ATTACK_SPEED have no emitter
 * yet (no run "score" system, no per-run step reporting, and stat-threshold
 * checks would need hooking into every equip/attribute/talent call site) —
 * they stay inert, same as before this batch, until their owning system
 * reports progress.
 */

import type { AchievementTemplate } from '../../../shared/types';
import { AchievementType } from '../../../shared/types';
import { STAGE_CONFIG } from '../../../shared/types/adventure';
import { RESOURCE_LIMITS } from '../../../shared/types/common';

export const ACHIEVEMENT_TEMPLATES: Record<string, AchievementTemplate> = {
    'first_blood': {
        templateId: 'first_blood',
        type: AchievementType.TOTAL_KILLS,
        name: '初見殺',
        description: '擊殺你的第一隻敵人',
        targetCount: 1,
        rewardGems: 3,
    },
    'monster_hunter': {
        templateId: 'monster_hunter',
        type: AchievementType.TOTAL_KILLS,
        name: '怪物獵人',
        description: '累計擊殺 100 隻敵人',
        targetCount: 100,
        rewardGems: 5,
    },
    'slaughter_instinct': {
        templateId: 'slaughter_instinct',
        type: AchievementType.TOTAL_KILLS,
        name: '屠殺本能',
        description: '累計擊殺 1,000 隻敵人',
        targetCount: 1000,
        rewardGems: 8,
    },
    'adventurer': {
        templateId: 'adventurer',
        type: AchievementType.TOTAL_RUNS,
        name: '冒險家',
        description: '累計完成 10 次冒險',
        targetCount: 10,
        rewardGems: 5,
    },
    'veteran_survivor': {
        templateId: 'veteran_survivor',
        type: AchievementType.TOTAL_RUNS,
        name: '百戰生還者',
        description: '累計完成 100 次冒險',
        targetCount: 100,
        rewardGems: 8,
    },
    'high_score': {
        templateId: 'high_score',
        type: AchievementType.MAX_SCORE,
        name: '高分紀錄',
        description: '單場冒險分數達到 10,000 分',
        targetCount: 10000,
        mode: 'PEAK',
        rewardGems: 5,
    },
    'legendary_score': {
        templateId: 'legendary_score',
        type: AchievementType.MAX_SCORE,
        name: '傳奇分數',
        description: '單場冒險分數達到 50,000 分',
        targetCount: 50000,
        mode: 'PEAK',
        rewardGems: 8,
    },
    'deep_incursion': {
        templateId: 'deep_incursion',
        type: AchievementType.REACH_STEP,
        name: '深入險境',
        description: '單場冒險推進到第 30 步',
        targetCount: 30,
        mode: 'PEAK',
        rewardGems: 5,
    },
    'abyss_explorer': {
        templateId: 'abyss_explorer',
        type: AchievementType.REACH_STEP,
        name: '深淵探索者',
        description: '單場冒險推進到第 50 步',
        targetCount: 50,
        mode: 'PEAK',
        rewardGems: 8,
    },
    'scrap_tycoon': {
        templateId: 'scrap_tycoon',
        type: AchievementType.TOTAL_GOLD,
        name: '拾荒富豪',
        description: '累計獲得 100,000 枚金幣',
        targetCount: 100000,
        rewardGems: 5,
    },
    'legendary_collector': {
        templateId: 'legendary_collector',
        type: AchievementType.EQUIP_LEGENDARY,
        name: '傳說裝備收藏家',
        description: '裝備一件傳說級裝備',
        targetCount: 1,
        rewardGems: 5,
    },
    'chassis_hunter': {
        templateId: 'chassis_hunter',
        type: AchievementType.KILL_GKBOT,
        name: '機殼獵人',
        description: '累計破壞 100 具 GkBot',
        targetCount: 100,
        rewardGems: 5,
    },
    'chassis_crusher': {
        templateId: 'chassis_crusher',
        type: AchievementType.KILL_GKBOT,
        name: '機殼粉碎者',
        description: '累計破壞 1,000 具 GkBot',
        targetCount: 1000,
        rewardGems: 8,
    },
    'purger': {
        templateId: 'purger',
        type: AchievementType.KILL_HUMAN,
        name: '肅清者',
        description: '累計擊殺 100 名人類敵人',
        targetCount: 100,
        rewardGems: 5,
    },
    'ruthless_hunter': {
        templateId: 'ruthless_hunter',
        type: AchievementType.KILL_HUMAN,
        name: '無情獵殺者',
        description: '累計擊殺 500 名人類敵人',
        targetCount: 500,
        rewardGems: 6,
    },
    'wasteland_cartographer': {
        templateId: 'wasteland_cartographer',
        type: AchievementType.DISCOVER_FACILITIES,
        name: '廢土地圖測繪員',
        description: '發現所有類型的設施',
        // Facility themes cycle deterministically by chapter index
        // (getFacilityTheme, shared/types/adventure.ts) — reaching one full
        // cycle guarantees every theme has been seen. FACILITY_DISCOVERED
        // fires once at character creation (chapterIndex 0's theme, already
        // "generated" the moment the character exists) and once per
        // subsequent chapterAdvanced, so the target spans the full list.
        // Derived from the list length so this stays correct if more themes
        // are added later.
        targetCount: STAGE_CONFIG.FACILITY_THEMES.length,
        rewardGems: 6,
    },
    'swift_heart': {
        templateId: 'swift_heart',
        type: AchievementType.ATTACK_SPEED,
        name: '疾風之心',
        description: '角色攻速降到 1.5 秒以下',
        targetCount: 1.5,
        mode: 'PEAK',
        compare: 'LTE',
        rewardGems: 6,
    },
    'max_level': {
        templateId: 'max_level',
        type: AchievementType.CHARACTER_LEVEL,
        name: '滿級戰士',
        description: `角色等級達到 ${RESOURCE_LIMITS.LEVEL_MAX} 級`,
        targetCount: RESOURCE_LIMITS.LEVEL_MAX,
        mode: 'PEAK',
        rewardGems: 10,
    },
    'unscathed_clear': {
        templateId: 'unscathed_clear',
        type: AchievementType.NO_DAMAGE_CLEAR,
        name: '無傷通關',
        description: '完成一次冒險，且過程中不曾受到任何傷害',
        targetCount: 1,
        rewardGems: 5,
    },
};

/**
 * Get all achievement templates as array
 */
export function getAllAchievementTemplates(): AchievementTemplate[] {
    return Object.values(ACHIEVEMENT_TEMPLATES);
}

/**
 * Get achievement template by ID
 */
export function getAchievementTemplate(templateId: string): AchievementTemplate | undefined {
    return ACHIEVEMENT_TEMPLATES[templateId];
}
