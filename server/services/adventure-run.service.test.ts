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
    getByIdForAccountMock, settleRunRewardsMock,
    getCharacterWithStatsMock,
    createItemMock, getByIdMock, deleteItemMock,
    addItemMock, removeItemMock,
    rngNextMock,
} = vi.hoisted(() => ({
    getActiveByCharacterIdMock: vi.fn(),
    createRunMock: vi.fn(),
    saveCheckpointMock: vi.fn(),
    getByIdForAccountMock: vi.fn(),
    settleRunRewardsMock: vi.fn(),
    getCharacterWithStatsMock: vi.fn(),
    createItemMock: vi.fn(),
    getByIdMock: vi.fn(),
    deleteItemMock: vi.fn(),
    addItemMock: vi.fn(),
    removeItemMock: vi.fn(),
    rngNextMock: vi.fn(),
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

describe('AdventureRunService.endRun — settlement', () => {
    it('reports items that could not fit into a full permanent inventory instead of dropping them', async () => {
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
            state: AdventureStateType.EXPLORING, runInventory: [droppedItem], score: 42, goldEarned: 10, gemsEarned: 1,
        }));
        createItemMock.mockResolvedValue(undefined);
        addItemMock.mockRejectedValue(new BusinessLogicError('Inventory is full'));
        settleRunRewardsMock.mockResolvedValue({ leveledUp: false });

        const service = new AdventureRunService();
        const result = await service.endRun('account-1', 'char-1');

        expect(result.itemsEarned).toBe(0);
        expect(result.untransferredItemIds).toEqual(['drop-1']);
        expect(result.finalScore).toBe(42);
        expect(result.expGained).toBe(42);
    });
});
