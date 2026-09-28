import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { LeaderboardService } from './leaderboard.service';
import type { LeaderboardEntry } from '../../shared/types/leaderboard';

const {
    getTopNMock, countHigherThanMock, getMock, addScoreMock, characterGetByIdMock,
} = vi.hoisted(() => ({
    getTopNMock: vi.fn(),
    countHigherThanMock: vi.fn(),
    getMock: vi.fn(),
    addScoreMock: vi.fn(),
    characterGetByIdMock: vi.fn(),
}));

vi.mock('../repositories/leaderboard.repository', () => ({
    LeaderboardRepository: class {
        getTopN = getTopNMock;
        countHigherThan = countHigherThanMock;
        get = getMock;
        addScore = addScoreMock;
    },
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: class {
        getById = characterGetByIdMock;
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

describe('LeaderboardService.addRunScore (leaderboard)', () => {
    it('builds an entry with a fresh achievedAt + current seasonId and delegates to addScore', async () => {
        addScoreMock.mockImplementation((e: LeaderboardEntry) => e);

        const service = new LeaderboardService();
        const result = await service.addRunScore({
            accountId: 'account-1',
            characterId: 'char-1',
            nickname: '玩家A',
            score: 250,
            runId: 'run-9',
            meta: {
                step: 12, killCount: 30,
            },
        });

        expect(addScoreMock).toHaveBeenCalledWith(expect.objectContaining({
            seasonId: expect.any(String),
            accountId: 'account-1', score: 250, runId: 'run-9', step: 12, killCount: 30,
        }));
        expect(result.score).toBe(250);
    });

    it('omits step/killCount entirely (not as undefined) when meta is not given — Firestore rejects explicit undefined field values', async () => {
        addScoreMock.mockImplementation((e: LeaderboardEntry) => e);

        const service = new LeaderboardService();
        await service.addRunScore({
            accountId: 'account-1',
            characterId: 'char-1',
            nickname: '玩家A',
            score: 4,
            runId: 'run-1',
        });

        const written = addScoreMock.mock.calls[0][0];
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
        // rank 2 falls in the TOP_2_TO_3 reward tier (see server/constants/leaderboardSeason.ts)
        expect(result.myEntry).toEqual({
            ...myEntry, rewardGold: 300, rewardGems: 12,
        });
    });

    it('resolves spriteUrl for the top 3 (podium) entries only, from each entry\'s own characterId', async () => {
        getTopNMock.mockResolvedValue([
            entry({
                characterId: 'char-1', score: 400, 
            }),
            entry({
                characterId: 'char-2', score: 300, 
            }),
            entry({
                characterId: 'char-3', score: 200, 
            }),
            entry({
                characterId: 'char-4', score: 100, 
            }),
        ]);
        countHigherThanMock.mockResolvedValue(4);
        characterGetByIdMock.mockImplementation((characterId: string) => (
            characterId === 'char-2' ? { archetypeId: 'fighter' } : null
        ));

        const service = new LeaderboardService();
        const result = await service.getLeaderboard(50);

        expect(characterGetByIdMock).toHaveBeenCalledTimes(3);
        expect(characterGetByIdMock).not.toHaveBeenCalledWith('char-4');
        expect(result.entries[0].spriteUrl).toBeUndefined();
        expect(result.entries[1].spriteUrl).toBe('/images/archetypes/fighter.png');
        expect(result.entries[2].spriteUrl).toBeUndefined();
        expect(result.entries[3].spriteUrl).toBeUndefined();
    });

    it('resolves spriteUrl on myEntry when the requester ranks within the podium', async () => {
        const myEntry = entry({
            characterId: 'char-2', score: 300,
        });
        getTopNMock.mockResolvedValue([
            entry({
                characterId: 'char-1', score: 400, 
            }), myEntry,
        ]);
        getMock.mockResolvedValue(myEntry);
        countHigherThanMock.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
        characterGetByIdMock.mockResolvedValue({ archetypeId: 'fighter' });

        const service = new LeaderboardService();
        const result = await service.getLeaderboard(50, 'char-2');

        expect(result.myEntry?.spriteUrl).toBe('/images/archetypes/fighter.png');
    });
});
