import {
    defineEventHandler, getHeader,
} from 'h3';
import { LeaderboardSeasonSettlementService } from '../../services/leaderboard-season-settlement.service';
import { toH3Error } from '../../utils/errorHandler';
import {
    AppError, AuthError,
} from '../../../shared/types/errors';
import { logRequest } from '../../utils/logger';

/**
 * Vercel Cron target — settles the leaderboard season that just ended and
 * mails tiered rewards (see leaderboard-season/design.md). This path is
 * listed in auth.global.ts's publicPaths (it skips Firebase auth) and
 * instead verifies the `CRON_SECRET` bearer token itself. An unset
 * CRON_SECRET rejects every request rather than defaulting open.
 */
export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const cronSecret = useRuntimeConfig(event).cronSecret;
        const authHeader = getHeader(event, 'authorization');

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            throw new AuthError('Missing or invalid CRON_SECRET');
        }

        const settlementService = new LeaderboardSeasonSettlementService();
        const result = await settlementService.settlePreviousSeason();

        logRequest({
            severity: 'INFO',
            message: 'Leaderboard season settlement cron ran',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            requestId,
        });

        return {
            success: true, data: result,
        };
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Leaderboard season settlement cron failed',
            method: event.method,
            path: event.path,
            status: error instanceof AppError ? error.statusCode : 500,
            durationMs: Date.now() - startTime,
            requestId,
            error,
        });

        throw toH3Error(error);
    }
});
