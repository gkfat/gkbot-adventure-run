/**
 * No-op stub implementations of the interfaces `combat-engine`,
 * `events-and-blessings`, `leaderboard`, and `quests-and-achievements` are
 * expected to provide. `AdventureRunService` depends on the interfaces
 * only — swap these out once the real implementations ship (see
 * design.md's "介面 + stub" decisions).
 */

import type {
    LeaderboardUpdater, ProgressTracker,
} from '../../shared/types/adventure';

export class NoopLeaderboardUpdater implements LeaderboardUpdater {
    async updateIfBetter(): Promise<void> {
        // leaderboard change not implemented yet — intentionally does nothing
    }
}

export class NoopProgressTracker implements ProgressTracker {
    async incrementProgress(): Promise<void> {
        // quests-and-achievements change not implemented yet — intentionally does nothing
    }
}
