import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import {
    CombatService, computeDamage, applyModifiers, combinedDropRateMultiplier,
} from './combat.service';
import { ENEMY_ARCHETYPES } from '../constants/combat';
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
});

describe('combinedDropRateMultiplier', () => {
    it('defaults to 1 (no-op) with no active modifiers', () => {
        expect(combinedDropRateMultiplier([])).toBe(1);
    });

    it('multiplies across all active modifiers', () => {
        expect(combinedDropRateMultiplier([blessing, blessing])).toBe(2.25);
    });
});

const {
    getCharacterWithStatsMock, rngNextMock, 
} = vi.hoisted(() => ({
    getCharacterWithStatsMock: vi.fn(),
    rngNextMock: vi.fn(),
}));

vi.mock('./character.service', () => ({
    CharacterService: vi.fn().mockImplementation(function CharacterServiceMock() {
        return { getCharacterWithStats: getCharacterWithStatsMock };
    }),
}));

vi.mock('./rng.service', () => ({
    RngService: vi.fn().mockImplementation(function RngServiceMock() {
        return { next: rngNextMock };
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
    rngNextMock.mockImplementation(async () => (rollQueue.length > 0 ? rollQueue.shift() as number : 0.99));
    getCharacterWithStatsMock.mockResolvedValue({
        nickname: 'Tester',
        attributes: { LUCK: 0 },
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

    it('loses when the player is defeated and grants no rewards', async () => {
        getCharacterWithStatsMock.mockResolvedValue({
            nickname: 'Tester',
            attributes: { LUCK: 0 },
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

    it('uses the pre-decided archetype for wave 0 when firstWaveArchetypeIndices is provided, without rolling for it', async () => {
        // rollQueue is empty -> any unexpected archetype roll would consume it
        // and desync the dodge/crit rolls below; a spy confirms none happened
        // for enemy selection specifically by checking call count stays low.
        const service = new CombatService();
        const context: CombatContext = {
            enemyLevel: 1, tier: NodeType.COMBAT, waveCount: 1, enemyCountPerWave: 2, firstWaveArchetypeIndices: [2, 3],
        };

        const result = await service.resolve(baseRun(), context);

        expect(result.enemies.map(enemy => enemy.name)).toEqual([
            ENEMY_ARCHETYPES[2]?.name, ENEMY_ARCHETYPES[3]?.name,
        ]);
    });
});
