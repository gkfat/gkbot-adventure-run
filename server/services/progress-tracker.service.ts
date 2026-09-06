/**
 * Real `ProgressTracker` implementation (see shared/types/adventure.ts) —
 * translates the generic run/combat settlement events AdventureRunService
 * emits into QuestService/AchievementService.incrementProgress calls.
 * Wired into AdventureRunService in place of NoopProgressTracker.
 *
 * Event name -> QuestType/AchievementType mapping only covers what
 * AdventureRunService actually emits today (`ADVENTURE_COMPLETED`,
 * `ENEMY_KILLED`, `ENEMY_KILLED_GKBOT`, `ENEMY_KILLED_HUMAN`,
 * `CHARACTER_LEVEL_REACHED`, `FACILITY_DISCOVERED`); other QuestType/
 * AchievementType values (EARN_GOLD, PURCHASE_SHOP, REACH_STEP, MAX_SCORE,
 * TOTAL_GOLD, EQUIP_LEGENDARY, ATTACK_SPEED) have no emitter yet and stay
 * dormant until their owning change (shop, equipment, leaderboard's score
 * redesign, …) adds one — see design.md's event type reference.
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
};

const ACHIEVEMENT_EVENT_TYPE: Record<string, AchievementType> = {
    ADVENTURE_COMPLETED: AchievementType.TOTAL_RUNS,
    ENEMY_KILLED: AchievementType.TOTAL_KILLS,
    ENEMY_KILLED_GKBOT: AchievementType.KILL_GKBOT,
    ENEMY_KILLED_HUMAN: AchievementType.KILL_HUMAN,
    CHARACTER_LEVEL_REACHED: AchievementType.CHARACTER_LEVEL,
    FACILITY_DISCOVERED: AchievementType.DISCOVER_FACILITIES,
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
