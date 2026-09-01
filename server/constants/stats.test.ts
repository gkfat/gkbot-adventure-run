import {
    describe, it, expect, 
} from 'vitest';
import {
    calculateBaseStats, applyEquipmentStats, STATS_CONFIG,
} from './stats';
import { COMBAT_CONFIG } from '../../shared/types/adventure';
import type { Attributes } from '../../shared/types/common';

const attributes = (overrides: Partial<Attributes> = {}): Attributes => ({
    STR: 1, AGI: 1, CON: 1, LUCK: 1, ...overrides,
});

describe('calculateBaseStats — carryCapacity', () => {
    it('equals STR + CON', () => {
        const stats = calculateBaseStats(attributes({
            STR: 5, CON: 3, 
        }));
        expect(stats.carryCapacity).toBe(8);
    });

    it('is unaffected by AGI/LUCK', () => {
        const stats = calculateBaseStats(attributes({
            STR: 2, CON: 2, AGI: 50, LUCK: 50,
        }));
        expect(stats.carryCapacity).toBe(4);
    });
});

describe('applyEquipmentStats — carryCapacity and dodgeChance', () => {
    it('passes carryCapacity through unaffected by equipment', () => {
        const base = calculateBaseStats(attributes({
            STR: 4, CON: 4, 
        }));
        const result = applyEquipmentStats(base, {
            ATK: 999, DEF: 999, 
        });
        expect(result.carryCapacity).toBe(8);
    });

    it('sums equipment dodgeChance into the base dodgeChance', () => {
        const base = calculateBaseStats(attributes());
        const result = applyEquipmentStats(base, { dodgeChance: 0.05 });
        expect(result.dodgeChance).toBeCloseTo(base.dodgeChance + 0.05);
    });

    it('clamps dodgeChance at the DODGE_CAP', () => {
        const base = calculateBaseStats(attributes({ AGI: 100 }));
        const result = applyEquipmentStats(base, { dodgeChance: 0.5 });
        expect(result.dodgeChance).toBeLessThanOrEqual(COMBAT_CONFIG.DODGE_CAP);
    });

    it('clamps dodgeChance at 0 when equipment penalty exceeds the base', () => {
        const base = calculateBaseStats(attributes());
        const result = applyEquipmentStats(base, { dodgeChance: -1 });
        expect(result.dodgeChance).toBe(0);
    });

    it('clamps actionIntervalSec between ACTION_INTERVAL_MIN and _MAX', () => {
        const base = calculateBaseStats(attributes());
        const fast = applyEquipmentStats(base, { actionIntervalSec: -100 });
        const slow = applyEquipmentStats(base, { actionIntervalSec: 100 });
        expect(fast.actionIntervalSec).toBe(STATS_CONFIG.ACTION_INTERVAL_MIN);
        expect(slow.actionIntervalSec).toBe(STATS_CONFIG.ACTION_INTERVAL_MAX);
    });
});
