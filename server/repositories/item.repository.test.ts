import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { ItemRepository } from './item.repository';

const {
    getAllMock, docMock, collectionMock, 
} = vi.hoisted(() => {
    const getAllMock = vi.fn();
    const docMock = vi.fn((id: string) => ({ id }));
    const collectionMock = vi.fn(() => ({ doc: docMock }));
    return {
        getAllMock, docMock, collectionMock,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock,
        getAll: getAllMock,
    }),
}));

describe('ItemRepository.getByIds', () => {
    beforeEach(() => {
        getAllMock.mockReset();
        collectionMock.mockClear();
        docMock.mockClear();
    });

    it('returns [] without calling Firestore when itemIds is empty', async () => {
        const repo = new ItemRepository();
        const result = await repo.getByIds([]);

        expect(result).toEqual([]);
        expect(getAllMock).not.toHaveBeenCalled();
    });

    it('batches requests over the 100-id chunk size into multiple getAll calls and merges results', async () => {
        const ids = Array.from({ length: 250 }, (_, i) => `item-${i}`);
        getAllMock.mockImplementation(async (...refs: { id: string }[]) => refs.map(ref => ({
            exists: true,
            data: () => ({ itemId: ref.id }),
        })));

        const repo = new ItemRepository();
        const result = await repo.getByIds(ids);

        // 250 ids at 100 per batch -> 3 calls (100 + 100 + 50)
        expect(getAllMock).toHaveBeenCalledTimes(3);
        expect(result).toHaveLength(250);
        expect(result.map(item => item.itemId).sort()).toEqual([...ids].sort());
    });

    it('skips ids whose documents no longer exist', async () => {
        getAllMock.mockResolvedValue([
            {
                exists: true, data: () => ({ itemId: 'a' }),
            }, {
                exists: false, data: () => undefined,
            },
        ]);

        const repo = new ItemRepository();
        const result = await repo.getByIds(['a', 'b']);

        expect(result).toEqual([{ itemId: 'a' }]);
    });
});
