import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { InventoryService } from './inventory.service';
import { EquipmentSlot } from '../../shared/types/common';
import {
    ItemType, ItemSource, 
} from '../../shared/types/item';
import type { Character } from '../../shared/types/character';
import type {
    ItemInstance, Inventory, 
} from '../../shared/types/item';

const {
    collectionMock, txGetMock, txSetMock, txUpdateMock, txDeleteMock, runTransactionMock, docs,
} = vi.hoisted(() => {
    const docs = new Map<string, { exists: boolean; data?: () => unknown }>();

    const makeRef = (collectionName: string, id: string) => ({
        collectionName,
        id,
        get: () => Promise.resolve(docs.get(`${collectionName}:${id}`) ?? { exists: false }),
    });

    const collectionMock = vi.fn((collectionName: string) => ({ doc: (id: string) => makeRef(collectionName, id) }));

    const txGetMock = vi.fn((ref: { collectionName: string; id: string }) => (
        Promise.resolve(docs.get(`${ref.collectionName}:${ref.id}`) ?? { exists: false })
    ));
    const txSetMock = vi.fn();
    const txUpdateMock = vi.fn();
    const txDeleteMock = vi.fn();
    const runTransactionMock = vi.fn(async (callback: (_tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock, delete: txDeleteMock,
    }));

    return {
        collectionMock, txGetMock, txSetMock, txUpdateMock, txDeleteMock, runTransactionMock, docs,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock,
        runTransaction: runTransactionMock,
    }),
}));

function setDoc(collectionName: string, id: string, data: unknown) {
    docs.set(`${collectionName}:${id}`, {
        exists: true, data: () => data,
    });
}

function baseCharacter(overrides: Partial<Character> = {}): Character {
    return {
        characterId: 'char-1',
        accountId: 'account-1',
        archetypeId: 'engineer',
        className: '工匠',
        level: 1,
        exp: 0,
        gold: 1000,
        gems: 100,
        attributes: {
            STR: 1, AGI: 1, CON: 1, LUCK: 1,
        },
        unspentAttributePoints: 0,
        equipment: {},
        nextChapterIndex: 0,
        currentLevelIndex: 0,
        chapterTotalLevels: 5,
        nickname: '玩家A1B2C3',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

function baseItem(overrides: Partial<ItemInstance> = {}): ItemInstance {
    return {
        itemId: 'item-1',
        templateId: 'salvaged_wrench',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        rarity: 'N' as ItemInstance['rarity'],
        stats: { ATK: 5 },
        name: '維修殘骸扳手',
        description: '從維修設施殘骸堆挖出的重型扳手。',
        source: ItemSource.DROP,
        characterId: 'char-1',
        createdAt: Date.now(),
        ...overrides,
    };
}

function baseInventory(overrides: Partial<Inventory> = {}): Inventory {
    return {
        characterId: 'char-1', items: ['item-1'], updatedAt: Date.now(), ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    docs.clear();
    runTransactionMock.mockImplementation(async (callback: (_tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock, delete: txDeleteMock,
    }));
});

describe('InventoryService.sellItem', () => {
    it('credits half the item\'s rarity gold price, removes the inventory reference, and deletes the item document', async () => {
        setDoc('characters', 'char-1', baseCharacter());
        setDoc('items', 'item-1', baseItem());
        setDoc('inventories', 'char-1', baseInventory());

        const service = new InventoryService();
        const result = await service.sellItem('char-1', 'item-1');

        // salvaged_wrench N gold range is 100-200 -> midpoint 150 * 0.5 = 75
        expect(result.goldEarned).toBe(75);
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'characters', id: 'char-1', 
            }),
            expect.objectContaining({ gold: 1075 }),
        );
        expect(txSetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'inventories', id: 'char-1', 
            }),
            expect.objectContaining({ items: [] }),
        );
        expect(txDeleteMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'items', id: 'item-1', 
            }),
        );
    });

    it('rejects selling an item that is currently equipped, without charging or deleting anything', async () => {
        setDoc('characters', 'char-1', baseCharacter({ equipment: { [EquipmentSlot.RIGHT_HAND]: 'item-1' } }));
        setDoc('items', 'item-1', baseItem());
        setDoc('inventories', 'char-1', baseInventory());

        const service = new InventoryService();
        await expect(service.sellItem('char-1', 'item-1')).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
        expect(txSetMock).not.toHaveBeenCalled();
        expect(txDeleteMock).not.toHaveBeenCalled();
    });

    it('rejects selling an item not in the character\'s inventory', async () => {
        setDoc('characters', 'char-1', baseCharacter());
        setDoc('items', 'item-1', baseItem());
        setDoc('inventories', 'char-1', baseInventory({ items: [] }));

        const service = new InventoryService();
        await expect(service.sellItem('char-1', 'item-1')).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
    });
});
