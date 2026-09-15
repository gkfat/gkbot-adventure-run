import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import { BlessingService } from './blessing.service';
import { BLESSING_TEMPLATES } from '../../shared/constants/blessings';

const { rngNextMock } = vi.hoisted(() => ({ rngNextMock: vi.fn() }));

vi.mock('./rng.service', () => ({
    RngService: vi.fn().mockImplementation(function RngServiceMock() {
        return {
            next: rngNextMock, nextReward: rngNextMock,
        };
    }),
}));

let rollQueue: number[];
beforeEach(() => {
    rollQueue = [];
    rngNextMock.mockImplementation(async () => (rollQueue.length > 0 ? rollQueue.shift() as number : 0.99));
});

describe('BlessingService.generateCandidates', () => {
    it('returns 3 distinct candidates, each at level 1, when nothing is owned', async () => {
        const service = new BlessingService();
        const candidates = await service.generateCandidates('run-1', 0, []);

        expect(candidates).toHaveLength(3);
        expect(new Set(candidates.map(c => c.modifierId)).size).toBe(3);
        for (const candidate of candidates) {
            expect(candidate.level).toBe(1);
        }
    });

    it('excludes families already at Lv3 and offers the next level for partially-owned families', async () => {
        const service = new BlessingService();
        const [maxed, partial] = BLESSING_TEMPLATES;
        const candidates = await service.generateCandidates('run-1', 0, [
            {
                modifierId: maxed!.modifierId, level: 3, 
            }, {
                modifierId: partial!.modifierId, level: 1, 
            },
        ]);

        expect(candidates.some(c => c.modifierId === maxed!.modifierId)).toBe(false);
        const partialCandidate = candidates.find(c => c.modifierId === partial!.modifierId);
        if (partialCandidate) {
            expect(partialCandidate.level).toBe(2);
        }
    });

    it('returns fewer than 3 candidates (not hang) when only a few families remain eligible', async () => {
        const service = new BlessingService();
        const maxedOut = BLESSING_TEMPLATES.slice(0, BLESSING_TEMPLATES.length - 2)
            .map(t => ({
                modifierId: t.modifierId, level: 3,
            }));
        const candidates = await service.generateCandidates('run-1', 0, maxedOut);

        expect(candidates.length).toBe(2);
    });

    it('returns no candidates when every family is already at Lv3', async () => {
        const service = new BlessingService();
        const allMaxed = BLESSING_TEMPLATES.map(t => ({
            modifierId: t.modifierId, level: 3,
        }));
        const candidates = await service.generateCandidates('run-1', 0, allMaxed);

        expect(candidates).toHaveLength(0);
    });

    it('falls back to the remaining pool instead of looping forever when the preferred rarity is exhausted', async () => {
        // The default mock always returns 0.99 (>= any rarity threshold) so
        // every draw prefers COMMON — once all COMMON families are chosen, a
        // naive implementation would try to draw a non-existent 4th COMMON
        // forever. generateCandidates must fall back to the remaining pool.
        const service = new BlessingService();
        const commonCount = BLESSING_TEMPLATES.filter(t => t.rarity === 'COMMON').length;
        const candidates = await service.generateCandidates('run-1', 0, []);

        expect(candidates).toHaveLength(3);
        if (commonCount < 3) {
            const commonIds = new Set(
                BLESSING_TEMPLATES.filter(t => t.rarity === 'COMMON').map(t => t.modifierId),
            );
            expect(candidates.some(c => !commonIds.has(c.modifierId))).toBe(true);
        }
    });
});
