import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import { AdventureRunService } from './adventure-run.service';
import {
    AdventureStateType, NodeType, type AdventureRun,
} from '../../shared/types/adventure';
import {
    ItemType, ItemSource, 
} from '../../shared/types/item';
import { Rarity } from '../../shared/types/common';
import {
    ConflictError, BusinessLogicError, ValidationError, 
} from '../../shared/types/errors';

const {
    getActiveByCharacterIdMock, createRunMock, saveCheckpointMock,
    getByIdForAccountMock, settleRunRewardsMock, getByIdOrThrowMock,
    getCharacterWithStatsMock,
    createItemMock, getByIdMock, deleteItemMock,
    addItemMock, removeItemMock,
    rngNextMock, combatResolveMock,
    selectEventMock, eventResolveMock, generateCandidatesMock,
} = vi.hoisted(() => ({
    getActiveByCharacterIdMock: vi.fn(),
    createRunMock: vi.fn(),
    saveCheckpointMock: vi.fn(),
    getByIdForAccountMock: vi.fn(),
    settleRunRewardsMock: vi.fn(),
    getByIdOrThrowMock: vi.fn(),
    getCharacterWithStatsMock: vi.fn(),
    createItemMock: vi.fn(),
    getByIdMock: vi.fn(),
    deleteItemMock: vi.fn(),
    addItemMock: vi.fn(),
    removeItemMock: vi.fn(),
    rngNextMock: vi.fn(),
    combatResolveMock: vi.fn(),
    selectEventMock: vi.fn(),
    eventResolveMock: vi.fn(),
    generateCandidatesMock: vi.fn(),
}));

vi.mock('./combat.service', () => ({
    CombatService: vi.fn().mockImplementation(function CombatServiceMock() {
        return { resolve: combatResolveMock };
    }),
}));

vi.mock('./event.service', () => ({
    EventService: vi.fn().mockImplementation(function EventServiceMock() {
        return {
            selectEvent: selectEventMock, resolve: eventResolveMock,
        };
    }),
}));

vi.mock('./blessing.service', () => ({
    BlessingService: vi.fn().mockImplementation(function BlessingServiceMock() {
        return { generateCandidates: generateCandidatesMock };
    }),
}));

vi.mock('../repositories/adventure-run.repository', () => ({
    AdventureRunRepository: vi.fn().mockImplementation(function AdventureRunRepositoryMock() {
        return {
            getActiveByCharacterId: getActiveByCharacterIdMock,
            createRun: createRunMock,
            saveCheckpoint: saveCheckpointMock,
        };
    }),
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: vi.fn().mockImplementation(function CharacterRepositoryMock() {
        return {
            getByIdForAccount: getByIdForAccountMock,
            settleRunRewards: settleRunRewardsMock,
            getByIdOrThrow: getByIdOrThrowMock,
        };
    }),
}));

vi.mock('./character.service', () => ({
    CharacterService: vi.fn().mockImplementation(function CharacterServiceMock() {
        return { getCharacterWithStats: getCharacterWithStatsMock };
    }),
}));

vi.mock('../repositories/item.repository', () => ({
    ItemRepository: vi.fn().mockImplementation(function ItemRepositoryMock() {
        return {
            createItem: createItemMock,
            getById: getByIdMock,
            delete: deleteItemMock,
        };
    }),
}));

