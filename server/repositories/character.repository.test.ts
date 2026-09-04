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
        talentPoints: 0,
        talents: {},
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
    runTransactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, update: txUpdateMock,
    }));
});

describe('CharacterRepository.settleRunRewards — chapter/level advance (chapter-level-structure)', () => {
    it('advances currentLevelIndex within the same chapter when the chapter has levels left', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({
                nextChapterIndex: 2, currentLevelIndex: 1, chapterTotalLevels: 5,
            }),
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 10, gemsEarned: 1, expGained: 50, endReason: AdventureEndReason.COMPLETED,
        });

        expect(result.character.currentLevelIndex).toBe(2);
        expect(result.character.chapterTotalLevels).toBe(5);
        expect(result.character.nextChapterIndex).toBe(2);
        expect(result.chapterAdvanced).toBe(false);
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-1' }), expect.objectContaining({
            currentLevelIndex: 2, nextChapterIndex: 2,
        }));
    });

    it('advances nextChapterIndex and resets currentLevelIndex when the chapter\'s last level completes', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({
                nextChapterIndex: 2, currentLevelIndex: 4, chapterTotalLevels: 5,
            }),
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 10, gemsEarned: 1, expGained: 50, endReason: AdventureEndReason.COMPLETED,
        });

        expect(result.character.nextChapterIndex).toBe(3);
        expect(result.character.currentLevelIndex).toBe(0);
        expect(result.character.chapterTotalLevels).toBeGreaterThan(0);
        expect(result.chapterAdvanced).toBe(true);
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-1' }), expect.objectContaining({
            nextChapterIndex: 3, currentLevelIndex: 0,
        }));
    });

    it('leaves chapter/level progress unchanged when endReason=DEAD', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({
                nextChapterIndex: 2, currentLevelIndex: 4, chapterTotalLevels: 5,
            }),
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 50, endReason: AdventureEndReason.DEAD,
        });

        expect(result.character.nextChapterIndex).toBe(2);
        expect(result.character.currentLevelIndex).toBe(4);
        expect(result.character.chapterTotalLevels).toBe(5);
        expect(result.chapterAdvanced).toBe(false);
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-1' }), expect.objectContaining({
            nextChapterIndex: 2, currentLevelIndex: 4, chapterTotalLevels: 5,
        }));
    });

    it('leaves chapter/level progress unchanged when endReason=DISCONNECT', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({
                nextChapterIndex: 5, currentLevelIndex: 2, chapterTotalLevels: 8,
            }),
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 10, endReason: AdventureEndReason.DISCONNECT,
        });

        expect(result.character.nextChapterIndex).toBe(5);
        expect(result.character.currentLevelIndex).toBe(2);
        expect(result.character.chapterTotalLevels).toBe(8);
        expect(result.chapterAdvanced).toBe(false);
    });

    it('reports leveledUp and unspentAttributePointsGained across a level-up', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({
                level: 1, exp: 0, 
            }),
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

    it('grants 1 talentPoint per level up alongside unspentAttributePoints', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({
                level: 1, exp: 0, talentPoints: 0,
            }),
        });

        const repo = new CharacterRepository();
        // EXP_TABLE[1] = 359 — grant enough to clear one level.
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 400, endReason: AdventureEndReason.COMPLETED,
        });

        expect(result.character.level).toBe(2);
        expect(result.unspentAttributePointsGained).toBe(1);
        expect(result.character.talentPoints).toBe(1);
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-1' }), expect.objectContaining({
            unspentAttributePoints: 1, talentPoints: 1,
        }));
    });

    it('grants talentPoints for every level gained in a single settlement (level 5 -> 8)', async () => {
        txGetMock.mockResolvedValue({
            exists: true, data: () => baseCharacter({
                level: 5, exp: 0, talentPoints: 0, unspentAttributePoints: 0,
            }),
        });

        const repo = new CharacterRepository();
        // EXP_TABLE[5]+[6]+[7] = 1702+2080+2470 = 6252 — enough to clear 3 levels.
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 6252, endReason: AdventureEndReason.COMPLETED,
        });

        expect(result.character.level).toBe(8);
        expect(result.unspentAttributePointsGained).toBe(3);
        expect(result.character.talentPoints).toBe(3);
    });

    it('treats a missing nextChapterIndex on a legacy character document as 0', async () => {
        const legacyDoc = baseCharacter({
            currentLevelIndex: 0, chapterTotalLevels: 5, 
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (legacyDoc as any).nextChapterIndex;
        txGetMock.mockResolvedValue({
            exists: true, data: () => legacyDoc, 
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 0, endReason: AdventureEndReason.COMPLETED,
        });

        // nextChapterIndex defaults to 0, and since currentLevelIndex(0)+1 < chapterTotalLevels(5)
        // this is a same-chapter level advance, not a chapter advance.
        expect(result.character.nextChapterIndex).toBe(0);
        expect(result.character.currentLevelIndex).toBe(1);
        expect(result.chapterAdvanced).toBe(false);
    });

    it('treats missing currentLevelIndex/chapterTotalLevels on a legacy character document as freshly-rolled defaults', async () => {
        const legacyDoc = baseCharacter({ nextChapterIndex: 3 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (legacyDoc as any).currentLevelIndex;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (legacyDoc as any).chapterTotalLevels;
        txGetMock.mockResolvedValue({
            exists: true, data: () => legacyDoc, 
        });

        const repo = new CharacterRepository();
        const result = await repo.settleRunRewards('char-1', {
            goldEarned: 0, gemsEarned: 0, expGained: 0, endReason: AdventureEndReason.DEAD,
        });

        // DEAD doesn't advance, but the missing fields must still be
        // defaulted (and persisted) rather than left undefined.
        expect(result.character.currentLevelIndex).toBe(0);
        expect(result.character.chapterTotalLevels).toBeGreaterThan(0);
    });
});
