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
    /** Whether this archetype can be picked when creating a new character. Retired archetypes stay here (isSelectable: false) so existing characters can still resolve their className/spriteUrl. */
    isSelectable: boolean;
};

export const CHARACTER_ARCHETYPES: readonly CharacterArchetype[] = [
    {
        archetypeId: 'fighter',
        className: '戰士',
        attributes: {
            STR: 3, AGI: 1, CON: 3, LUCK: 1,
        },
        spriteUrl: '/images/archetypes/fighter.png',
        isSelectable: true,
    },
    {
        archetypeId: 'adventurer',
        className: '冒險家',
        attributes: {
            STR: 1, AGI: 3, CON: 2, LUCK: 2,
        },
        spriteUrl: '/images/archetypes/adventurer.png',
        isSelectable: true,
    },
    {
        archetypeId: 'scholar',
        className: '學者',
        attributes: {
            STR: 4, AGI: 1, CON: 1, LUCK: 2,
        },
        spriteUrl: '/images/archetypes/scholar.png',
        isSelectable: true,
    },
    {
        archetypeId: 'tinkerer',
        className: '工匠',
        attributes: {
            STR: 1, AGI: 2, CON: 3, LUCK: 2,
        },
        spriteUrl: '/images/archetypes/tinkerer.png',
        isSelectable: true,
    },
    {
        archetypeId: 'gambler',
        className: '投機者',
        attributes: {
            STR: 1, AGI: 2, CON: 1, LUCK: 4,
        },
        spriteUrl: '/images/archetypes/gambler.png',
        isSelectable: true,
    },
    {
        archetypeId: 'barbarian',
        className: '野蠻人',
        attributes: {
            STR: 3, AGI: 1, CON: 3, LUCK: 1,
        },
        spriteUrl: '/images/archetypes/barbarian.png',
        isSelectable: false,
    },
    {
        archetypeId: 'rogue',
        className: '盜賊',
        attributes: {
            STR: 1, AGI: 5, CON: 1, LUCK: 1,
        },
        spriteUrl: '/images/archetypes/rogue.png',
        isSelectable: false,
    },
    {
        archetypeId: 'paladin',
        className: '聖騎士',
        attributes: {
            STR: 2, AGI: 1, CON: 4, LUCK: 1,
        },
        spriteUrl: '/images/archetypes/paladin.png',
        isSelectable: false,
    },
    {
        archetypeId: 'wanderer',
        className: '流浪者',
        attributes: {
            STR: 1, AGI: 2, CON: 1, LUCK: 4,
        },
        spriteUrl: '/images/archetypes/wanderer.png',
        isSelectable: false,
    },
] as const;

export const SELECTABLE_CHARACTER_ARCHETYPES: readonly CharacterArchetype[] = CHARACTER_ARCHETYPES.filter(
    archetype => archetype.isSelectable,
);

/** archetypeId used for characters created before this multi-character system existed */
export const LEGACY_ARCHETYPE_ID = 'legacy';
export const LEGACY_CLASS_NAME = '冒險者';
export const LEGACY_SPRITE_URL = '/images/hero-sprite.png';

export function getArchetypeById(archetypeId: string): CharacterArchetype | undefined {
    return CHARACTER_ARCHETYPES.find(archetype => archetype.archetypeId === archetypeId);
}