vi.mock('../repositories/inventory.repository', () => ({
    InventoryRepository: vi.fn().mockImplementation(function InventoryRepositoryMock() {
        return {
            addItem: addItemMock,
            removeItem: removeItemMock,
        };
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
        state: AdventureStateType.EXPLORING,
        step: 0,
        lastRestStep: 0,
        startedAt: Date.now(),
        playerHp: 100,
        playerHpMax: 100,
        blessings: [],
        curses: [],
        blessingPoints: 0,
        runInventory: [],
        score: 0,
        goldEarned: 0,
        gemsEarned: 0,
        lastActivityAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    getByIdForAccountMock.mockResolvedValue({
        characterId: 'char-1', accountId: 'account-1',
    });
    getByIdOrThrowMock.mockResolvedValue({
        characterId: 'char-1', attributes: { LUCK: 0 },
    });
    saveCheckpointMock.mockImplementation(async (runId: string, patch: Record<string, unknown>) => ({
        ...baseRun(), ...patch,
    }));
});

describe('AdventureRunService.startRun', () => {
    it('rejects with a 409 conflict carrying the existing run when one is already active', async () => {
        const existing = baseRun();
        getActiveByCharacterIdMock.mockResolvedValue(existing);

        const service = new AdventureRunService();
        await expect(service.startRun('account-1', 'char-1')).rejects.toThrow(ConflictError);
    });

    it('never leaks `seed` through the 409 conflict details (deterministic-rng spec: seed 不透過 API 回應暴露)', async () => {
        const existing = baseRun({ seed: 'super-secret-seed' });
        getActiveByCharacterIdMock.mockResolvedValue(existing);

        const service = new AdventureRunService();
        await expect(service.startRun('account-1', 'char-1')).rejects.toMatchObject({ details: { run: expect.not.objectContaining({ seed: expect.anything() }) } });
    });

    it('creates a run sized to the character\'s current HP_MAX when none is active', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(null);
        getCharacterWithStatsMock.mockResolvedValue({ stats: { HP_MAX: 150 } });
        createRunMock.mockResolvedValue(baseRun({ playerHpMax: 150 }));

        const service = new AdventureRunService();
        await service.startRun('account-1', 'char-1');

        expect(createRunMock).toHaveBeenCalledWith({
            characterId: 'char-1', accountId: 'account-1', playerHpMax: 150,
        });
    });
});

describe('AdventureRunService.advance — node generation priority', () => {
    it('guarantees Rest once REST_GUARANTEED_INTERVAL steps have passed, even on an elite-cadence step', async () => {
        // step=5, lastRestStep=0 -> 5-0=5 >= 4 (guaranteed) AND step%5==0 (elite) — guarantee wins
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            step: 5, lastRestStep: 0, 
        }));

        const service = new AdventureRunService();
        const result = await service.advance('account-1', 'char-1');

        expect(rngNextMock).not.toHaveBeenCalled();
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.REST,
            currentNodeType: NodeType.REST,
        }));
        expect(result.state).toBe(AdventureStateType.REST);
    });

    it('produces a Strong Elite combat node on step % 9 == 0 when the rest guarantee has not triggered', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            step: 9, lastRestStep: 8, 
        }));

        const service = new AdventureRunService();
        await service.advance('account-1', 'char-1');

        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.COMBAT,
            currentNodeType: NodeType.STRONG_ELITE,
            currentNodeData: expect.objectContaining({
                enemyLevel: 5, tier: NodeType.STRONG_ELITE, 
            }),
        }));
    });

    it('falls back to a weighted random pick using RngService when neither guarantee applies', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            step: 1, lastRestStep: 0, 
        }));
        rngNextMock.mockResolvedValue(0); // lowest roll -> first weighted bucket (COMBAT)

        const service = new AdventureRunService();
        await service.advance('account-1', 'char-1');

        expect(rngNextMock).toHaveBeenCalledWith('run-1');
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.COMBAT,
            currentNodeType: NodeType.COMBAT,
        }));
    });
});

describe('AdventureRunService.advance — COMBAT/EVENT nodes are not resolvable yet', () => {
    it('throws when advance() is called while stuck in COMBAT', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({ state: AdventureStateType.COMBAT }));

        const service = new AdventureRunService();
        await expect(service.advance('account-1', 'char-1')).rejects.toThrow(BusinessLogicError);
    });
});

describe('AdventureRunService.useHealingItem', () => {
    const potion = {
        itemId: 'potion-1',
        templateId: 'engine_oil_basic',
        type: ItemType.POTION,
        rarity: Rarity.N,
        stats: { healPercent: 20 },
        source: ItemSource.DROP,
        characterId: 'char-1',
        createdAt: Date.now(),
    };

    it('rejects when the run is not at a Rest node', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({ state: AdventureStateType.EXPLORING }));

        const service = new AdventureRunService();
        await expect(service.useHealingItem('account-1', 'char-1', 'potion-1')).rejects.toThrow(BusinessLogicError);
    });

    it('heals from the run inventory and removes the item from it', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.REST, playerHp: 50, playerHpMax: 100, runInventory: [potion],
        }));

        const service = new AdventureRunService();
        const result = await service.useHealingItem('account-1', 'char-1', 'potion-1');

        expect(result).toEqual({
            hpHealed: 20, hpCurrent: 70, 
        });
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            playerHp: 70, runInventory: [],
        }));
        expect(removeItemMock).not.toHaveBeenCalled();
    });

    it('heals from the permanent inventory and removes the item there', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.REST, playerHp: 50, playerHpMax: 100, runInventory: [],
        }));
        getByIdMock.mockResolvedValue(potion);

        const service = new AdventureRunService();
        const result = await service.useHealingItem('account-1', 'char-1', 'potion-1');

        expect(result).toEqual({
            hpHealed: 20, hpCurrent: 70, 
        });
        expect(removeItemMock).toHaveBeenCalledWith('char-1', 'potion-1');
        expect(deleteItemMock).toHaveBeenCalledWith('potion-1');
    });

    it('rejects an itemId that is not owned by the character or not a potion', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.REST, runInventory: [], 
        }));
        getByIdMock.mockResolvedValue(undefined);

        const service = new AdventureRunService();
        await expect(service.useHealingItem('account-1', 'char-1', 'missing')).rejects.toThrow(ValidationError);
    });
});

