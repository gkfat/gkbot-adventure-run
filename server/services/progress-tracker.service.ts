/**
 * Real `ProgressTracker` implementation (see shared/types/adventure.ts) —
 * translates the generic run/combat settlement events AdventureRunService
 * emits into QuestService/AchievementService.incrementProgress calls.
 * Wired into AdventureRunService in place of NoopProgressTracker.
 *
 * Event name -> QuestType/AchievementType mapping only covers what
 * AdventureRunService and ShopService actually emit today
 * (`ADVENTURE_COMPLETED`, `ADVENTURE_COMPLETED_NO_DAMAGE`, `ENEMY_KILLED`,
 * `ENEMY_KILLED_GKBOT`, `ENEMY_KILLED_HUMAN`, `CHARACTER_LEVEL_REACHED`,
 * `FACILITY_DISCOVERED`, `PURCHASE_SHOP`); other QuestType/AchievementType
 * values (EARN_GOLD, REACH_STEP, MAX_SCORE, TOTAL_GOLD, EQUIP_LEGENDARY,
 * ATTACK_SPEED) have no emitter yet and stay dormant until their owning
 * change (equipment, leaderboard's score redesign, …) adds one — see
 * design.md's event type reference.
 */

import type { ProgressTracker } from '../../shared/types/adventure';
import { QuestService } from './quest.service';
import { AchievementService } from './achievement.service';
import {
    QuestType, AchievementType,
} from '../../shared/types/quest';

const QUEST_EVENT_TYPE: Record<string, QuestType> = {
    ADVENTURE_COMPLETED: QuestType.COMPLETE_RUN,
    ENEMY_KILLED: QuestType.KILL_ENEMIES,
    PURCHASE_SHOP: QuestType.PURCHASE_SHOP,
};

const ACHIEVEMENT_EVENT_TYPE: Record<string, AchievementType> = {
    ADVENTURE_COMPLETED: AchievementType.TOTAL_RUNS,
    ENEMY_KILLED: AchievementType.TOTAL_KILLS,
    ENEMY_KILLED_GKBOT: AchievementType.KILL_GKBOT,
    ENEMY_KILLED_HUMAN: AchievementType.KILL_HUMAN,
    CHARACTER_LEVEL_REACHED: AchievementType.CHARACTER_LEVEL,
    FACILITY_DISCOVERED: AchievementType.DISCOVER_FACILITIES,
    ADVENTURE_COMPLETED_NO_DAMAGE: AchievementType.NO_DAMAGE_CLEAR,

    // weapon-proficiency-system (design.md D9): emitted by CombatService.resolve()
    WEAPON_LEVEL_REACHED: AchievementType.WEAPON_PROFICIENCY_LEVEL,
    WEAPON_LEVEL_REACHED_FIST: AchievementType.WEAPON_MASTERY_FIST,
    WEAPON_LEVEL_REACHED_BLADE: AchievementType.WEAPON_MASTERY_BLADE,
    WEAPON_LEVEL_REACHED_BLUNT: AchievementType.WEAPON_MASTERY_BLUNT,
    WEAPON_LEVEL_REACHED_POLEARM: AchievementType.WEAPON_MASTERY_POLEARM,
    WEAPON_LEVEL_REACHED_RANGED: AchievementType.WEAPON_MASTERY_RANGED,
    WEAPON_LEVEL_REACHED_DUAL_WIELD: AchievementType.WEAPON_MASTERY_DUAL_WIELD,
    WEAPON_TYPE_MASTERED: AchievementType.WEAPON_TYPES_MASTERED,
};

export class QuestAchievementProgressTracker implements ProgressTracker {
    private questService = new QuestService();
    private achievementService = new AchievementService();

    async incrementProgress(event: {
        accountId: string; characterId: string; type: string; amount: number;
    }): Promise<void> {
        const questType = QUEST_EVENT_TYPE[event.type];
        const achievementType = ACHIEVEMENT_EVENT_TYPE[event.type];

        const questPromise = questType
            ? this.questService.incrementProgress(event.characterId, questType, event.amount)
            : Promise.resolve();
        const achievementPromise = achievementType
            ? this.achievementService.incrementProgress(event.characterId, achievementType, event.amount)
            : Promise.resolve();

        await Promise.all([questPromise, achievementPromise]);
    }
}
