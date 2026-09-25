import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { LeaderboardRepository } from './leaderboard.repository';
import type { LeaderboardEntry } from '../../shared/types/leaderboard';

const {
    docGetMock, docMock,
    txGetMock, txSetMock, runTransactionMock,
    getMock, whereMock, orderByMock, limitMock,
    collectionMock,
} = vi.hoisted(() => {
    const docGetMock = vi.fn();
    const docMock = vi.fn((id: string) => ({
        id, get: docGetMock,
    }));

    const txGetMock = vi.fn();
    const txSetMock = vi.fn();
    const runTransactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock,
    }));

    // Single reusable chain: where()/orderBy()/limit()/count() all return
    // the same chain object (mirrors Firestore's fluent query builder).
    const getMock = vi.fn();
    const chain: Record<string, unknown> = {};
    const whereMock = vi.fn(() => chain);
    const orderByMock = vi.fn(() => chain);
    const limitMock = vi.fn(() => chain);
    const countMock = vi.fn(() => chain);
    Object.assign(chain, {
        where: whereMock, orderBy: orderByMock, limit: limitMock, count: countMock, get: getMock,
    });

    const collectionMock = vi.fn(() => ({
        doc: docMock, where: whereMock,
    }));

    return {
        docGetMock, docMock,
        txGetMock, txSetMock, runTransactionMock,
        getMock, whereMock, orderByMock, limitMock,
        collectionMock,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock, runTransaction: runTransactionMock,
    }),
}));

function entry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
    return {
        seasonId: '2026-W39',
        accountId: 'account-1',
        characterId: 'char-1',
        nickname: '玩家A',
        score: 100,
        runId: 'run-1',
        achievedAt: Date.now(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    runTransactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock,
    }));
});

describe('LeaderboardRepository.get (leaderboard)', () => {
    it('returns null when the character has no entry for the season', async () => {
        docGetMock.mockResolvedValue({ exists: false });

        const repo = new LeaderboardRepository();
        const result = await repo.get('2026-W39', 'char-none');

        expect(docMock).toHaveBeenCalledWith('2026-W39_char-none');
        expect(result).toBeNull();
    });

    it('returns the entry when one exists', async () => {
        const existing = entry({ score: 250 });
        docGetMock.mockResolvedValue({
            exists: true, id: '2026-W39_char-1', data: () => existing,
        });

        const repo = new LeaderboardRepository();
        const result = await repo.get('2026-W39', 'char-1');

        expect(docMock).toHaveBeenCalledWith('2026-W39_char-1');
        expect(result).toEqual(expect.objectContaining({ score: 250 }));
    });

    it('does not tack an `id` field onto the result (leaderboardEntrySchema is .strict() and has no `id` field)', async () => {
        const existing = entry({ score: 250 });
        docGetMock.mockResolvedValue({
            exists: true, id: '2026-W39_char-1', data: () => existing,
        });

        const repo = new LeaderboardRepository();
        const result = await repo.get('2026-W39', 'char-1');

        expect(result && 'id' in result).toBe(false);
    });
});

