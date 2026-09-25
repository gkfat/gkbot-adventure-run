/**
 * Leaderboard season boundaries — pure functions, no persisted Season
 * entity (see leaderboard-season/design.md). A season is one UTC ISO week
 * (Monday 00:00 UTC to the following Monday 00:00 UTC), same "no timezone
 * conversion" convention as the daily quest reset
 * (`quest.service.ts`'s `new Date().toISOString().slice(0, 10)`).
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Start of the UTC ISO week (Monday 00:00 UTC) containing `date`.
 */
function startOfIsoWeekUtc(date: Date): Date {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0 .. Sunday = 6
    d.setUTCDate(d.getUTCDate() - dayNum);
    return d;
}

/**
 * ISO 8601 week number + week-year for `date` (the week-year can differ
 * from the calendar year for the first/last days of December/January).
 */
function isoWeekParts(date: Date): { isoYear: number; isoWeek: number } {
    const thursday = startOfIsoWeekUtc(date);
    thursday.setUTCDate(thursday.getUTCDate() + 3);

    const firstThursday = startOfIsoWeekUtc(new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4)));
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 3);

    const isoWeek = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / WEEK_MS);
    return {
        isoYear: thursday.getUTCFullYear(), isoWeek,
    };
}

/**
 * Current season id, e.g. `2026-W39`. Pure function of `now`.
 */
export function getCurrentSeasonId(now: Date = new Date()): string {
    const {
        isoYear, isoWeek,
    } = isoWeekParts(now);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

/**
 * Epoch ms when the season containing `now` ends (next Monday 00:00 UTC).
 */
export function getSeasonEndsAt(now: Date = new Date()): number {
    return startOfIsoWeekUtc(now).getTime() + WEEK_MS;
}

/**
 * Season id of the week immediately before the one containing `now` —
 * used by the settlement cron to resolve "the season that just ended".
 */
export function getPreviousSeasonId(now: Date = new Date()): string {
    return getCurrentSeasonId(new Date(now.getTime() - WEEK_MS));
}
