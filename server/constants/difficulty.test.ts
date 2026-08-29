import {
    describe, it, expect, 
} from 'vitest';
import {
    getEnemyLevel, getStatMultipliers, rollWaveCount, rollEnemyCount,
} from './difficulty';

describe('getEnemyLevel', () => {
    it('follows 1 + floor(step / 2)', () => {
        expect(getEnemyLevel(0)).toBe(1);
        expect(getEnemyLevel(1)).toBe(1);
        expect(getEnemyLevel(10)).toBe(6);
    });
});

describe('getStatMultipliers', () => {
    it('applies no tier bonus for NORMAL at level 1', () => {
        expect(getStatMultipliers(1, 'NORMAL')).toEqual({
            hp: 1, atk: 1, def: 1,
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
});
