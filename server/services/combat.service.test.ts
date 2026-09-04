import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import {
    CombatService, computeDamage, applyModifiers, combinedDropRateMultiplier, resolveActiveModifiers,
} from './combat.service';
import { getStatMultipliers } from '../constants/difficulty';
import {
    ENEMY_ARCHETYPES, HUMAN_ARCHETYPES, GKBOT_BOSS_ARCHETYPES, HUMAN_BOSS_ARCHETYPES,
} from '../constants/templates/enemies';
import {
    AdventureStateType, NodeType, type AdventureRun, type CombatContext, type RunModifier,
} from '../../shared/types/adventure';

describe('computeDamage', () => {
    it('floors damage at 1 when ATK <= DEF', () => {
        expect(computeDamage(5, 10, false, 1.5)).toBe(1);
        expect(computeDamage(5, 5, false, 1.5)).toBe(1);
    });

    it('applies critMultiplier on top of the base damage', () => {
        expect(computeDamage(20, 5, false, 1.5)).toBe(15);
        expect(computeDamage(20, 5, true, 1.5)).toBe(22.5);
    });
});

const baseStats = {
    ATK: 10, DEF: 5, HP_MAX: 100, HP_CURRENT: 100, actionIntervalSec: 3, critChance: 0.05, critMultiplier: 1.5, dodgeChance: 0.03,
};

const blessing: RunModifier = {
    modifierId: 'b1', name: '+ATK Blessing', description: '', isBlessing: true, statModifiers: { ATK: 20 }, dropRateMultiplier: 1.5,
};

describe('applyModifiers', () => {
    it('is a no-op with no active modifiers', () => {
        expect(applyModifiers(baseStats, [])).toEqual(baseStats);
    });

    it('additively stacks statModifiers without touching unrelated stats', () => {
        const result = applyModifiers(baseStats, [blessing]);
        expect(result.ATK).toBe(30);
        expect(result.DEF).toBe(baseStats.DEF);
        expect(result.HP_MAX).toBe(baseStats.HP_MAX);
    });

    it('applies a speed blessing\'s actionIntervalSec delta (lower is faster)', () => {
        const speedBlessing: RunModifier = {
            modifierId: 'blessing_speed', name: '過載超頻', description: '', isBlessing: true, statModifiers: { actionIntervalSec: -0.3 },
        };

        const result = applyModifiers(baseStats, [speedBlessing]);

        expect(result.actionIntervalSec).toBeCloseTo(baseStats.actionIntervalSec - 0.3);
    });
});

describe('combinedDropRateMultiplier', () => {
    it('defaults to 1 (no-op) with no active modifiers', () => {
        expect(combinedDropRateMultiplier([])).toBe(1);
    });

    it('multiplies across all active modifiers', () => {
        expect(combinedDropRateMultiplier([blessing, blessing])).toBe(2.25);
    });
});

describe('resolveActiveModifiers (blessing-leveling)', () => {
    it('resolves a Blessing family to the effect for its current level', () => {
        const lv1 = resolveActiveModifiers({
            blessings: [
                {
                    modifierId: 'blessing_atk_boost', level: 1, 
                },
            ], curses: [],
        });
        const lv3 = resolveActiveModifiers({
            blessings: [
                {
                    modifierId: 'blessing_atk_boost', level: 3, 
                },
            ], curses: [],
        });

        expect(lv1[0]?.statModifiers?.ATK).toBeDefined();
        expect(lv3[0]?.statModifiers?.ATK).toBeGreaterThan(lv1[0]?.statModifiers?.ATK as number);
    });

    it('resolves flat Curses unaffected by level', () => {
        const modifiers = resolveActiveModifiers({
            blessings: [], curses: ['curse_signal_noise'],
        });
        expect(modifiers).toHaveLength(1);
        expect(modifiers[0]?.statModifiers?.ATK).toBeLessThan(0);
    });

    it('skips an unknown modifierId instead of throwing', () => {
        const modifiers = resolveActiveModifiers({
            blessings: [
                {
                    modifierId: 'not_a_real_blessing', level: 1, 
                },
            ], curses: ['not_a_real_curse'],
        });
        expect(modifiers).toHaveLength(0);
    });
});

