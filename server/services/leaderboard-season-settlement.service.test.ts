import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { LeaderboardSeasonSettlementService } from './leaderboard-season-settlement.service';
import type { LeaderboardEntry } from '../../shared/types/leaderboard';

const {
    getAllForSeasonMock, sendMock,
} = vi.hoisted(() => ({
    getAllForSeasonMock: vi.fn(),
    sendMock: vi.fn(),
}));

vi.mock('../repositories/leaderboard.repository', () => ({
    LeaderboardRepository: class {
        getAllForSeason = getAllForSeasonMock;
    },
}));

vi.mock('./mailbox.service', () => ({
    MailboxService: class {
        send = sendMock;
    },
}));

function entry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
    return {
        seasonId: '2026-W38',
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

describe('LeaderboardSeasonSettlementService.settlePreviousSeason (leaderboard-season)', () => {
    it('does nothing and sends no mail when the previous season has no entries', async () => {
        getAllForSeasonMock.mockResolvedValue([]);

        const service = new LeaderboardSeasonSettlementService();
        const result = await service.settlePreviousSeason(new Date('2026-09-21T00:00:00.000Z'));

        expect(sendMock).not.toHaveBeenCalled();
        expect(result.mailsSent).toBe(0);
    });

    it('reads the season immediately before `now`, not the current one', async () => {
        getAllForSeasonMock.mockResolvedValue([]);

        const service = new LeaderboardSeasonSettlementService();
        await service.settlePreviousSeason(new Date('2026-09-21T00:00:00.000Z'));

        expect(getAllForSeasonMock).toHaveBeenCalledWith('2026-W38');
    });

    it('mails the Top1 tier reward to rank 1', async () => {
        getAllForSeasonMock.mockResolvedValue([
            entry({
                characterId: 'char-1', score: 999, 
            }),
        ]);

        const service = new LeaderboardSeasonSettlementService();
        await service.settlePreviousSeason(new Date('2026-09-21T00:00:00.000Z'));

        expect(sendMock).toHaveBeenCalledWith(
            'char-1',
            expect.any(String),
            expect.any(String),
            {
                gold: 500, gems: 20, 
            },
        );
    });

    it('mails the correct tier to ranks 2-3, 4-10, and 11+', async () => {
        const entries = Array.from({ length: 12 }, (_, i) => entry({
            characterId: `char-${i + 1}`, score: 1000 - i,
        }));
        getAllForSeasonMock.mockResolvedValue(entries);

        const service = new LeaderboardSeasonSettlementService();
        await service.settlePreviousSeason(new Date('2026-09-21T00:00:00.000Z'));

        expect(sendMock).toHaveBeenCalledTimes(12);
        // rank 1
        expect(sendMock).toHaveBeenNthCalledWith(1, 'char-1', expect.any(String), expect.any(String), {
            gold: 500, gems: 20, 
        });
        // rank 2-3
        expect(sendMock).toHaveBeenNthCalledWith(2, 'char-2', expect.any(String), expect.any(String), {
            gold: 300, gems: 12, 
        });
        expect(sendMock).toHaveBeenNthCalledWith(3, 'char-3', expect.any(String), expect.any(String), {
            gold: 300, gems: 12, 
        });
        // rank 4-10
        expect(sendMock).toHaveBeenNthCalledWith(4, 'char-4', expect.any(String), expect.any(String), {
            gold: 150, gems: 6, 
        });
        expect(sendMock).toHaveBeenNthCalledWith(10, 'char-10', expect.any(String), expect.any(String), {
            gold: 150, gems: 6, 
        });
        // rank 11+
        expect(sendMock).toHaveBeenNthCalledWith(11, 'char-11', expect.any(String), expect.any(String), {
            gold: 50, gems: 2, 
        });
        expect(sendMock).toHaveBeenNthCalledWith(12, 'char-12', expect.any(String), expect.any(String), {
            gold: 50, gems: 2, 
        });
    });
});
