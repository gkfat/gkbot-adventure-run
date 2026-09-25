import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { LeaderboardRunUpdater } from './leaderboard-run-updater';

const { addRunScoreMock } = vi.hoisted(() => ({ addRunScoreMock: vi.fn() }));

vi.mock('./leaderboard.service', () => ({
    LeaderboardService: class {
        addRunScore = addRunScoreMock;
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('LeaderboardRunUpdater (leaderboard-season)', () => {
    it('implements LeaderboardUpdater by delegating straight to LeaderboardService.addRunScore', async () => {
        const updater = new LeaderboardRunUpdater();
        const entry = {
            accountId: 'account-1',
            characterId: 'char-1',
            nickname: '玩家A',
            score: 7,
            runId: 'run-1',
            meta: { killCount: 7 },
        };

        await updater.addRunScore(entry);

        expect(addRunScoreMock).toHaveBeenCalledWith(entry);
    });
});
