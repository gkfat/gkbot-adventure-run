import {
    describe, it, expect,
} from 'vitest';
import {
    getSeverityChances, rollSeverityTier, rollFactionType, SEVERITY_CONFIG,
    getProgressionFactor, getLevelCountRange, getStageNodeCountRange, rollChapterTotalLevels,
    PROGRESSION_CONFIG,
} from './adventure';

describe('getSeverityChances', () => {
    it('increases HIGHLY_ACTIVE/PARTIAL_ACTIVE chance with chapterIndex, but caps it', () => {
        const early = getSeverityChances(0);
        const late = getSeverityChances(100);

        expect(late.HIGHLY_ACTIVE).toBeGreaterThan(early.HIGHLY_ACTIVE);
        expect(late.HIGHLY_ACTIVE).toBeLessThanOrEqual(SEVERITY_CONFIG.HIGHLY_ACTIVE_CAP);
        expect(late.PARTIAL_ACTIVE).toBeLessThanOrEqual(SEVERITY_CONFIG.PARTIAL_ACTIVE_CAP);
    });

    it('never lets chances sum past 1, leaving DEEP_WRECK a non-negative remainder', () => {
        for (const chapterIndex of [
            0,
            5,
            50,
            500,
        ]) {
            const chances = getSeverityChances(chapterIndex);
            expect(chances.DEEP_WRECK).toBeGreaterThanOrEqual(0);
            expect(chances.HIGHLY_ACTIVE + chances.PARTIAL_ACTIVE + chances.DEEP_WRECK).toBeCloseTo(1);
        }
    });

    it('keeps randomness even at very high chapterIndex — no tier reaches 100%', () => {
        const chances = getSeverityChances(10000);
        expect(chances.HIGHLY_ACTIVE).toBeLessThan(1);
        expect(chances.PARTIAL_ACTIVE).toBeLessThan(1);
        expect(chances.DEEP_WRECK).toBeGreaterThan(0);
    });
});

describe('rollSeverityTier', () => {
    it('rolls the highest tier at rngValue = 0 and the lowest as rngValue approaches 1', () => {
        expect(rollSeverityTier(50, 0)).toBe('HIGHLY_ACTIVE');
        expect(rollSeverityTier(50, 0.999)).toBe('DEEP_WRECK');
    });

    it('a higher chapterIndex is at least as likely to roll HIGHLY_ACTIVE at the same rngValue', () => {
        const chances = getSeverityChances(0);
        const rngValue = chances.HIGHLY_ACTIVE + 0.001; // just above chapter 0's threshold
        expect(rollSeverityTier(0, rngValue)).not.toBe('HIGHLY_ACTIVE');
        expect(rollSeverityTier(100, rngValue)).toBe('HIGHLY_ACTIVE');
    });
});

describe('rollFactionType', () => {
    it('HIGHLY_ACTIVE has a higher HUMAN chance than DEEP_WRECK/PARTIAL_ACTIVE', () => {
        expect(SEVERITY_CONFIG.HUMAN_FACTION_CHANCE.HIGHLY_ACTIVE)
            .toBeGreaterThan(SEVERITY_CONFIG.HUMAN_FACTION_CHANCE.DEEP_WRECK);
        expect(SEVERITY_CONFIG.HUMAN_FACTION_CHANCE.HIGHLY_ACTIVE)
            .toBeGreaterThan(SEVERITY_CONFIG.HUMAN_FACTION_CHANCE.PARTIAL_ACTIVE);
    });

    it('DEEP_WRECK still has a non-zero HUMAN chance (stray hostiles)', () => {
        expect(SEVERITY_CONFIG.HUMAN_FACTION_CHANCE.DEEP_WRECK).toBeGreaterThan(0);
        expect(rollFactionType('DEEP_WRECK', 0)).toBe('HUMAN');
    });

    it('rolls GKBOT once rngValue clears the HUMAN threshold for the tier', () => {
        expect(rollFactionType('HIGHLY_ACTIVE', 0.999)).toBe('GKBOT');
        expect(rollFactionType('PARTIAL_ACTIVE', 0.999)).toBe('GKBOT');
    });
});