describe('LeaderboardRepository.addScore (leaderboard)', () => {
    it('writes to a doc id combining seasonId and characterId, starting from 0 when no entry exists yet', async () => {
        txGetMock.mockResolvedValue({ exists: false });

        const repo = new LeaderboardRepository();
        const candidate = entry({ score: 100 });
        const result = await repo.addScore(candidate);

        expect(docMock).toHaveBeenCalledWith('2026-W39_char-1');
        expect(txSetMock).toHaveBeenCalledWith(expect.objectContaining({ id: '2026-W39_char-1' }), candidate);
        expect(result).toEqual(candidate);
    });

    it('adds the new score onto the existing cumulative score', async () => {
        const existing = entry({
            score: 100, runId: 'run-old',
        });
        txGetMock.mockResolvedValue({
            exists: true, data: () => existing,
        });

        const repo = new LeaderboardRepository();
        const candidate = entry({
            score: 50, runId: 'run-new',
        });
        const result = await repo.addScore(candidate);

        const expected = {
            ...candidate, score: 150,
        };
        expect(txSetMock).toHaveBeenCalledWith(expect.objectContaining({ id: '2026-W39_char-1' }), expected);
        expect(result).toEqual(expected);
    });

    it('overwrites nickname/runId/achievedAt/step with the contributing run\'s values (a snapshot, not accumulated)', async () => {
        const existing = entry({
            score: 100, runId: 'run-old', nickname: '舊暱稱', step: 5,
        });
        txGetMock.mockResolvedValue({
            exists: true, data: () => existing,
        });

        const repo = new LeaderboardRepository();
        const candidate = entry({
            score: 10, runId: 'run-new', nickname: '新暱稱', step: 9,
        });
        const result = await repo.addScore(candidate);

        expect(result.runId).toBe('run-new');
        expect(result.nickname).toBe('新暱稱');
        expect(result.step).toBe(9);
    });

    it('sums killCount onto the existing cumulative killCount when given', async () => {
        const existing = entry({
            score: 100, killCount: 40,
        });
        txGetMock.mockResolvedValue({
            exists: true, data: () => existing,
        });

        const repo = new LeaderboardRepository();
        const result = await repo.addScore(entry({
            score: 10, killCount: 4,
        }));

        expect(result.killCount).toBe(44);
    });

    it('does not carry a score over from a different season (fresh doc id resets it)', async () => {
        // A new season's doc simply doesn't exist yet — the previous season's
        // score lives under a different doc id and is never read here.
        txGetMock.mockResolvedValue({ exists: false });

        const repo = new LeaderboardRepository();
        const candidate = entry({
            seasonId: '2026-W40', score: 10,
        });
        const result = await repo.addScore(candidate);

        expect(docMock).toHaveBeenCalledWith('2026-W40_char-1');
        expect(txSetMock).toHaveBeenCalledWith(expect.objectContaining({ id: '2026-W40_char-1' }), candidate);
        expect(result).toEqual(candidate);
    });
});

describe('LeaderboardRepository.getTopN (leaderboard)', () => {
    it('filters by seasonId, orders by score descending, and limits the result', async () => {
        const entries = [
            entry({
                accountId: 'a', score: 300, 
            }), entry({
                accountId: 'b', score: 200, 
            }),
        ];
        getMock.mockResolvedValue({ docs: entries.map(e => ({ data: () => e })) });

        const repo = new LeaderboardRepository();
        const result = await repo.getTopN('2026-W39', 10);

        expect(whereMock).toHaveBeenCalledWith('seasonId', '==', '2026-W39');
        expect(orderByMock).toHaveBeenCalledWith('score', 'desc');
        expect(limitMock).toHaveBeenCalledWith(10);
        expect(result).toEqual(entries);
    });
});

describe('LeaderboardRepository.countHigherThan (leaderboard)', () => {
    it('counts entries within the season with a strictly higher score', async () => {
        getMock.mockResolvedValue({ data: () => ({ count: 7 }) });

        const repo = new LeaderboardRepository();
        const result = await repo.countHigherThan('2026-W39', 150);

        expect(whereMock).toHaveBeenCalledWith('seasonId', '==', '2026-W39');
        expect(whereMock).toHaveBeenCalledWith('score', '>', 150);
        expect(result).toBe(7);
    });
});

describe('LeaderboardRepository.getAllForSeason (leaderboard)', () => {
    it('returns every entry for the season, unlimited, score descending', async () => {
        const entries = [
            entry({
                accountId: 'a', score: 500, 
            }),
            entry({
                accountId: 'b', score: 400, 
            }),
            entry({
                accountId: 'c', score: 300, 
            }),
        ];
        getMock.mockResolvedValue({ docs: entries.map(e => ({ data: () => e })) });

        const repo = new LeaderboardRepository();
        const result = await repo.getAllForSeason('2026-W39');

        expect(whereMock).toHaveBeenCalledWith('seasonId', '==', '2026-W39');
        expect(orderByMock).toHaveBeenCalledWith('score', 'desc');
        expect(limitMock).not.toHaveBeenCalled();
        expect(result).toEqual(entries);
    });
});
