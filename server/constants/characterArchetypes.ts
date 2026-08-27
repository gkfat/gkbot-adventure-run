/**
 * Character archetypes (classes) players can pick from when creating a new character.
 * Attribute totals are fixed at 8 across all archetypes so they stay comparable.
 */

import type { Attributes } from '../../shared/types/common';

export type CharacterArchetype = {
    archetypeId: string;
    className: string;
    attributes: Attributes;
    spriteUrl: string;
};

export const CHARACTER_ARCHETYPES: readonly CharacterArchetype[] = [
    {
        archetypeId: 'barbarian',
        className: '野蠻人',
        attributes: {
            STR: 3, AGI: 1, CON: 3, LUCK: 1,
        },
        spriteUrl: '/images/archetypes/barbarian.png',
    },
    {
        archetypeId: 'rogue',
        className: '盜賊',
        attributes: {
            STR: 1, AGI: 5, CON: 1, LUCK: 1,
        },
        spriteUrl: '/images/archetypes/rogue.png',
    },
    {
        archetypeId: 'paladin',
        className: '聖騎士',
        attributes: {
            STR: 2, AGI: 1, CON: 4, LUCK: 1,
        },
        spriteUrl: '/images/archetypes/paladin.png',
    },
    {
        archetypeId: 'wanderer',
        className: '流浪者',
        attributes: {
            STR: 1, AGI: 2, CON: 1, LUCK: 4,
        },
        spriteUrl: '/images/archetypes/wanderer.png',
    },
] as const;

/** archetypeId used for characters created before this multi-character system existed */
export const LEGACY_ARCHETYPE_ID = 'legacy';
export const LEGACY_CLASS_NAME = '冒險者';
export const LEGACY_SPRITE_URL = '/images/hero-sprite.png';

export function getArchetypeById(archetypeId: string): CharacterArchetype | undefined {
    return CHARACTER_ARCHETYPES.find(archetype => archetype.archetypeId === archetypeId);
}
