import {
    describe, it, expect, 
} from 'vitest';
import {
    getCurrentSeasonId, getSeasonEndsAt, getPreviousSeasonId,
} from './season';

describe('season utils (leaderboard-season)', () => {
    it('computes the ISO week id for a mid-week UTC date', () => {
        // 2026-09-24 is a Thursday, ISO week 39 of 2026
        expect(getCurrentSeasonId(new Date('2026-09-24T12:00:00.000Z'))).toBe('2026-W39');
    });

    it('treats Monday 00:00:00 UTC as the start of that week (not the previous one)', () => {
        expect(getCurrentSeasonId(new Date('2026-09-21T00:00:00.000Z'))).toBe('2026-W39');
    });

    it('treats the instant just before Monday 00:00 UTC as still the previous week', () => {
        expect(getCurrentSeasonId(new Date('2026-09-20T23:59:59.999Z'))).toBe('2026-W38');
    });

    it('handles a year boundary where the ISO week-year differs from the calendar year', () => {
        // 2025-12-31 is a Wednesday in ISO week 1 of 2026 (week-year rolls over early)
        expect(getCurrentSeasonId(new Date('2025-12-31T12:00:00.000Z'))).toBe('2026-W01');
    });

    it('getSeasonEndsAt returns the next Monday 00:00 UTC', () => {
        const endsAt = getSeasonEndsAt(new Date('2026-09-24T12:00:00.000Z'));
        expect(new Date(endsAt).toISOString()).toBe('2026-09-28T00:00:00.000Z');
    });

    it('getSeasonEndsAt on the exact boundary returns the following Monday (not the same instant)', () => {
        const endsAt = getSeasonEndsAt(new Date('2026-09-21T00:00:00.000Z'));
        expect(new Date(endsAt).toISOString()).toBe('2026-09-28T00:00:00.000Z');
    });

    it('getPreviousSeasonId returns the season exactly one week earlier', () => {
        expect(getPreviousSeasonId(new Date('2026-09-24T12:00:00.000Z'))).toBe('2026-W38');
    });

    it('getPreviousSeasonId near a week boundary still returns the prior week', () => {
        expect(getPreviousSeasonId(new Date('2026-09-21T00:00:00.000Z'))).toBe('2026-W38');
    });
});