describe('getProgressionFactor', () => {
    it('is 0 at minimum power ratio and chapterIndex 0, 1 at maximum power ratio and late chapterIndex', () => {
        const lowPower = PROGRESSION_CONFIG.BASE_POWER * PROGRESSION_CONFIG.POWER_RATIO_MIN;
        const highPower = PROGRESSION_CONFIG.BASE_POWER * PROGRESSION_CONFIG.POWER_RATIO_MAX
            * (1 + PROGRESSION_CONFIG.POWER_GROWTH_PER_CHAPTER * PROGRESSION_CONFIG.MAX_CHAPTER_FOR_SCALING);

        expect(getProgressionFactor(lowPower, 0)).toBeCloseTo(0);
        expect(getProgressionFactor(highPower, PROGRESSION_CONFIG.MAX_CHAPTER_FOR_SCALING)).toBeCloseTo(1);
    });

    it('increases with characterPower for a fixed chapterIndex', () => {
        const low = getProgressionFactor(PROGRESSION_CONFIG.BASE_POWER * 0.5, 5);
        const high = getProgressionFactor(PROGRESSION_CONFIG.BASE_POWER * 3, 5);
        expect(high).toBeGreaterThan(low);
    });

    it('increases with chapterIndex when power keeps pace with the expected curve (ratio held at 1)', () => {
        const expectedPowerAt = (chapterIndex: number) => PROGRESSION_CONFIG.BASE_POWER
            * (1 + PROGRESSION_CONFIG.POWER_GROWTH_PER_CHAPTER * chapterIndex);
        const early = getProgressionFactor(expectedPowerAt(0), 0);
        const late = getProgressionFactor(expectedPowerAt(15), 15);
        expect(late).toBeGreaterThan(early);
    });

    it('can decrease with chapterIndex if power stays flat while the expected curve rises', () => {
        const early = getProgressionFactor(PROGRESSION_CONFIG.BASE_POWER, 0);
        const late = getProgressionFactor(PROGRESSION_CONFIG.BASE_POWER, 15);
        expect(late).toBeLessThan(early);
    });

    it('never leaves [0, 1] even for extreme inputs', () => {
        expect(getProgressionFactor(0, 0)).toBeGreaterThanOrEqual(0);
        expect(getProgressionFactor(1_000_000, 1_000_000)).toBeLessThanOrEqual(1);
    });
});

describe('getLevelCountRange / getStageNodeCountRange', () => {
    it('returns the low-end range for a weak character in an early chapter', () => {
        const power = PROGRESSION_CONFIG.BASE_POWER * PROGRESSION_CONFIG.POWER_RATIO_MIN;
        expect(getLevelCountRange(power, 0)).toEqual({
            min: 3, max: 7, 
        });
        expect(getStageNodeCountRange(power, 0)).toEqual({
            min: 5, max: 10, 
        });
    });

    it('returns the high-end range for a strong character deep into progression', () => {
        const power = PROGRESSION_CONFIG.BASE_POWER * PROGRESSION_CONFIG.POWER_RATIO_MAX
            * (1 + PROGRESSION_CONFIG.POWER_GROWTH_PER_CHAPTER * PROGRESSION_CONFIG.MAX_CHAPTER_FOR_SCALING);
        expect(getLevelCountRange(power, PROGRESSION_CONFIG.MAX_CHAPTER_FOR_SCALING)).toEqual({
            min: 8, max: 12, 
        });
        expect(getStageNodeCountRange(power, PROGRESSION_CONFIG.MAX_CHAPTER_FOR_SCALING)).toEqual({
            min: 8, max: 15, 
        });
    });

    it('always keeps min <= max across the full factor range', () => {
        for (const chapterIndex of [
            0,
            3,
            10,
            20,
            40,
        ]) {
            for (const powerMultiplier of [
                0.1,
                0.5,
                1,
                2,
                5,
            ]) {
                const power = PROGRESSION_CONFIG.BASE_POWER * powerMultiplier;
                const levelRange = getLevelCountRange(power, chapterIndex);
                const stageRange = getStageNodeCountRange(power, chapterIndex);
                expect(levelRange.min).toBeLessThanOrEqual(levelRange.max);
                expect(stageRange.min).toBeLessThanOrEqual(stageRange.max);
            }
        }
    });
});

describe('rollChapterTotalLevels', () => {
    it('stays within the resolved range across the full rngValue span', () => {
        const power = PROGRESSION_CONFIG.BASE_POWER;
        const range = getLevelCountRange(power, 5);
        for (const rngValue of [
            0,
            0.25,
            0.5,
            0.75,
            0.999,
        ]) {
            const rolled = rollChapterTotalLevels(power, 5, rngValue);
            expect(rolled).toBeGreaterThanOrEqual(range.min);
            expect(rolled).toBeLessThanOrEqual(range.max);
        }
    });
});
