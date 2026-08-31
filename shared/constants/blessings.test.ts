import {
    describe, it, expect, 
} from 'vitest';
import {
    majorTierChance, BLESSING_TEMPLATES, CURSE_TEMPLATES, 
} from './blessings';

describe('majorTierChance', () => {
    it('increases with LUCK', () => {
        expect(majorTierChance(20)).toBeGreaterThan(majorTierChance(0));
    });

    it('stays within (0, 1)', () => {
        expect(majorTierChance(0)).toBeGreaterThan(0);
        expect(majorTierChance(0)).toBeLessThan(1);
        expect(majorTierChance(1000)).toBeLessThan(1);
    });
});

describe('BLESSING_TEMPLATES / CURSE_TEMPLATES', () => {
    it('has both tiers represented among blessings', () => {
        const tiers = new Set(BLESSING_TEMPLATES.map(t => t.tier));
        expect(tiers.has('MINOR')).toBe(true);
        expect(tiers.has('MAJOR')).toBe(true);
    });

    it('every template has a unique modifierId', () => {
        const ids = [...BLESSING_TEMPLATES, ...CURSE_TEMPLATES].map(t => t.modifierId);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('marks blessings as isBlessing=true and curses as isBlessing=false', () => {
        expect(BLESSING_TEMPLATES.every(t => t.isBlessing)).toBe(true);
        expect(CURSE_TEMPLATES.every(t => !t.isBlessing)).toBe(true);
    });
});
