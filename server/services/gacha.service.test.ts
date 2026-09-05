import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { GachaService } from './gacha.service';
import { ItemType } from '../../shared/types/item';
import type { Character } from '../../shared/types/character';

const {
    collectionMock, txGetMock, txSetMock, txUpdateMock, runTransactionMock, docs,
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
    const runTransactionMock = vi.fn(async (callback: (_tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock,
    }));

    return {
        collectionMock, txGetMock, txSetMock, txUpdateMock, runTransactionMock, docs,
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

beforeEach(() => {
    vi.clearAllMocks();
    docs.clear();
    runTransactionMock.mockImplementation(async (callback: (_tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock,
    }));
});

describe('GachaService.pull', () => {
    it('pulls with gold: deducts 100 gold, delivers an equipment item into the permanent inventory', async () => {
        setDoc('characters', 'char-1', baseCharacter());

        const service = new GachaService();
        const result = await service.pull('account-1', 'char-1', 'GOLD');

        expect(result.currency).toBe('GOLD');
        expect(result.amountSpent).toBe(100);
        expect(result.remainingBalance).toBe(900);
        expect(result.item.type).toBe(ItemType.EQUIPMENT);

        expect(txSetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'items', id: result.item.itemId, 
            }),
            expect.objectContaining({ itemId: result.item.itemId }),
        );
        expect(txSetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'inventories', id: 'char-1', 
            }),
            expect.objectContaining({ items: [result.item.itemId] }),
        );
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'characters', id: 'char-1', 
            }),
            expect.objectContaining({ gold: 900 }),
        );
    });

    it('pulls with gems: deducts 5 gems, delivers an equipment item into the permanent inventory', async () => {
        setDoc('characters', 'char-1', baseCharacter());

        const service = new GachaService();
        const result = await service.pull('account-1', 'char-1', 'GEMS');

        expect(result.currency).toBe('GEMS');
        expect(result.amountSpent).toBe(5);
        expect(result.remainingBalance).toBe(95);
        expect(result.item.type).toBe(ItemType.EQUIPMENT);

        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'characters', id: 'char-1', 
            }),
            expect.objectContaining({ gems: 95 }),
        );
    });

    it('rejects a gold pull when the character cannot afford it, without charging', async () => {
        setDoc('characters', 'char-1', baseCharacter({ gold: 50 }));

        const service = new GachaService();
        await expect(service.pull('account-1', 'char-1', 'GOLD')).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
        expect(txSetMock).not.toHaveBeenCalled();
    });

    it('rejects a gems pull when the character cannot afford it, without charging', async () => {
        setDoc('characters', 'char-1', baseCharacter({ gems: 2 }));

        const service = new GachaService();
        await expect(service.pull('account-1', 'char-1', 'GEMS')).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
        expect(txSetMock).not.toHaveBeenCalled();
    });

    it('rejects when the permanent inventory is already full, leaving the character untouched', async () => {
        setDoc('characters', 'char-1', baseCharacter());
        setDoc('inventories', 'char-1', {
            characterId: 'char-1',
            items: Array.from({ length: 500 }, (_, i) => `existing-${i}`),
            updatedAt: Date.now(),
        });

        const service = new GachaService();
        await expect(service.pull('account-1', 'char-1', 'GOLD')).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
        expect(txSetMock).not.toHaveBeenCalled();
    });

    it('only ever pulls equipment, never a potion, across many pulls', async () => {
        setDoc('characters', 'char-1', baseCharacter({
            gold: 100000, gems: 100000,
        }));

        const service = new GachaService();
        for (let i = 0; i < 50; i++) {
            docs.delete('inventories:char-1');
             
            const result = await service.pull('account-1', 'char-1', i % 2 === 0 ? 'GOLD' : 'GEMS');
            expect(result.item.type).toBe(ItemType.EQUIPMENT);
        }
    });

    it('throws when the character is not owned by the account', async () => {
        setDoc('characters', 'char-1', baseCharacter());

        const service = new GachaService();
        await expect(service.pull('other-account', 'char-1', 'GOLD')).rejects.toThrow();
    });
});
