import {
    describe, it, expect, vi, afterEach,
} from 'vitest';
import {
    rollRarity, rollStats, generateItemInstance,
} from './item.service';
import { Rarity } from '../../shared/types/common';
import {
    ItemType, ItemSource,
} from '../../shared/types/item';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('rollRarity', () => {
    it('distributes rolls across all weighted rarities of a template', () => {
        const counts: Record<string, number> = {};
        for (let i = 0; i < 500; i++) {
            const rarity = rollRarity('salvaged_wrench', { source: ItemSource.SHOP });
            counts[rarity] = (counts[rarity] ?? 0) + 1;
        }

        // salvaged_wrench has weights on N/R/SR/SSR/L (50/30/15/4/1) — over 500 rolls
        // every rarity should appear at least once, and none outside that set.
        expect(Object.keys(counts).sort()).toEqual([
            Rarity.L,
            Rarity.N,
            Rarity.R,
            Rarity.SR,
            Rarity.SSR,
        ].sort());
    });

    it('caps rolls to maxRarity or lower', () => {
        for (let i = 0; i < 200; i++) {
            const rarity = rollRarity('salvaged_wrench', {
                source: ItemSource.SHOP, maxRarity: Rarity.R, 
            });
            expect([Rarity.N, Rarity.R]).toContain(rarity);
        }
    });

    it('throws for an unknown templateId', () => {
        expect(() => rollRarity('does_not_exist', { source: ItemSource.SHOP })).toThrow();
    });
});

describe('rollStats', () => {
    it('rolls equipment stats within the baseStatsRange for the rarity', () => {
        const stats = rollStats('salvaged_wrench', Rarity.N);
        expect(stats.ATK).toBeGreaterThanOrEqual(5);
        expect(stats.ATK).toBeLessThanOrEqual(10);
        expect(stats.healPercent).toBeUndefined();
    });

    it('rolls higher stat ranges for higher rarities', () => {
        const nStats = rollStats('salvaged_wrench', Rarity.N);
        const lStats = rollStats('salvaged_wrench', Rarity.L);
        expect(lStats.ATK as number).toBeGreaterThan(nStats.ATK as number);
    });

    it('rolls healPercent within range for POTION templates', () => {
        const stats = rollStats('engine_oil_basic', Rarity.SR);
        expect(stats.healPercent).toBeGreaterThanOrEqual(35);
        expect(stats.healPercent).toBeLessThanOrEqual(40);
        expect(stats.ATK).toBeUndefined();
        expect(stats.DEF).toBeUndefined();
    });

    it('throws for an unknown templateId', () => {
        expect(() => rollStats('does_not_exist', Rarity.N)).toThrow();
    });
});

describe('generateItemInstance', () => {
    it('generates an equipment instance with a unique itemId and matching template metadata', () => {
        const instance = generateItemInstance('salvaged_wrench', { source: ItemSource.SHOP });

        expect(instance.templateId).toBe('salvaged_wrench');
        expect(instance.type).toBe(ItemType.EQUIPMENT);
        expect(instance.source).toBe(ItemSource.SHOP);
        expect(Object.values(Rarity)).toContain(instance.rarity);
        expect(instance.itemId).toBeTruthy();

        const other = generateItemInstance('salvaged_wrench', { source: ItemSource.SHOP });
        expect(other.itemId).not.toBe(instance.itemId);
    });

    it('generates a potion instance with only healPercent rolled', () => {
        const instance = generateItemInstance('engine_oil_basic', { source: ItemSource.DROP });

        expect(instance.type).toBe(ItemType.POTION);
        expect(instance.stats.healPercent).toBeGreaterThan(0);
        expect(instance.equipSlot).toBeUndefined();
    });

    it('throws and does not return a partial instance for an unknown templateId', () => {
        expect(() => generateItemInstance('does_not_exist', { source: ItemSource.SHOP })).toThrow();
    });
});