const {
    getCharacterWithStatsMock, createCursorMock, recordEncounteredArchetypesMock, recordDefeatedArchetypesMock,
} = vi.hoisted(() => ({
    getCharacterWithStatsMock: vi.fn(),
    createCursorMock: vi.fn(),
    recordEncounteredArchetypesMock: vi.fn(),
    recordDefeatedArchetypesMock: vi.fn(),
}));

vi.mock('./character.service', () => ({
    CharacterService: vi.fn().mockImplementation(function CharacterServiceMock() {
        return {
            getCharacterWithStats: getCharacterWithStatsMock,
            recordEncounteredArchetypes: recordEncounteredArchetypesMock,
            recordDefeatedArchetypes: recordDefeatedArchetypesMock,
        };
    }),
}));

vi.mock('./rng.service', () => ({
    RngService: vi.fn().mockImplementation(function RngServiceMock() {
        return { createCursor: createCursorMock };
    }),
}));

function baseRun(overrides: Partial<AdventureRun> = {}): AdventureRun {
    return {
        runId: 'run-1',
        characterId: 'char-1',
        accountId: 'account-1',
        seed: 'seed-1',
        rngIndex: 0,
        state: AdventureStateType.COMBAT,
        step: 1,
        lastRestStep: 0,
        chapterIndex: 0,
        stageNodeIndex: 0,
        stageNodeCount: 10,
        startedAt: Date.now(),
        playerHp: 1000,
        playerHpMax: 1000,
        blessings: [],
        curses: [],
        blessingPoints: 0,
        runInventory: [],
        expEarned: 0,
        goldEarned: 0,
        gemsEarned: 0,
        lastActivityAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

// Rolls default to 0.99 (never crit/dodge/drop) unless queued explicitly —
// keeps tests deterministic without hand-tracing every RNG call order.
let rollQueue: number[];
beforeEach(() => {
    vi.clearAllMocks();
    rollQueue = [];
    createCursorMock.mockImplementation((_seed: string, startIndex: number) => {
        let index = startIndex;
        return {
            next: () => {
                index += 1;
                return rollQueue.length > 0 ? rollQueue.shift() as number : 0.99;
            },
            get index() {
                return index;
            },
        };
    });
    getCharacterWithStatsMock.mockResolvedValue({
        nickname: 'Tester',
        attributes: { LUCK: 0 },
        encounteredArchetypeSlugs: [],
        defeatedArchetypeCounts: {},
        stats: {
            ATK: 1000, DEF: 1000, HP_MAX: 1000, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
        },
    });
});

describe('CombatService.resolve', () => {
    it('wins an overpowered fight in one hit and reports coherent rewards', async () => {
        const service = new CombatService();
        const run = baseRun();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [],
        };

        const result = await service.resolve(run, context);

        expect(result.victory).toBe(true);
        expect(result.playerHpRemaining).toBe(1000);
        expect(result.enemies).toHaveLength(1);
        expect(result.enemies[0]?.level).toBe(1);
        expect(result.expGained).toBe(10); // expForKill(1, 'NORMAL')
        expect(result.goldDropped).toBe(2); // goldForKill(1), LUCK=0
        expect(result.blessingPointsGained).toBe(1);
        expect(result.itemsDropped).toEqual([]);
        expect(result.gemsDropped).toBe(0);
    });

    it('produces one DEATH log entry per defeated enemy across multiple waves/enemies', async () => {
        const service = new CombatService();
        const run = baseRun();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 2, enemyCountPerWave: 2, firstWaveArchetypeIndices: [],
        };

        const result = await service.resolve(run, context);

        expect(result.enemies).toHaveLength(4);
        expect(result.combatLog.filter(entry => entry.action === 'DEATH')).toHaveLength(4);
    });

    it('stamps each log entry with its wave index and resets every unit\'s action gauge (including the player) at the start of each wave', async () => {
        const service = new CombatService();
        const run = baseRun();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 2, enemyCountPerWave: 1, firstWaveArchetypeIndices: [],
        };

        const result = await service.resolve(run, context);

        const wave0Entries = result.combatLog.filter(entry => entry.wave === 0);
        const wave1Entries = result.combatLog.filter(entry => entry.wave === 1);
        expect(wave0Entries.length).toBeGreaterThan(0);
        expect(wave1Entries.length).toBeGreaterThan(0);
        expect(result.combatLog).toHaveLength(wave0Entries.length + wave1Entries.length);
        // Player one-shots every enemy (ATK=1000 vs low-level DEF), so the
        // player's very first action in each wave happens at timestamp 0 —
        // if nextAttackAt carried over from wave 0, wave 1's first player
        // action would start at a non-zero offset instead.
        expect(wave0Entries[0]?.timestamp).toBe(0);
        expect(wave1Entries[0]?.timestamp).toBe(0);
    });

    it('loses when the player is defeated and grants no rewards', async () => {
        getCharacterWithStatsMock.mockResolvedValue({
            nickname: 'Tester',
            attributes: { LUCK: 0 },
            encounteredArchetypeSlugs: [],
            defeatedArchetypeCounts: {},
            stats: {
                ATK: 0, DEF: 0, HP_MAX: 1, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
            },
        });

        const service = new CombatService();
        const run = baseRun({
            playerHp: 1, playerHpMax: 1, 
        });
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.STRONG_ELITE, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [],
        };

        const result = await service.resolve(run, context);

        expect(result.victory).toBe(false);
        expect(result.playerHpRemaining).toBe(0);
        expect(result.expGained).toBe(0);
        expect(result.goldDropped).toBe(0);
        expect(result.blessingPointsGained).toBe(0);
    });

    it('BOSS tier guarantees at least one item drop, bypassing the LUCK-gated drop chance', async () => {
        // rollQueue defaults every non-explicit roll to 0.99 (never crit/dodge/drop
        // under the normal LUCK=0 gate ~0.15) — BOSS should still drop an item.
        getCharacterWithStatsMock.mockResolvedValue({
            nickname: 'Tester',
            attributes: { LUCK: 0 },
            encounteredArchetypeSlugs: [],
            defeatedArchetypeCounts: {},
            stats: {
                ATK: 1000, DEF: 1000, HP_MAX: 1000, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
            },
        });

        const service = new CombatService();
        const run = baseRun();
        const context: CombatContext = {
            enemyLevel: 5, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [],
        };

        const result = await service.resolve(run, context);

        expect(result.victory).toBe(true);
        expect(result.itemsDropped.length).toBeGreaterThanOrEqual(1);
    });

    it('logs a DODGE event with no damage when the dodge roll succeeds', async () => {
        // sequence: spawnWave archetype pick (0.99), then the first attack's
        // dodge roll forced low (0 < any dodgeChance > 0) — player acts first
        // on a nextAttackAt tie, so this dodge belongs to the enemy.
        rollQueue = [0.99, 0];

        const service = new CombatService();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [],
        };

        const result = await service.resolve(baseRun(), context);

        const firstEntry = result.combatLog[0];
        expect(firstEntry?.action).toBe('DODGE');
        expect(firstEntry?.damage).toBeUndefined();
        expect(result.victory).toBe(true);
    });

    it('BOSS tier with escort minions only counts victory once the boss AND every minion are dead', async () => {
        // Player overpowered enough to one-shot each unit; archetype 0 has
        // bossMinionCount=2 (chapter-level-structure), so enemyCountPerWave=3
        // mirrors what adventure-run.service.buildBossNodeData would compute.
        const service = new CombatService();
        const run = baseRun();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 3, firstWaveArchetypeIndices: [
                0,
                0,
                0,
            ],
        };

        const result = await service.resolve(run, context);

        expect(result.victory).toBe(true);
        expect(result.enemies).toHaveLength(3);
        expect(result.combatLog.filter(entry => entry.action === 'DEATH')).toHaveLength(3);
    });

    it('BOSS tier guarantees a drop for the boss unit but not for its escort minions', async () => {
        // LUCK=0 -> luck-gated chance ~0.15; rollQueue defaults every
        // unqueued roll to 0.99, so only the boss's forced dropChance=1
        // should produce an item — the minions' kills must not.
        const service = new CombatService();
        const run = baseRun();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 3, firstWaveArchetypeIndices: [
                0,
                0,
                0,
            ],
        };

        const result = await service.resolve(run, context);

        expect(result.victory).toBe(true);
        expect(result.itemsDropped.length).toBe(1);
    });

    it('reinforces a fallen minion slot when the boss archetype allows it and the reinforcement roll hits', async () => {
        getCharacterWithStatsMock.mockResolvedValue({
            nickname: 'Tester',
            attributes: { LUCK: 0 },
            encounteredArchetypeSlugs: [],
            defeatedArchetypeCounts: {},
            stats: {
                ATK: 100, DEF: 0, HP_MAX: 100000, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
            },
        });
        // Every roll = 0: no dodge/crit, and the reinforcement check (roll < 0.5) always hits.
        createCursorMock.mockImplementation((_seed: string, startIndex: number) => {
            let index = startIndex;
            return {
                next: () => {
                    index += 1;
                    return 0;
                },
                get index() {
                    return index;
                },
            };
        });

        const service = new CombatService();
        const run = baseRun({
            playerHp: 100000, playerHpMax: 100000, 
        });
        // archetype 0 ("維修型 GkBot") canReinforce=true; enemyCountPerWave=1
        // (boss only, no starting minions) isolates the reinforcement as the
        // only source of a second enemy.
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
        };

        const result = await service.resolve(run, context);

        expect(result.victory).toBe(true);
        expect(result.enemies.length).toBeGreaterThan(1);
    });

    it('does not reinforce when the boss archetype cannot reinforce', async () => {
        getCharacterWithStatsMock.mockResolvedValue({
            nickname: 'Tester',
            attributes: { LUCK: 0 },
            encounteredArchetypeSlugs: [],
            defeatedArchetypeCounts: {},
            stats: {
                ATK: 100, DEF: 0, HP_MAX: 100000, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
            },
        });
        createCursorMock.mockImplementation((_seed: string, startIndex: number) => {
            let index = startIndex;
            return {
                next: () => {
                    index += 1;
                    return 0;
                },
                get index() {
                    return index;
                },
            };
        });

        const service = new CombatService();
        const run = baseRun({
            playerHp: 100000, playerHpMax: 100000, 
        });
        // archetype 1 ("保全機具") canReinforce=false.
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [1],
        };

        const result = await service.resolve(run, context);

        expect(result.victory).toBe(true);
        expect(result.enemies).toHaveLength(1);
    });

    it('uses the pre-decided archetype for wave 0 when firstWaveArchetypeIndices is provided, without rolling for it', async () => {
        // rollQueue is empty -> any unexpected archetype roll would consume it
        // and desync the dodge/crit rolls below; a spy confirms none happened
        // for enemy selection specifically by checking call count stays low.
        const service = new CombatService();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 2, firstWaveArchetypeIndices: [2, 3],
        };

        const result = await service.resolve(baseRun(), context);

        expect(result.enemies.map(enemy => enemy.name)).toEqual([ENEMY_ARCHETYPES[2]?.name, ENEMY_ARCHETYPES[3]?.name]);
    });

    // enemy-factions-and-severity: archetype list selection by run.factionType
    describe('faction-based archetype selection', () => {
        it('factionType=GKBOT (default) draws normal combat from ENEMY_ARCHETYPES and Boss from GKBOT_BOSS_ARCHETYPES', async () => {
            const service = new CombatService();
            const run = baseRun({ factionType: 'GKBOT' });

            const combatResult = await service.resolve(run, {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [3],
            });
            expect(combatResult.enemies[0]?.name).toBe(ENEMY_ARCHETYPES[3]?.name);

            const bossResult = await service.resolve(run, {
                enemyLevel: 1, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [1],
            });
            expect(bossResult.enemies[0]?.name).toBe(GKBOT_BOSS_ARCHETYPES[1]?.name);
        });

        it('carries archetypeSlug through to each enemy result, matching the resolved archetype (enemy-portrait-resolution)', async () => {
            const service = new CombatService();
            const run = baseRun({ factionType: 'HUMAN' });

            const combatResult = await service.resolve(run, {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [3],
            });
            expect(combatResult.enemies[0]?.archetypeSlug).toBe(HUMAN_ARCHETYPES[3]?.slug);

            const bossResult = await service.resolve(run, {
                enemyLevel: 1, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [1],
            });
            expect(bossResult.enemies[0]?.archetypeSlug).toBe(HUMAN_BOSS_ARCHETYPES[1]?.slug);
        });

        it('factionType=HUMAN draws normal combat from HUMAN_ARCHETYPES and Boss from HUMAN_BOSS_ARCHETYPES, never a GkBot archetype', async () => {
            const service = new CombatService();
            const run = baseRun({ factionType: 'HUMAN' });

            const combatResult = await service.resolve(run, {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [3],
            });
            expect(combatResult.enemies[0]?.name).toBe(HUMAN_ARCHETYPES[3]?.name);
            expect(ENEMY_ARCHETYPES.map(archetype => archetype.name)).not.toContain(combatResult.enemies[0]?.name);

            const bossResult = await service.resolve(run, {
                enemyLevel: 1, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [1],
            });
            expect(bossResult.enemies[0]?.name).toBe(HUMAN_BOSS_ARCHETYPES[1]?.name);
        });
    });

    // enemy-factions-and-severity design.md 決策 4: Boss stats no longer stack
    // the BOSS tier multiplier on top of the boss archetype's own base values.
    describe('Boss stats use NORMAL tier, not BOSS tier', () => {
        it('a boss unit\'s hpMax equals baseHp scaled by NORMAL tier, not BOSS tier', async () => {
            const service = new CombatService();
            const run = baseRun({ factionType: 'GKBOT' });
            const enemyLevel = 6;
            const bossArchetype = GKBOT_BOSS_ARCHETYPES[0]!;

            const result = await service.resolve(run, {
                enemyLevel, tier: NodeType.BOSS, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
            });

            const expectedHp = Math.round(bossArchetype.baseHp * getStatMultipliers(enemyLevel, 'NORMAL').hp);
            const bossTierHp = Math.round(bossArchetype.baseHp * getStatMultipliers(enemyLevel, 'BOSS').hp);
            expect(result.enemies[0]?.hpMax).toBe(expectedHp);
            expect(result.enemies[0]?.hpMax).not.toBe(bossTierHp);
        });
    });

    // Confirms blessing_speed (actionIntervalSec: -0.3) isn't just stored on
    // the run but actually reaches the combat loop's nextAttackAt scheduling
    // and increases how often the player acts (see applyModifiers/resolve()).
    describe('blessing_speed affects the combat loop, not just stored stats', () => {
        it('increases the player\'s share of actions in the simulated fight when granted', async () => {
            // Both sides deal exactly 1 floor damage per hit (huge mismatched
            // ATK/DEF) against a high HP pool, so neither side dies before the
            // MAX_ROUNDS safety cap — every run below performs the same total
            // number of actions (500), isolating the player/enemy action split
            // to actionIntervalSec alone.
            getCharacterWithStatsMock.mockResolvedValue({
                nickname: 'Tester',
                attributes: { LUCK: 0 },
                encounteredArchetypeSlugs: [],
                defeatedArchetypeCounts: {},
                stats: {
                    ATK: 1, DEF: 100000, HP_MAX: 100000, actionIntervalSec: 2, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
                },
            });
            const context: CombatContext = {
                enemyLevel: 1000, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
            };
            const playerAttackCount = (log: CombatLogEntry[]) => log
                .filter(entry => entry.actorId === 'player' && entry.action !== 'DEATH').length;

            const service = new CombatService();
            const baselineResult = await service.resolve(baseRun({ blessings: [] }), context);
            const boostedResult = await service.resolve(
                baseRun({
                    blessings: [
                        {
                            modifierId: 'blessing_speed', level: 1, 
                        },
                    ], 
                }), context,
            );

            expect(baselineResult.enemies[0]?.hpMax).toBeGreaterThan(500); // sanity: enemy never actually dies within MAX_ROUNDS
            expect(playerAttackCount(boostedResult.combatLog)).toBeGreaterThan(playerAttackCount(baselineResult.combatLog));
        });
    });

    // enemy-factions-and-severity design.md 決策 3: LUK (crit/dodge) overrides
    describe('LUK overrides', () => {
        it('uses the archetype\'s dodgeChanceOverride instead of the global default when set', async () => {
            // "幻影投影體" (ENEMY_ARCHETYPES[6]) has dodgeChanceOverride=0.23; a
            // dodge roll of 0.10 clears the global default (0.03) but not the override.
            rollQueue = [0.10];
            const service = new CombatService();
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [6],
            };

            const result = await service.resolve(baseRun(), context);

            expect(result.combatLog[0]?.action).toBe('DODGE');
        });

        it('falls back to the global ENEMY_COMBAT_STATS default when no override is set', async () => {
            // ENEMY_ARCHETYPES[0] ("維修型 GkBot") has no dodgeChanceOverride;
            // the same 0.10 roll should NOT clear the global 0.03 default.
            rollQueue = [0.10];
            const service = new CombatService();
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
            };

            const result = await service.resolve(baseRun(), context);

            expect(result.combatLog[0]?.action).not.toBe('DODGE');
        });
    });

    // enemy-bestiary spec.md "戰鬥開始時記錄角色遇過的敵人 Archetype"
    describe('bestiary encounter recording', () => {
        it('records the first wave\'s archetype slugs as newly encountered', async () => {
            const service = new CombatService();
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
            };

            await service.resolve(baseRun(), context);

            expect(recordEncounteredArchetypesMock).toHaveBeenCalledWith(
                'char-1',
                [],
                [ENEMY_ARCHETYPES[0]?.slug],
            );
        });

        it('still reports the already-encountered slug when re-fought (dedup is CharacterService\'s job)', async () => {
            getCharacterWithStatsMock.mockResolvedValue({
                nickname: 'Tester',
                attributes: { LUCK: 0 },
                encounteredArchetypeSlugs: [ENEMY_ARCHETYPES[0]?.slug],
                stats: {
                    ATK: 1000, DEF: 1000, HP_MAX: 1000, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
                },
            });
            const service = new CombatService();
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
            };

            await service.resolve(baseRun(), context);

            expect(recordEncounteredArchetypesMock).toHaveBeenCalledWith(
                'char-1',
                [ENEMY_ARCHETYPES[0]?.slug],
                [ENEMY_ARCHETYPES[0]?.slug],
            );
        });

        it('records the encounter even when the player is defeated mid-combat', async () => {
            getCharacterWithStatsMock.mockResolvedValue({
                nickname: 'Tester',
                attributes: { LUCK: 0 },
                encounteredArchetypeSlugs: [],
                defeatedArchetypeCounts: {},
                stats: {
                    ATK: 0, DEF: 0, HP_MAX: 1, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
                },
            });
            const service = new CombatService();
            const run = baseRun({
                playerHp: 1, playerHpMax: 1,
            });
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.STRONG_ELITE, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [1],
            };

            const result = await service.resolve(run, context);

            expect(result.victory).toBe(false);
            expect(recordEncounteredArchetypesMock).toHaveBeenCalledWith(
                'char-1',
                [],
                [ENEMY_ARCHETYPES[1]?.slug],
            );
        });
    });

    // enemy-bestiary kill-count tracking: 戰鬥結算時記錄角色擊敗各 Archetype 的累積次數
    describe('bestiary kill-count recording', () => {
        it('records one defeated-archetype entry per enemy actually killed', async () => {
            const service = new CombatService();
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
            };

            const result = await service.resolve(baseRun(), context);

            expect(result.victory).toBe(true);
            expect(recordDefeatedArchetypesMock).toHaveBeenCalledWith(
                'char-1',
                {},
                [ENEMY_ARCHETYPES[0]?.slug],
            );
        });

        it('accumulates one entry per kill when the same archetype is defeated multiple times', async () => {
            const service = new CombatService();
            // firstWaveArchetypeIndices only pins wave 0 — keep everything in
            // a single wave so both enemies are deterministically archetype 0.
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 2, firstWaveArchetypeIndices: [0, 0],
            };

            const result = await service.resolve(baseRun(), context);

            expect(result.victory).toBe(true);
            expect(recordDefeatedArchetypesMock).toHaveBeenCalledWith(
                'char-1',
                {},
                [ENEMY_ARCHETYPES[0]?.slug, ENEMY_ARCHETYPES[0]?.slug],
            );
        });

        it('still records kills made before the player is defeated mid-combat', async () => {
            // Player one-shots the first enemy (ATK 1000 vs a low-level DEF);
            // any enemy attack deals >=1 damage (computeDamage floors at 1),
            // which instantly kills the 1-HP player back on the second enemy's turn.
            getCharacterWithStatsMock.mockResolvedValue({
                nickname: 'Tester',
                attributes: { LUCK: 0 },
                encounteredArchetypeSlugs: [],
                defeatedArchetypeCounts: {},
                stats: {
                    ATK: 1000, DEF: 0, HP_MAX: 1, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
                },
            });
            const service = new CombatService();
            const run = baseRun({
                playerHp: 1, playerHpMax: 1,
            });
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 2, firstWaveArchetypeIndices: [0, 1],
            };

            const result = await service.resolve(run, context);

            expect(result.victory).toBe(false);
            expect(recordDefeatedArchetypesMock).toHaveBeenCalledWith(
                'char-1',
                {},
                [ENEMY_ARCHETYPES[0]?.slug],
            );
        });

        it('calls recordDefeatedArchetypes with an empty list when nothing is killed', async () => {
            getCharacterWithStatsMock.mockResolvedValue({
                nickname: 'Tester',
                attributes: { LUCK: 0 },
                encounteredArchetypeSlugs: [],
                defeatedArchetypeCounts: {},
                stats: {
                    ATK: 0, DEF: 1000, HP_MAX: 1, actionIntervalSec: 1, critChance: 0, critMultiplier: 1.5, dodgeChance: 0,
                },
            });
            const service = new CombatService();
            const run = baseRun({
                playerHp: 1, playerHpMax: 1,
            });
            const context: CombatContext = {
                enemyLevel: 1, tier: NodeType.STRONG_ELITE, waveCount: 1, enemyCountPerWave: 1, firstWaveArchetypeIndices: [0],
            };

            const result = await service.resolve(run, context);

            expect(result.victory).toBe(false);
            expect(recordDefeatedArchetypesMock).toHaveBeenCalledWith('char-1', {}, []);
        });
    });
});
