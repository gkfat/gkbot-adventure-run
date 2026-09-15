import {
    describe, it, expect,
} from 'vitest';
import { applyWeightOverloadPenalty } from './calculateStats';
import type { Stats } from '../types/common';

function stats(overrides: Partial<Omit<Stats, 'HP_CURRENT'>> = {}): Omit<Stats, 'HP_CURRENT'> {
    return {
        ATK: 10,
        DEF: 5,
        HP_MAX: 100,
        actionIntervalSec: 3,
        critChance: 0.1,
        critMultiplier: 1.5,
        dodgeChance: 0.1,
        carryCapacity: 10,
        ...overrides,
    };
}

describe('applyWeightOverloadPenalty (weapon-weight-class D6)', () => {
    it('is a no-op when equipped weight is at or under carryCapacity', () => {
        const result = applyWeightOverloadPenalty(stats(), 10);
        expect(result).toEqual(stats());
    });

    it('applies +0.5s actionIntervalSec at 1 point over carryCapacity', () => {
        const result = applyWeightOverloadPenalty(stats(), 11);
        expect(result.actionIntervalSec).toBeCloseTo(3.5);
        expect(result.dodgeChance).toBeCloseTo(0.1);
        expect(result.critChance).toBeCloseTo(0.1);
        expect(result.DEF).toBe(5);
    });

    it('stacks the dodgeChance penalty on top of the actionIntervalSec penalty at 2 points over', () => {
        const result = applyWeightOverloadPenalty(stats(), 12);
        expect(result.actionIntervalSec).toBeCloseTo(3.5);
        expect(result.dodgeChance).toBeCloseTo(0.07);
        expect(result.critChance).toBeCloseTo(0.1);
    });

    it('stacks the critChance penalty on top at 3 points over', () => {
        const result = applyWeightOverloadPenalty(stats(), 13);
        expect(result.actionIntervalSec).toBeCloseTo(3.5);
        expect(result.dodgeChance).toBeCloseTo(0.07);
        expect(result.critChance).toBeCloseTo(0.07);
        expect(result.DEF).toBe(5);
    });

    it('applies an escalating DEF penalty for every point beyond 3 over', () => {
        const overBy4 = applyWeightOverloadPenalty(stats(), 14);
        expect(overBy4.DEF).toBe(4);

        const overBy6 = applyWeightOverloadPenalty(stats(), 16);
        expect(overBy6.DEF).toBe(2);
    });

    it('lifts entirely once weight no longer exceeds carryCapacity (e.g. after unequipping)', () => {
        const overloaded = applyWeightOverloadPenalty(stats(), 12);
        expect(overloaded.actionIntervalSec).toBeGreaterThan(stats().actionIntervalSec);

        const noLongerOverloaded = applyWeightOverloadPenalty(stats(), 9);
        expect(noLongerOverloaded).toEqual(stats());
    });

    it('stacks on top of (does not replace) a pre-existing HEAVY-item penalty already baked into the input stats', () => {
        // Simulates stats already carrying a HEAVY item's own actionSpeedMod/
        // dodgeChanceMod penalty (applied upstream by sumEquipmentStats) —
        // the overload penalty must add to it, not overwrite it.
        const alreadyPenalized = stats({
            actionIntervalSec: 3.2, dodgeChance: 0.05,
        });
        const result = applyWeightOverloadPenalty(alreadyPenalized, 11);
        expect(result.actionIntervalSec).toBeCloseTo(3.7);
        expect(result.dodgeChance).toBeCloseTo(0.05);
    });
});
