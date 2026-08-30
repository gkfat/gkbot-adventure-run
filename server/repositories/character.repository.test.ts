import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { CharacterRepository } from './character.repository';
import { AdventureEndReason } from '../../shared/types/adventure';
import type { Character } from '../../shared/types/character';

const {
    docMock, collectionMock, runTransactionMock, txGetMock, txUpdateMock,
} = vi.hoisted(() => {
    const docMock = vi.fn((id: string) => ({ id }));
    const collectionMock = vi.fn(() => ({ doc: docMock }));
    const txGetMock = vi.fn();
    const txUpdateMock = vi.fn();
    const runTransactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, update: txUpdateMock,
    }));
    return {
        docMock, collectionMock, runTransactionMock, txGetMock, txUpdateMock,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock,
        runTransaction: runTransactionMock,
    }),
}));

function baseCharacter(overrides: Partial<Character> = {}): Character {
    return {
        characterId: 'char-1',
        accountId: 'account-1',
        archetypeId: 'engineer',
        className: '工匠',
        level: 1,
        exp: 0,
        gold: 0,
        gems: 0,
        attributes: {
            STR: 1, AGI: 1, CON: 1, LUCK: 1,
        },
        unspentAttributePoints: 0,
        equipment: {},
        nextChapterIndex: 0,
        nickname: '玩家A1B2C3',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    runTransactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, update: txUpdateMock,
    }));
});

describe('CharacterRepository.settleRunRewards', () => {
    it('advances nextChapterIndex when endReason=COMPLETED', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({ nextChapterIndex: 2 }),
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 10, gemsEarned: 1, expGained: 50, endReason: AdventureEndReason.COMPLETED,
        });

        expect(result.character.nextChapterIndex).toBe(3);
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-1' }), expect.objectContaining({
            nextChapterIndex: 3,
        }));
    });

    it('leaves nextChapterIndex unchanged when endReason=DEAD', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({ nextChapterIndex: 2 }),
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 50, endReason: AdventureEndReason.DEAD,
        });

        expect(result.character.nextChapterIndex).toBe(2);
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-1' }), expect.objectContaining({
            nextChapterIndex: 2,
        }));
    });

    it('leaves nextChapterIndex unchanged when endReason=DISCONNECT', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({ nextChapterIndex: 5 }),
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 10, endReason: AdventureEndReason.DISCONNECT,
        });

        expect(result.character.nextChapterIndex).toBe(5);
    });

    it('reports leveledUp and unspentAttributePointsGained across a level-up', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({ level: 1, exp: 0 }),
        });

        const repo = new CharacterRepository();
        // EXP_TABLE[1] = 359 — grant enough to clear one level.
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 400, endReason: AdventureEndReason.COMPLETED,
        });

        expect(result.leveledUp).toBe(true);
        expect(result.character.level).toBe(2);
        expect(result.unspentAttributePointsGained).toBe(1);
    });

    it('treats a missing nextChapterIndex on a legacy character document as 0', async () => {
        const legacyDoc = baseCharacter();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (legacyDoc as any).nextChapterIndex;
        txGetMock.mockResolvedValue({ exists: true, data: () => legacyDoc });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 0, endReason: AdventureEndReason.COMPLETED,
        });

        expect(result.character.nextChapterIndex).toBe(1);
    });
});
