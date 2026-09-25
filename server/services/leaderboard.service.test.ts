import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { LeaderboardService } from './leaderboard.service';
import type { LeaderboardEntry } from '../../shared/types/leaderboard';

const {
    getTopNMock, countHigherThanMock, getMock, upsertIfHigherMock,
} = vi.hoisted(() => ({
    getTopNMock: vi.fn(),
    countHigherThanMock: vi.fn(),
    getMock: vi.fn(),
    upsertIfHigherMock: vi.fn(),
}));

vi.mock('../repositories/leaderboard.repository', () => ({
    LeaderboardRepository: class {
        getTopN = getTopNMock;
        countHigherThan = countHigherThanMock;
        get = getMock;
        upsertIfHigher = upsertIfHigherMock;
    },
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
});

describe('LeaderboardService.updateIfBetter (leaderboard)', () => {
    it('builds an entry with a fresh achievedAt + current seasonId and delegates to upsertIfHigher', async () => {
        upsertIfHigherMock.mockImplementation((e: LeaderboardEntry) => e);

        const service = new LeaderboardService();
        const result = await service.updateIfBetter({
            accountId: 'account-1',
            characterId: 'char-1',
            nickname: '玩家A',
            score: 250,
            runId: 'run-9',
            meta: {
                step: 12, killCount: 30,
            },
        });

        expect(upsertIfHigherMock).toHaveBeenCalledWith(expect.objectContaining({
            seasonId: expect.any(String),
            accountId: 'account-1', score: 250, runId: 'run-9', step: 12, killCount: 30,
        }));
        expect(result.score).toBe(250);
    });

    it('omits step/killCount entirely (not as undefined) when meta is not given — Firestore rejects explicit undefined field values', async () => {
        upsertIfHigherMock.mockImplementation((e: LeaderboardEntry) => e);

        const service = new LeaderboardService();
        await service.updateIfBetter({
            accountId: 'account-1',
            characterId: 'char-1',
            nickname: '玩家A',
            score: 4,
            runId: 'run-1',
        });

        const written = upsertIfHigherMock.mock.calls[0][0];
        expect('step' in written).toBe(false);
        expect('killCount' in written).toBe(false);
    });
});

describe('LeaderboardService.getLeaderboard (leaderboard)', () => {
    it('omits myRank/myEntry and skips the get() lookup when no characterId is given', async () => {
        getTopNMock.mockResolvedValue([entry({ score: 300 })]);
        countHigherThanMock.mockResolvedValue(1);

        const service = new LeaderboardService();
        const result = await service.getLeaderboard(50);

        expect(getMock).not.toHaveBeenCalled();
        expect(result.myRank).toBeUndefined();
        expect(result.myEntry).toBeUndefined();
        expect(result.entries).toHaveLength(1);
        expect(result.seasonEndsAt).toEqual(expect.any(Number));
    });

    it('omits myRank/myEntry when the requester\'s character has no entry this season', async () => {
        getTopNMock.mockResolvedValue([entry({ score: 300 })]);
        countHigherThanMock.mockResolvedValue(1);
        getMock.mockResolvedValue(null);

        const service = new LeaderboardService();
        const result = await service.getLeaderboard(50, 'char-none');

        expect(result.myRank).toBeUndefined();
        expect(result.myEntry).toBeUndefined();
        expect(result.entries).toHaveLength(1);
    });

    it('computes myRank as 1 + count of strictly-higher entries', async () => {
        const myEntry = entry({
            characterId: 'char-2', score: 150,
        });
        getTopNMock.mockResolvedValue([entry({ score: 300 }), myEntry]);
        getMock.mockResolvedValue(myEntry);
        // total (score > -1) then myRank (score > 150)
        countHigherThanMock.mockResolvedValueOnce(5).mockResolvedValueOnce(1);

        const service = new LeaderboardService();
        const result = await service.getLeaderboard(50, 'char-2');

        expect(countHigherThanMock).toHaveBeenNthCalledWith(1, expect.any(String), -1);
        expect(countHigherThanMock).toHaveBeenNthCalledWith(2, expect.any(String), 150);
        expect(result.total).toBe(5);
        expect(result.myRank).toBe(2);
        expect(result.myEntry).toEqual(myEntry);
    });
});
