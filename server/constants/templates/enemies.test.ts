import {
    describe, it, expect,
} from 'vitest';
import {
    ENEMY_ARCHETYPES, HUMAN_ARCHETYPES, GKBOT_BOSS_ARCHETYPES, HUMAN_BOSS_ARCHETYPES,
    type EnemyArchetype,
} from './enemies';

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