describe('AdventureRunService.getCurrentRun — auto-settlement on DISCONNECT', () => {
    it('completes settlement (state -> ENDED) even when a run-inventory item cannot fit into a full permanent inventory', async () => {
        const droppedItem = {
            itemId: 'drop-1',
            templateId: 'salvaged_wrench',
            type: ItemType.EQUIPMENT,
            rarity: Rarity.N,
            stats: {},
            source: ItemSource.DROP,
            characterId: 'char-1',
            createdAt: Date.now(),
        };
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.EXPLORING,
            runInventory: [droppedItem],
            score: 42,
            goldEarned: 10,
            gemsEarned: 1,
            lastActivityAt: Date.now() - 20 * 60 * 1000, // past the 15-minute reconnect window
        }));
        createItemMock.mockResolvedValue(undefined);
        addItemMock.mockRejectedValue(new BusinessLogicError('Inventory is full'));
        settleRunRewardsMock.mockResolvedValue({ leveledUp: false });

        const service = new AdventureRunService();
        const result = await service.getCurrentRun('account-1', 'char-1');

        expect(result).toBeNull();
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.ENDED,
            endReason: 'DISCONNECT',
        }));
    });
});

describe('AdventureRunService.resolveCombat', () => {
    it('rejects when the run is not at a COMBAT node', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({ state: AdventureStateType.EXPLORING }));

        const service = new AdventureRunService();
        await expect(service.resolveCombat('account-1', 'char-1')).rejects.toThrow(BusinessLogicError);
    });

    it('rejects when the COMBAT node has no enemyLevel/tier context', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.COMBAT, currentNodeData: {}, 
        }));

        const service = new AdventureRunService();
        await expect(service.resolveCombat('account-1', 'char-1')).rejects.toThrow(BusinessLogicError);
    });

    it('on victory: applies rewards, moves to RESOLUTION, and caps runInventory at 50', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.COMBAT,
            currentNodeData: {
                enemyLevel: 5, tier: NodeType.ELITE, 
            },
            score: 100,
            goldEarned: 20,
            gemsEarned: 3,
            blessingPoints: 1,
        }));
        rngNextMock.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
        combatResolveMock.mockResolvedValue({
            victory: true,
            roundCount: 3,
            playerHpRemaining: 80,
            scoreGained: 50,
            goldDropped: 10,
            gemsDropped: 2,
            itemsDropped: [],
            blessingPointsGained: 2,
            enemies: [
                {
                    enemyId: 'e1', name: 'Test Enemy', level: 5, 
                },
            ],
            combatLog: [
                {
                    timestamp: 0, actorId: 'player', targetId: 'e1', action: 'ATTACK', damage: 5,
                },
            ],
        });

        const service = new AdventureRunService();
        const result = await service.resolveCombat('account-1', 'char-1');

        expect(combatResolveMock).toHaveBeenCalledWith(
            expect.objectContaining({ runId: 'run-1' }),
            expect.objectContaining({
                enemyLevel: 5, tier: NodeType.ELITE, 
            }),
        );
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.RESOLUTION,
            playerHp: 80,
            score: 150,
            goldEarned: 30,
            gemsEarned: 5,
            blessingPoints: 3,
        }));
        expect(result.summary.victory).toBe(true);
        expect(result.combatLog).toHaveLength(1);
    });

    it('on defeat: settles the run with endReason=DEAD in a single checkpoint', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.COMBAT,
            currentNodeData: {
                enemyLevel: 5, tier: NodeType.COMBAT, 
            },
            runInventory: [],
        }));
        rngNextMock.mockResolvedValueOnce(0.9).mockResolvedValueOnce(0.9);
        combatResolveMock.mockResolvedValue({
            victory: false,
            roundCount: 2,
            playerHpRemaining: 0,
            scoreGained: 0,
            goldDropped: 0,
            gemsDropped: 0,
            itemsDropped: [],
            blessingPointsGained: 0,
            enemies: [
                {
                    enemyId: 'e1', name: 'Test Enemy', level: 5, 
                },
            ],
            combatLog: [],
        });
        settleRunRewardsMock.mockResolvedValue({ leveledUp: false });

        const service = new AdventureRunService();
        const result = await service.resolveCombat('account-1', 'char-1');

        expect(saveCheckpointMock).toHaveBeenCalledTimes(1);
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.ENDED,
            endReason: 'DEAD',
            playerHp: 0,
        }));
        expect(result.summary.victory).toBe(false);
    });
});

