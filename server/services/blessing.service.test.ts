import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import { BlessingService } from './blessing.service';
import { BLESSING_TEMPLATES } from '../constants/blessings';

const { rngNextMock } = vi.hoisted(() => ({ rngNextMock: vi.fn() }));

vi.mock('./rng.service', () => ({
    RngService: vi.fn().mockImplementation(function RngServiceMock() {
        return { next: rngNextMock };
    }),
}));

let rollQueue: number[];
beforeEach(() => {
    rollQueue = [];
    rngNextMock.mockImplementation(async () => (rollQueue.length > 0 ? rollQueue.shift() as number : 0.99));
});

describe('BlessingService.generateCandidates', () => {
    it('returns 3 distinct candidates with no `tier` field leaking into the RunModifier', async () => {
        const service = new BlessingService();
        const candidates = await service.generateCandidates('run-1', 0);

        expect(candidates).toHaveLength(3);
        expect(new Set(candidates.map(c => c.modifierId)).size).toBe(3);
        for (const candidate of candidates) {
            expect(candidate).not.toHaveProperty('tier');
        }
    });

    it('falls back to the other tier instead of looping forever when the preferred tier is exhausted', async () => {
        // roll >= majorChance picks MINOR; there are only 2 MINOR templates,
        // and the default mock always returns 0.99 (>= majorChance) — so a
        // naive implementation would try to draw a 3rd MINOR forever once
        // both are chosen. generateCandidates must fall back to MAJOR instead
        // of hanging (this exact case previously caused an OOM crash).
        const service = new BlessingService();
        const candidates = await service.generateCandidates('run-1', 0);

        const minorIds = new Set(
            BLESSING_TEMPLATES.filter(t => t.tier === 'MINOR').map(t => t.modifierId),
        );
        const majorPicks = candidates.filter(c => !minorIds.has(c.modifierId));
        expect(majorPicks.length).toBeGreaterThan(0);
    });
});
