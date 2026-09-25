/**
 * Real `LeaderboardUpdater` implementation — wraps `LeaderboardService` so
 * `AdventureRunService` (which depends only on the interface, per
 * adventure-run-core's "介面 + stub" design) can update the leaderboard at
 * run settlement without depending on the leaderboard module directly.
 * Replaces `NoopLeaderboardUpdater` (server/services/adventure-run-stubs.ts).
 */

import type { LeaderboardUpdater } from '../../shared/types/adventure';
import { LeaderboardService } from './leaderboard.service';

export class LeaderboardRunUpdater implements LeaderboardUpdater {
    private leaderboardService = new LeaderboardService();

    async updateIfBetter(entry: {
        accountId: string;
        characterId: string;
        nickname: string;
        score: number;
        runId: string;
        meta?: { step?: number; killCount?: number };
    }): Promise<void> {
        await this.leaderboardService.updateIfBetter(entry);
    }
}
