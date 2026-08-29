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
}
