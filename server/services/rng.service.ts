/**
 * Deterministic RNG service — the single source of randomness for an
 * adventure run. `random(seed, index)` is a pure function (same seed+index
 * always returns the same value); `RngService.next(runId)` is the stateful
 * wrapper every caller (node generation, combat, events) must go through so
 * `rngIndex` stays strictly monotonic and is persisted immediately after
 * each consumption (RULE-014).
 */

import { AdventureRunRepository } from '../repositories/adventure-run.repository';

/**
 * FNV-1a hash of `${seed}:${index}` into a 32-bit unsigned int, used to seed
 * a single mulberry32 step. Deterministic and has no external dependencies.
 */
function hashSeedIndex(seed: string, index: number): number {
    const input = `${seed}:${index}`;
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/**
 * Deterministic pseudo-random value in [0, 1) for a given seed + rngIndex.
 * Pure function — no I/O, safe to call as many times as needed for the same
 * inputs and always get the same result.
 */
export function random(seed: string, index: number): number {
    let a = hashSeedIndex(seed, index);
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * An in-memory, synchronous cursor over the same `random(seed, index)`
 * sequence `RngService.next()` uses — for a caller (CombatService) that rolls
 * many times per request and would otherwise pay one Firestore round-trip per
 * roll. The caller is responsible for persisting `index` as the run's new
 * `rngIndex` once, after it is done rolling (RngService itself does no I/O
 * here — see createCursor()).
 */
export type RngCursor = {
  next(): number;
  readonly index: number;
};

export class RngService {
    private runRepo: AdventureRunRepository;

    constructor() {
        this.runRepo = new AdventureRunRepository();
    }

    /**
     * Consume the next RNG value for a run: reads the run's seed + rngIndex,
     * computes `random(seed, rngIndex)`, and persists `rngIndex + 1` — all
     * inside a single Firestore transaction (see AdventureRunRepository.consumeRng).
     */
    async next(runId: string): Promise<number> {
        return this.runRepo.consumeRng(runId);
    }

    /**
     * Consume the next value from the run's *reward* RNG stream — seeded by
     * `runId` (unique per attempt) instead of the run's `seed` (fixed per
     * character+chapter+level), so combat loot and event/blessing content
     * vary across retries of the same Stage while node/enemy generation
     * (which goes through `next()`/`seed`) keeps reproducing identically.
     * See AdventureRunRepository.consumeRewardRng.
     */
    async nextReward(runId: string): Promise<number> {
        return this.runRepo.consumeRewardRng(runId);
    }

    /**
     * Start a cursor at `startIndex` (the caller's already-loaded `run.rngIndex`)
     * that computes further values purely in-memory. No two callers may share
     * a run's rngIndex range concurrently — same "one request at a time"
     * precondition as `next()`/`consumeRng` (see AdventureRunRepository.consumeRng).
     */
    createCursor(seed: string, startIndex: number): RngCursor {
        let index = startIndex;
        return {
            next: (): number => {
                const value = random(seed, index);
                index += 1;
                return value;
            },
            get index() {
                return index;
            },
        };
    }
}
