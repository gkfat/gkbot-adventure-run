import {
    describe, it, expect, 
} from 'vitest';
import {
    expForKill, goldForKill, applyLuckToGold, itemDropChance,
    blessingPointsForVictory, maxDropRarity, gemsDropTier,
} from './combat';
import { Rarity } from '../../shared/types/common';

describe('expForKill / goldForKill', () => {
    it('scales with enemyLevel and stacks the tier multiplier', () => {
        expect(expForKill(5, 'NORMAL')).toBe(50);
        expect(expForKill(5, 'ELITE')).toBe(100);
        expect(expForKill(5, 'STRONG_ELITE')).toBe(200);
    });

    it('gold ignores tier (spec only ties tier to score/rarity, not gold)', () => {
        expect(goldForKill(5)).toBe(10);
    });
});

describe('applyLuckToGold', () => {
    it('is a no-op at LUCK=0', () => {
        expect(applyLuckToGold(100, 0)).toBe(100);
    });

    it('scales up with LUCK', () => {
        expect(applyLuckToGold(100, 10)).toBe(120);
    });
});

describe('itemDropChance', () => {
    it('clamps to [0, 0.40]', () => {
        expect(itemDropChance(0)).toBeCloseTo(0.15);
        expect(itemDropChance(1000)).toBe(0.40);
        expect(itemDropChance(-1000)).toBe(0);
    });
});

describe('blessingPointsForVictory / maxDropRarity', () => {
    it('grants more of both at higher tiers', () => {
        expect(blessingPointsForVictory('NORMAL')).toBe(1);
        expect(blessingPointsForVictory('ELITE')).toBe(2);
        expect(blessingPointsForVictory('STRONG_ELITE')).toBe(3);

        expect(maxDropRarity('NORMAL')).toBe(Rarity.SR);
        expect(maxDropRarity('ELITE')).toBe(Rarity.SSR);
        expect(maxDropRarity('STRONG_ELITE')).toBe(Rarity.L);
    });
});

describe('gemsDropTier', () => {
    it('picks the matching level bracket', () => {
        expect(gemsDropTier(5)).toEqual({
            maxLevel: 10, chance: 0.03, min: 1, max: 1,
        });
        expect(gemsDropTier(15)).toEqual({
            maxLevel: 20, chance: 0.06, min: 1, max: 3,
        });
        expect(gemsDropTier(25)).toEqual({
            maxLevel: 30, chance: 0.10, min: 3, max: 5,
        });
    });

    it('falls back to the 21-30 tier above level 30 (spec: enemyLevel 超出已定義範圍)', () => {
        expect(gemsDropTier(45)).toEqual(gemsDropTier(25));
    });
});
