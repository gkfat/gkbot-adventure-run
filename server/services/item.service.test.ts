import {
    describe, it, expect, vi, afterEach,
} from 'vitest';
import {
    rollRarity, rollStats, generateItemInstance, sumEquipmentStats, getSellPriceGold,
} from './item.service';
import { getItemTemplate } from '../constants/templates';
import {
    Rarity, WeaponWeightClass,
} from '../../shared/types/common';
import type { Attributes } from '../../shared/types/common';
import {
    ItemType, ItemSource,
} from '../../shared/types/item';
import type { ItemInstance } from '../../shared/types/item';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('rollRarity', () => {
    it('distributes rolls across all weighted rarities of a template', () => {
        const counts: Record<string, number> = {};
        // L is now a 0.3% weight — 500 rolls has a ~22% chance of never hitting it.
        // 20000 rolls keeps that failure chance astronomically small (~1e-26).
        for (let i = 0; i < 20000; i++) {
            const rarity = rollRarity('salvaged_wrench', { source: ItemSource.SHOP });
            counts[rarity] = (counts[rarity] ?? 0) + 1;
        }

        // salvaged_wrench has weights on N/R/SR/SSR/L — every rarity should
        // appear at least once, and none outside that set.
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

    it('uses rarityWeightsOverride instead of the template rarityWeights when provided', () => {
        for (let i = 0; i < 200; i++) {
            const rarity = rollRarity('salvaged_wrench', {
                source: ItemSource.SHOP,
                rarityWeightsOverride: {
                    N: 0, R: 0, SR: 55, SSR: 35, L: 10,
                },
            });
            expect([
                Rarity.SR,
                Rarity.SSR,
                Rarity.L,
            ]).toContain(rarity);
        }
    });

    it('falls back to the template rarityWeights when no override is provided', () => {
        const counts: Record<string, number> = {};
        for (let i = 0; i < 20000; i++) {
            const rarity = rollRarity('salvaged_wrench', { source: ItemSource.SHOP });
            counts[rarity] = (counts[rarity] ?? 0) + 1;
        }

        expect(Object.keys(counts).sort()).toEqual([
            Rarity.L,
            Rarity.N,
            Rarity.R,
            Rarity.SR,
            Rarity.SSR,
        ].sort());
    });
});

describe('rollStats', () => {
    it('rolls equipment stats within the baseStatsRange pool for the rarity', () => {
        // ATK is the template's primary/guaranteed stat — always present and
        // always within its rarity range, on every single roll.
        for (let i = 0; i < 100; i++) {
            const stats = rollStats('salvaged_wrench', Rarity.N);
            expect(stats.healPercent).toBeUndefined();
            expect(stats.ATK).toBeGreaterThanOrEqual(5);
            expect(stats.ATK).toBeLessThanOrEqual(10);
        }
    });

    it('never rolls a negative ATK/DEF — only HP may carry a "拖累" debuff', () => {
        // salvaged_wrench's pool also has HP, so N/R's 30% debuff chance has
        // somewhere to land besides ATK — loop enough times to observe it.
        let sawNegativeHp = false;
        for (let i = 0; i < 200; i++) {
            const stats = rollStats('salvaged_wrench', Rarity.N);
            expect(stats.ATK).toBeGreaterThan(0);
            if (stats.HP !== undefined && stats.HP < 0) {
                sawNegativeHp = true;
            } else if (stats.HP !== undefined) {
                expect(stats.HP).toBeGreaterThan(0);
            }
        }
        expect(sawNegativeHp).toBe(true);
    });

    it('rolls higher stat ranges for higher rarities', () => {
        // Compares the template's own N/L pool ranges directly rather than two
        // rollStats() outputs, since a subset-picked key may not appear on either roll.
        const template = getItemTemplate('salvaged_wrench');
        const nRange = template?.baseStatsRange?.[Rarity.N]?.ATK;
        const lRange = template?.baseStatsRange?.[Rarity.L]?.ATK;
        expect(lRange?.min).toBeGreaterThan(nRange?.min ?? 0);
        expect(lRange?.max).toBeGreaterThan(nRange?.max ?? 0);
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

    it('carries the template\'s weaponWeightClass onto the generated equipment instance', () => {
        const instance = generateItemInstance('salvaged_wrench', { source: ItemSource.SHOP });
        expect(instance.weaponWeightClass).toBe(WeaponWeightClass.MEDIUM);
    });

    it('carries weaponWeightClass for non-HAND EQUIPMENT slots too', () => {
        const instance = generateItemInstance('gkbot_faceplate', { source: ItemSource.DROP });
        expect(instance.weaponWeightClass).toBe(WeaponWeightClass.MEDIUM);
    });

    it('does not set weaponWeightClass on a POTION instance', () => {
        const instance = generateItemInstance('engine_oil_basic', { source: ItemSource.DROP });
        expect(instance.weaponWeightClass).toBeUndefined();
    });

    it('rolls a negative dodgeChanceMod for a HEAVY item when picked, within the rarity range', () => {
        // dodgeChanceMod is part of the pool now, not guaranteed on every roll —
        // loop until it's picked at least once.
        let sawDodgeMod = false;
        for (let i = 0; i < 100; i++) {
            const instance = generateItemInstance('riot_shield_scrap', {
                source: ItemSource.DROP, maxRarity: Rarity.N,
            });
            expect(instance.weaponWeightClass).toBe(WeaponWeightClass.HEAVY);
            if (instance.stats.dodgeChanceMod !== undefined) {
                sawDodgeMod = true;
                expect(instance.stats.dodgeChanceMod).toBeLessThan(0);
            }
        }
        expect(sawDodgeMod).toBe(true);
    });

    it('rolls a positive dodgeChanceMod for a MEDIUM item when picked, never negative', () => {
        // MEDIUM items now carry a mild positive dodgeChanceMod in their pool
        // (as opposed to HEAVY's negative tradeoff) — it just isn't guaranteed on every roll.
        let sawDodgeMod = false;
        for (let i = 0; i < 100; i++) {
            const instance = generateItemInstance('salvaged_wrench', { source: ItemSource.SHOP });
            if (instance.stats.dodgeChanceMod !== undefined) {
                sawDodgeMod = true;
                expect(instance.stats.dodgeChanceMod).toBeGreaterThan(0);
            }
        }
        expect(sawDodgeMod).toBe(true);
    });

    it('resolves name/description from the template on an EQUIPMENT instance', () => {
        const instance = generateItemInstance('gkbot_faceplate', {
            source: ItemSource.DROP, maxRarity: Rarity.N,
        });
        expect(instance.name).toBe('GkBot 頭部零件');
        expect(instance.description).toContain('施工型機器人頭部');
    });

    it('different rarities of the same template resolve the same shared name/description', () => {
        const template = getItemTemplate('gkbot_faceplate');
        const n = generateItemInstance('gkbot_faceplate', {
            source: ItemSource.DROP, maxRarity: Rarity.N,
        });
        const l = generateItemInstance('gkbot_faceplate', {
            source: ItemSource.DROP, minRarity: Rarity.L,
        });
        expect(n.name).toBe(template?.name);
        expect(l.name).toBe(template?.name);
        expect(n.name).toBe(l.name);
    });

    it('resolves the single shared name/description for a POTION instance regardless of rarity', () => {
        const n = generateItemInstance('engine_oil_basic', {
            source: ItemSource.DROP, maxRarity: Rarity.N,
        });
        expect(n.name).toBe('機油');
        expect(n.description).toBe('為什麼喝機油會補血...？但真好喝，咕嚕咕嚕咕嚕。');
    });
});

describe('sumEquipmentStats', () => {
    const attributes = (overrides: Partial<Attributes> = {}): Attributes => ({
        STR: 0, AGI: 0, CON: 0, LUCK: 0, ...overrides,
    });

    const heavyItem = (overrides: Partial<ItemInstance> = {}): ItemInstance => ({
        itemId: 'heavy-1',
        templateId: 'riot_shield_scrap',
        type: ItemType.EQUIPMENT,
        weaponWeightClass: WeaponWeightClass.HEAVY,
        rarity: Rarity.N,
        stats: {
            DEF: 5, actionSpeedMod: 0.2, dodgeChanceMod: -0.1,
        },
        name: '拾荒防爆盾',
        description: '補給設施保全機具的防爆盾殘件。',
        source: ItemSource.DROP,
        characterId: 'char-1',
        createdAt: Date.now(),
        ...overrides,
    });

    it('sums ATK/DEF/HP/actionIntervalSec/dodgeChance across items with no HEAVY mitigation at 0 STR+CON', () => {
        const result = sumEquipmentStats([heavyItem()], attributes());
        expect(result.DEF).toBe(5);
        expect(result.actionIntervalSec).toBeCloseTo(0.2);
        expect(result.dodgeChance).toBeCloseTo(-0.1);
    });

    it('shrinks a HEAVY item\'s actionSpeedMod/dodgeChanceMod penalty as STR+CON increases', () => {
        const lowCarry = sumEquipmentStats([heavyItem()], attributes({
            STR: 1, CON: 1, 
        }));
        const highCarry = sumEquipmentStats([heavyItem()], attributes({
            STR: 10, CON: 10, 
        }));

        expect(Math.abs(highCarry.actionIntervalSec as number)).toBeLessThan(Math.abs(lowCarry.actionIntervalSec as number));
        expect(Math.abs(highCarry.dodgeChance as number)).toBeLessThan(Math.abs(lowCarry.dodgeChance as number));
    });

    it('caps the mitigation so a HEAVY penalty is never fully negated', () => {
        const result = sumEquipmentStats([heavyItem()], attributes({
            STR: 500, CON: 500, 
        }));
        expect(result.actionIntervalSec as number).toBeGreaterThan(0);
        expect(result.dodgeChance as number).toBeLessThan(0);
    });

    it('does not mitigate LIGHT/MEDIUM items regardless of STR+CON', () => {
        const lightItem = heavyItem({
            weaponWeightClass: WeaponWeightClass.LIGHT, stats: { actionSpeedMod: -0.1 },
        });
        const lowCarry = sumEquipmentStats([lightItem], attributes({
            STR: 0, CON: 0, 
        }));
        const highCarry = sumEquipmentStats([lightItem], attributes({
            STR: 50, CON: 50, 
        }));

        expect(lowCarry.actionIntervalSec).toBeCloseTo(highCarry.actionIntervalSec as number);
    });
});

describe('getSellPriceGold', () => {
    it('returns half of the rarity\'s gold price midpoint for a normal (N) equipment item', () => {
        // salvaged_wrench N gold range is 100-200 (EQUIPMENT_PRICE_RANGE) -> midpoint 150 * 0.5 = 75
        expect(getSellPriceGold('salvaged_wrench', Rarity.N)).toBe(75);
    });

    it('returns a gold payout for SSR/L items even though their shop buy price is gems-only', () => {
        expect(getSellPriceGold('salvaged_wrench', Rarity.SSR)).toBeGreaterThan(0);
        expect(getSellPriceGold('salvaged_wrench', Rarity.L)).toBeGreaterThan(0);
    });

    it('sell price increases with rarity', () => {
        const n = getSellPriceGold('salvaged_wrench', Rarity.N);
        const r = getSellPriceGold('salvaged_wrench', Rarity.R);
        const sr = getSellPriceGold('salvaged_wrench', Rarity.SR);
        const ssr = getSellPriceGold('salvaged_wrench', Rarity.SSR);
        const l = getSellPriceGold('salvaged_wrench', Rarity.L);
        expect(n).toBeLessThan(r);
        expect(r).toBeLessThan(sr);
        expect(sr).toBeLessThan(ssr);
        expect(ssr).toBeLessThan(l);
    });

    it('throws for an unknown template', () => {
        expect(() => getSellPriceGold('not_a_real_template', Rarity.N)).toThrow();
    });
});
