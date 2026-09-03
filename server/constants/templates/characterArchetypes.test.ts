import {
    describe, it, expect, 
} from 'vitest';

import {
    CHARACTER_ARCHETYPES, SELECTABLE_CHARACTER_ARCHETYPES,
} from './characterArchetypes';

describe('SELECTABLE_CHARACTER_ARCHETYPES', () => {
    it('contains exactly the 5 new archetypes', () => {
        expect(SELECTABLE_CHARACTER_ARCHETYPES.map(a => a.archetypeId).sort()).toEqual(
            [
                'adventurer',
                'fighter',
                'gambler',
                'scholar',
                'tinkerer',
            ],
        );
    });

    it('every selectable archetype has attributes summing to 8, each dimension >= 1', () => {
        for (const archetype of SELECTABLE_CHARACTER_ARCHETYPES) {
            const {
                STR, AGI, CON, LUCK,
            } = archetype.attributes;
            expect(STR + AGI + CON + LUCK).toBe(8);
            expect(STR).toBeGreaterThanOrEqual(1);
            expect(AGI).toBeGreaterThanOrEqual(1);
            expect(CON).toBeGreaterThanOrEqual(1);
            expect(LUCK).toBeGreaterThanOrEqual(1);
        }
    });
});

describe('CHARACTER_ARCHETYPES', () => {
    it('contains only the 5 selectable archetypes (retired archetypes removed)', () => {
        expect(CHARACTER_ARCHETYPES.map(a => a.archetypeId).sort()).toEqual(
            [
                'adventurer',
                'fighter',
                'gambler',
                'scholar',
                'tinkerer',
            ],
        );
    });
});
