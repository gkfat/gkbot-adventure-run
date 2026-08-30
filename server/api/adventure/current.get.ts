import {
    defineEventHandler, getQuery,
} from 'h3';
import { requireAuth } from '../../utils/auth';
import {
    AdventureRunService, stripSeed,
} from '../../services/adventure-run.service';
import {
    getCurrentAdventureQuerySchema, getCurrentAdventureResponseSchema,
} from '../../../shared/schemas/api/adventure.schema';
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

        const parseResult = getCurrentAdventureQuerySchema.safeParse(getQuery(event));
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', parseResult.error.flatten());
        }

        const adventureRunService = new AdventureRunService();
        const { run, settlement } = await adventureRunService.getCurrentRun(authUser.uid, parseResult.data.characterId);

        logRequest({
            severity: 'INFO',
            message: 'Fetched current adventure run',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: run ? stripSeed(run) : null,
            settlement,
        };

        return getCurrentAdventureResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to fetch current adventure run',
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
