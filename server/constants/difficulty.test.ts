import {
    describe, it, expect, 
} from 'vitest';
import {
    getEnemyLevel, getStatMultipliers, rollWaveCount, rollEnemyCount,
    getWave2Chance, getEnemy2Chance, getEnemy3Chance,
} from './difficulty';

describe('getEnemyLevel', () => {
    it('follows 1 + floor(step / 2)', () => {
        expect(getEnemyLevel(0)).toBe(1);
        expect(getEnemyLevel(1)).toBe(1);
        expect(getEnemyLevel(10)).toBe(6);
    });
});

describe('getStatMultipliers', () => {
    it('applies the NORMAL tier HP bonus (no atk/def bonus) at level 1', () => {
        expect(getStatMultipliers(1, 'NORMAL')).toEqual({
            hp: 1.3, atk: 1, def: 1,
        });
    });

    it('scales up with level and stacks the tier multiplier', () => {
        const normal = getStatMultipliers(6, 'NORMAL');
        const elite = getStatMultipliers(6, 'ELITE');
        const strongElite = getStatMultipliers(6, 'STRONG_ELITE');

        expect(normal.hp).toBeGreaterThan(1);
        expect(elite.hp).toBeGreaterThan(normal.hp);
        expect(strongElite.hp).toBeGreaterThan(elite.hp);
    });

    it('BOSS multipliers exceed STRONG_ELITE across hp/atk/def at the same enemyLevel', () => {
        const strongElite = getStatMultipliers(6, 'STRONG_ELITE');
        const boss = getStatMultipliers(6, 'BOSS');

        expect(boss.hp).toBeGreaterThan(strongElite.hp);
        expect(boss.atk).toBeGreaterThan(strongElite.atk);
        expect(boss.def).toBeGreaterThan(strongElite.def);
    });

    it('PARTIAL_ACTIVE severity (default) matches the pre-change curve exactly', () => {
        expect(getStatMultipliers(6, 'NORMAL', 'PARTIAL_ACTIVE')).toEqual(getStatMultipliers(6, 'NORMAL'));
    });

    it('HIGHLY_ACTIVE severity is not lower than DEEP_WRECK across hp/atk/def, same step/tier', () => {
        const deepWreck = getStatMultipliers(6, 'NORMAL', 'DEEP_WRECK');
        const highlyActive = getStatMultipliers(6, 'NORMAL', 'HIGHLY_ACTIVE');

        expect(highlyActive.hp).toBeGreaterThanOrEqual(deepWreck.hp);
        expect(highlyActive.atk).toBeGreaterThanOrEqual(deepWreck.atk);
        expect(highlyActive.def).toBeGreaterThanOrEqual(deepWreck.def);
    });
});

describe('rollWaveCount / rollEnemyCount', () => {
    it('stays within configured caps across the probability range', () => {
        for (let i = 0; i <= 10; i++) {
            const rngValue = i / 10;
            expect([1, 2]).toContain(rollWaveCount(50, rngValue));
            expect([
                1,
                2,
                3,
            ]).toContain(rollEnemyCount(50, rngValue));
        }
    });

    it('rolls the highest tier at rngValue = 0', () => {
        expect(rollWaveCount(50, 0)).toBe(2);
        expect(rollEnemyCount(50, 0)).toBe(3);
    });

    it('rolls the lowest tier as rngValue approaches 1', () => {
        expect(rollWaveCount(0, 0.999)).toBe(1);
        expect(rollEnemyCount(0, 0.999)).toBe(1);
    });

    it('PARTIAL_ACTIVE severity (default) matches the pre-change chance exactly', () => {
        expect(getWave2Chance(50, 'PARTIAL_ACTIVE')).toBe(getWave2Chance(50));
        expect(getEnemy2Chance(50, 'PARTIAL_ACTIVE')).toBe(getEnemy2Chance(50));
        expect(getEnemy3Chance(50, 'PARTIAL_ACTIVE')).toBe(getEnemy3Chance(50));
    });

    it('HIGHLY_ACTIVE severity raises multi-wave/multi-enemy chance above DEEP_WRECK, same step', () => {
        expect(getWave2Chance(50, 'HIGHLY_ACTIVE')).toBeGreaterThan(getWave2Chance(50, 'DEEP_WRECK'));
        expect(getEnemy2Chance(50, 'HIGHLY_ACTIVE')).toBeGreaterThan(getEnemy2Chance(50, 'DEEP_WRECK'));
        expect(getEnemy3Chance(50, 'HIGHLY_ACTIVE')).toBeGreaterThan(getEnemy3Chance(50, 'DEEP_WRECK'));
    });

    it('HIGHLY_ACTIVE severity still clamps within the existing caps near max step', () => {
        expect(getWave2Chance(1000, 'HIGHLY_ACTIVE')).toBeLessThanOrEqual(0.60);
        expect(getEnemy2Chance(1000, 'HIGHLY_ACTIVE')).toBeLessThanOrEqual(0.70);
        expect(getEnemy3Chance(1000, 'HIGHLY_ACTIVE')).toBeLessThanOrEqual(0.45);
    });
});
