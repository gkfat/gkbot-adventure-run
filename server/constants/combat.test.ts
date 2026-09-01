import {
    describe, it, expect, 
} from 'vitest';
import {
    expForKill, goldForKill, applyLuckToGold, itemDropChance,
    blessingPointsForVictory, maxDropRarity, gemsDropTier,
    ENEMY_ARCHETYPES, HUMAN_ARCHETYPES, GKBOT_BOSS_ARCHETYPES, HUMAN_BOSS_ARCHETYPES,
    type EnemyArchetype,
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

// enemy-factions-and-severity: 4 archetype lists (GkBot/Human x mob/boss),
// each expected to hold 8 entries with valid base stats.
describe.each([
    ['ENEMY_ARCHETYPES (GkBot mobs)', ENEMY_ARCHETYPES],
    ['HUMAN_ARCHETYPES (human mobs)', HUMAN_ARCHETYPES],
    ['GKBOT_BOSS_ARCHETYPES', GKBOT_BOSS_ARCHETYPES],
    ['HUMAN_BOSS_ARCHETYPES', HUMAN_BOSS_ARCHETYPES],
])('%s', (_label, archetypes: EnemyArchetype[]) => {
    it('has exactly 8 archetypes with positive base stats', () => {
        expect(archetypes.length).toBe(8);
        for (const archetype of archetypes) {
            expect(archetype.baseAtk).toBeGreaterThan(0);
            expect(archetype.baseDef).toBeGreaterThan(0);
            expect(archetype.baseHp).toBeGreaterThan(0);
            expect(archetype.actionIntervalSec).toBeGreaterThan(0);
        }
    });

    it('has a non-empty description for every archetype (pre-fight enemy preview)', () => {
        for (const archetype of archetypes) {
            expect(archetype.description.length).toBeGreaterThan(0);
        }
    });
});

describe('GKBOT_BOSS_ARCHETYPES / HUMAN_BOSS_ARCHETYPES escort composition', () => {
    it('gives every boss archetype a boss minion count within 0~2 (chapter-level-structure)', () => {
        for (const archetype of [...GKBOT_BOSS_ARCHETYPES, ...HUMAN_BOSS_ARCHETYPES]) {
            expect(archetype.bossMinionCount ?? 0).toBeGreaterThanOrEqual(0);
            expect(archetype.bossMinionCount ?? 0).toBeLessThanOrEqual(2);
        }
    });

    it('has at least one boss that can reinforce and at least one that cannot, per faction', () => {
        // worldview.md 第 6 節's "有些 boss 才會補位" contrast should actually exist.
        expect(GKBOT_BOSS_ARCHETYPES.some(archetype => archetype.canReinforce)).toBe(true);
        expect(GKBOT_BOSS_ARCHETYPES.some(archetype => !archetype.canReinforce)).toBe(true);
        expect(HUMAN_BOSS_ARCHETYPES.some(archetype => archetype.canReinforce)).toBe(true);
        expect(HUMAN_BOSS_ARCHETYPES.some(archetype => !archetype.canReinforce)).toBe(true);
    });
});

describe('EnemyArchetype LUK overrides', () => {
    it('has at least one archetype per mob list with a crit or dodge override, and at least one without', () => {
        for (const archetypes of [ENEMY_ARCHETYPES, HUMAN_ARCHETYPES]) {
            expect(archetypes.some(archetype => archetype.critChanceOverride !== undefined || archetype.dodgeChanceOverride !== undefined)).toBe(true);
            expect(archetypes.some(archetype => archetype.critChanceOverride === undefined && archetype.dodgeChanceOverride === undefined)).toBe(true);
        }
    });
});