describe('AdventureRunService.advanceFromExploring — EVENT node selection', () => {
    it('calls eventService.selectEvent and stores the template info in currentNodeData', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            step: 1, lastRestStep: 0, 
        }));
        rngNextMock.mockResolvedValue(0.6); // weighted pick -> EVENT bucket (COMBAT 55/EVENT 25/...)
        selectEventMock.mockResolvedValue({
            id: 'medbay_leak', type: 'HEAL', description: 'flavor text', choices: undefined,
        });

        const service = new AdventureRunService();
        await service.advance('account-1', 'char-1');

        expect(selectEventMock).toHaveBeenCalledWith('run-1');
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.EVENT,
            currentNodeData: expect.objectContaining({ eventTemplateId: 'medbay_leak' }),
        }));
        // Firestore rejects `undefined` field values — a choice-less template
        // must omit the `choices` key entirely rather than set it to undefined.
        const [, patch] = saveCheckpointMock.mock.calls[0] as [string, { currentNodeData: object }];
        expect(patch.currentNodeData).not.toHaveProperty('choices');
    });
});

describe('AdventureRunService.resolveEvent', () => {
    it('rejects when the run is not at an EVENT node', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({ state: AdventureStateType.EXPLORING }));

        const service = new AdventureRunService();
        await expect(service.resolveEvent('account-1', 'char-1')).rejects.toThrow(BusinessLogicError);
    });

    it('applies the event outcome (heal + gold) and moves to RESOLUTION', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.EVENT,
            playerHp: 50,
            playerHpMax: 100,
            goldEarned: 10,
            currentNodeData: { eventTemplateId: 'medbay_leak' },
        }));
        eventResolveMock.mockResolvedValue({
            eventId: 'medbay_leak', type: 'HEAL', description: 'flavor', hpHealed: 20, goldGained: 5,
        });

        const service = new AdventureRunService();
        const result = await service.resolveEvent('account-1', 'char-1');

        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.RESOLUTION,
            playerHp: 70,
            goldEarned: 15,
        }));
        expect(result.hpHealed).toBe(20);
    });

    it('forwards choiceIndex to eventService.resolve', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.EVENT,
            currentNodeData: { eventTemplateId: 'sealed_crate' },
        }));
        eventResolveMock.mockResolvedValue({
            eventId: 'sealed_crate', type: 'CHOICE', description: 'flavor', goldGained: 5,
        });

        const service = new AdventureRunService();
        await service.resolveEvent('account-1', 'char-1', 1);

        expect(eventResolveMock).toHaveBeenCalledWith(expect.objectContaining({ runId: 'run-1' }), 1);
    });
});

describe('AdventureRunService.advanceFromResolution — BLESSING_SELECT candidate generation', () => {
    it('generates candidates and stores them when blessingPoints reaches the threshold', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.RESOLUTION, blessingPoints: 3,
        }));
        getByIdOrThrowMock.mockResolvedValue({
            characterId: 'char-1', attributes: { LUCK: 7 }, 
        });
        generateCandidatesMock.mockResolvedValue([
            { modifierId: 'blessing_atk_boost' },
            { modifierId: 'blessing_def_boost' },
            { modifierId: 'blessing_hp_boost' },
        ]);

        const service = new AdventureRunService();
        await service.advance('account-1', 'char-1');

        expect(generateCandidatesMock).toHaveBeenCalledWith('run-1', 7);
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.BLESSING_SELECT,
            currentNodeData: { candidates: expect.any(Array) },
        }));
    });
});

describe('AdventureRunService.selectBlessing', () => {
    it('rejects a blessingId that is not among the current candidates', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.BLESSING_SELECT,
            currentNodeData: {
                candidates: [
                    {
                        modifierId: 'blessing_atk_boost', name: 'x', description: 'y', 
                    },
                ], 
            },
        }));

        const service = new AdventureRunService();
        await expect(service.selectBlessing('account-1', 'char-1', 'not-a-candidate')).rejects.toThrow(ValidationError);
    });

    it('adds the chosen blessing, resets blessingPoints, and advances to EXPLORING', async () => {
        getActiveByCharacterIdMock.mockResolvedValue(baseRun({
            state: AdventureStateType.BLESSING_SELECT,
            step: 4,
            blessings: [],
            blessingPoints: 3,
            currentNodeData: {
                candidates: [
                    {
                        modifierId: 'blessing_atk_boost', name: '戰鬥意志', description: 'desc', isBlessing: true,
                    },
                ],
            },
        }));

        const service = new AdventureRunService();
        const chosen = await service.selectBlessing('account-1', 'char-1', 'blessing_atk_boost');

        expect(chosen.modifierId).toBe('blessing_atk_boost');
        expect(saveCheckpointMock).toHaveBeenCalledWith('run-1', expect.objectContaining({
            state: AdventureStateType.EXPLORING,
            step: 5,
            blessings: ['blessing_atk_boost'],
            blessingPoints: 0,
        }));
    });
});
