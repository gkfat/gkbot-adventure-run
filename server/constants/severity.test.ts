import {
    describe, it, expect,
} from 'vitest';
import {
    getSeverityChances, rollSeverityTier, rollFactionType, SEVERITY_CONFIG,
} from '../../shared/types/adventure';

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
