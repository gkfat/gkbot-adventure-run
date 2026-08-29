import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import {
    random, RngService,
} from './rng.service';

describe('random', () => {
    it('returns the same value for the same seed + index', () => {
        expect(random('seed-a', 5)).toBe(random('seed-a', 5));
    });

    it('returns different values for different indices of the same seed', () => {
        const values = new Set(Array.from({ length: 20 }, (_, i) => random('seed-a', i)));
        expect(values.size).toBe(20);
    });

    it('returns different values for different seeds at the same index', () => {
        expect(random('seed-a', 0)).not.toBe(random('seed-b', 0));
    });

    it('always returns a value in [0, 1)', () => {
        for (let i = 0; i < 50; i++) {
            const value = random('seed-a', i);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });
});

const { consumeRngMock } = vi.hoisted(() => ({ consumeRngMock: vi.fn() }));

vi.mock('../repositories/adventure-run.repository', () => ({
    AdventureRunRepository: vi.fn().mockImplementation(function AdventureRunRepositoryMock() {
        return { consumeRng: consumeRngMock };
    }),
}));

describe('RngService.next', () => {
    beforeEach(() => {
        consumeRngMock.mockReset();
    });

    it('delegates to the repository transaction and returns strictly increasing index consumption', async () => {
        consumeRngMock.mockResolvedValueOnce(random('seed-a', 5));
        consumeRngMock.mockResolvedValueOnce(random('seed-a', 6));

        const service = new RngService();
        const first = await service.next('run-1');
        const second = await service.next('run-1');

        expect(first).toBe(random('seed-a', 5));
        expect(second).toBe(random('seed-a', 6));
        expect(consumeRngMock).toHaveBeenCalledTimes(2);
    });
});
