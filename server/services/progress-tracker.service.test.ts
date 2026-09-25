import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import { AchievementType } from '../../shared/types/quest';

const {
    questIncrementProgressMock, achievementIncrementProgressMock,
} = vi.hoisted(() => ({
    questIncrementProgressMock: vi.fn(),
    achievementIncrementProgressMock: vi.fn(),
}));

vi.mock('./quest.service', () => ({
    QuestService: vi.fn().mockImplementation(function QuestServiceMock() {
        return { incrementProgress: questIncrementProgressMock };
    }),
}));

vi.mock('./achievement.service', () => ({
    AchievementService: vi.fn().mockImplementation(function AchievementServiceMock() {
        return { incrementProgress: achievementIncrementProgressMock };
    }),
}));

// eslint-disable-next-line import/first
import { QuestAchievementProgressTracker } from './progress-tracker.service';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('QuestAchievementProgressTracker — weapon proficiency event wiring (weapon-proficiency-system D9)', () => {
    it.each([
        ['WEAPON_LEVEL_REACHED', AchievementType.WEAPON_PROFICIENCY_LEVEL],
        ['WEAPON_LEVEL_REACHED_FIST', AchievementType.WEAPON_MASTERY_FIST],
        ['WEAPON_LEVEL_REACHED_BLADE', AchievementType.WEAPON_MASTERY_BLADE],
        ['WEAPON_LEVEL_REACHED_BLUNT', AchievementType.WEAPON_MASTERY_BLUNT],
        ['WEAPON_LEVEL_REACHED_POLEARM', AchievementType.WEAPON_MASTERY_POLEARM],
        ['WEAPON_LEVEL_REACHED_RANGED', AchievementType.WEAPON_MASTERY_RANGED],
        ['WEAPON_LEVEL_REACHED_DUAL_WIELD', AchievementType.WEAPON_MASTERY_DUAL_WIELD],
        ['WEAPON_TYPE_MASTERED', AchievementType.WEAPON_TYPES_MASTERED],
    ])('routes event %s to AchievementType %s', async (eventType, achievementType) => {
        const tracker = new QuestAchievementProgressTracker();

        await tracker.incrementProgress({
            accountId: 'account-1', characterId: 'char-1', type: eventType, amount: 5,
        });

        expect(achievementIncrementProgressMock).toHaveBeenCalledWith('char-1', achievementType, 5);
        // These events have no QuestType mapping — quest progress must not be touched.
        expect(questIncrementProgressMock).not.toHaveBeenCalled();
    });
});

describe('QuestAchievementProgressTracker — GOLD_EARNED event wiring (拾荒富豪 TOTAL_GOLD achievement)', () => {
    it('routes GOLD_EARNED to AchievementType.TOTAL_GOLD', async () => {
        const tracker = new QuestAchievementProgressTracker();

        await tracker.incrementProgress({
            accountId: 'account-1', characterId: 'char-1', type: 'GOLD_EARNED', amount: 36,
        });

        expect(achievementIncrementProgressMock).toHaveBeenCalledWith('char-1', AchievementType.TOTAL_GOLD, 36);
        // No QuestType mapping for gold earned — quest progress must not be touched.
        expect(questIncrementProgressMock).not.toHaveBeenCalled();
    });
});
