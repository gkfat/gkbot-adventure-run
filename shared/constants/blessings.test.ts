import {
    describe, it, expect,
} from 'vitest';
import {
    rarityWeights, pickWeightedRarity, blessingLevelEffect, resolveBlessingModifier,
    BLESSING_TEMPLATES, CURSE_TEMPLATES,
} from './blessings';

describe('rarityWeights', () => {
    it('increases RARE/EPIC weight with LUCK', () => {
        const low = rarityWeights(0);
        const high = rarityWeights(20);
        expect(high.EPIC).toBeGreaterThan(low.EPIC);
        expect(high.RARE).toBeGreaterThan(low.RARE);
    });

    it('weights always sum to a positive total', () => {
        const weights = rarityWeights(1000);
        expect(weights.COMMON + weights.RARE + weights.EPIC).toBeGreaterThan(0);
        expect(weights.COMMON).toBeGreaterThanOrEqual(0);
    });
});

describe('pickWeightedRarity', () => {
    it('picks EPIC/RARE/COMMON by cumulative threshold', () => {
        const weights = {
            COMMON: 60, RARE: 30, EPIC: 10, 
        };
        expect(pickWeightedRarity(weights, 0)).toBe('EPIC');
        expect(pickWeightedRarity(weights, 0.15)).toBe('RARE');
        expect(pickWeightedRarity(weights, 0.99)).toBe('COMMON');
    });
});

describe('BLESSING_TEMPLATES / CURSE_TEMPLATES', () => {
    it('has all three rarities represented among blessings', () => {
        const rarities = new Set(BLESSING_TEMPLATES.map(t => t.rarity));
        expect(rarities.has('COMMON')).toBe(true);
        expect(rarities.has('RARE')).toBe(true);
        expect(rarities.has('EPIC')).toBe(true);
    });

    it('every template has a unique modifierId', () => {
        const ids = [...BLESSING_TEMPLATES.map(t => t.modifierId), ...CURSE_TEMPLATES.map(t => t.modifierId)];
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every blessing family defines exactly 3 levels', () => {
        for (const template of BLESSING_TEMPLATES) {
            expect(template.levels).toHaveLength(3);
        }
    });

    it('marks blessings as isBlessing=true and curses as isBlessing=false', () => {
        expect(BLESSING_TEMPLATES.every(t => t.isBlessing)).toBe(true);
        expect(CURSE_TEMPLATES.every(t => !t.isBlessing)).toBe(true);
    });
});

describe('blessingLevelEffect / resolveBlessingModifier', () => {
    const family = BLESSING_TEMPLATES[0]!;

    it('returns the effect for the requested level', () => {
        expect(blessingLevelEffect(family.modifierId, 1)).toEqual(family.levels[0]);
        expect(blessingLevelEffect(family.modifierId, 3)).toEqual(family.levels[2]);
    });

    it('returns undefined for level 0 or an unknown family', () => {
        expect(blessingLevelEffect(family.modifierId, 0)).toBeUndefined();
        expect(blessingLevelEffect('does_not_exist', 1)).toBeUndefined();
    });

    it('resolves an owned entry into a RunModifier at its current level', () => {
        const modifier = resolveBlessingModifier({
            modifierId: family.modifierId, level: 2,
        });
        expect(modifier).toMatchObject({
            modifierId: family.modifierId,
            name: family.name,
            isBlessing: true,
            ...family.levels[1],
        });
    });
});
