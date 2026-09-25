import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { LeaderboardRunUpdater } from './leaderboard-run-updater';

const { updateIfBetterMock } = vi.hoisted(() => ({ updateIfBetterMock: vi.fn() }));

vi.mock('./leaderboard.service', () => ({
    LeaderboardService: class {
        updateIfBetter = updateIfBetterMock;
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('LeaderboardRunUpdater (leaderboard-season)', () => {
    it('implements LeaderboardUpdater by delegating straight to LeaderboardService.updateIfBetter', async () => {
        const updater = new LeaderboardRunUpdater();
        const entry = {
            accountId: 'account-1',
            characterId: 'char-1',
            nickname: '玩家A',
            score: 7,
            runId: 'run-1',
            meta: { killCount: 7 },
        };

        await updater.updateIfBetter(entry);

        expect(updateIfBetterMock).toHaveBeenCalledWith(entry);
    });
});
