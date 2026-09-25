import {
    defineEventHandler, getQuery,
} from 'h3';
import { requireAuth } from '../../utils/auth';
import { LeaderboardService } from '../../services/leaderboard.service';
import {
    getLeaderboardRequestSchema, getLeaderboardResponseSchema,
} from '../../../shared/schemas/api/leaderboard.schema';
import { toH3Error } from '../../utils/errorHandler';
import {
    AppError, ValidationError,
} from '../../../shared/types/errors';
import { logRequest } from '../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const parseResult = getLeaderboardRequestSchema.safeParse(getQuery(event));
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', parseResult.error.flatten());
        }

        const leaderboardService = new LeaderboardService();
        const result = await leaderboardService.getLeaderboard(parseResult.data.limit, parseResult.data.characterId);

        logRequest({
            severity: 'INFO',
            message: 'Fetched leaderboard',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: result,
        };

        return getLeaderboardResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to fetch leaderboard',
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
