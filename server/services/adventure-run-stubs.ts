/**
 * No-op stub implementations of the interfaces `combat-engine`,
 * `events-and-blessings`, and `quests-and-achievements` are expected to
 * provide. `AdventureRunService` depends on the interfaces only — swap
 * these out once the real implementations ship (see design.md's "介面 +
 * stub" decisions). `NoopLeaderboardUpdater` was the `leaderboard`
 * interface's stub — removed once `leaderboard-season` swapped in the real
 * `LeaderboardRunUpdater` (server/services/leaderboard-run-updater.ts).
 */

import type { ProgressTracker } from '../../shared/types/adventure';

export class NoopProgressTracker implements ProgressTracker {
    async incrementProgress(): Promise<void> {
        // quests-and-achievements change not implemented yet — intentionally does nothing
    }
}
