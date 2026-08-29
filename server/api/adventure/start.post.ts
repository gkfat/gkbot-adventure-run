import {
    defineEventHandler, readBody,
} from 'h3';
import { requireAuth } from '../../utils/auth';
import { AdventureRunService } from '../../services/adventure-run.service';
import {
    startAdventureRequestSchema, startAdventureResponseSchema,
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

        const body = await readBody(event);
        const parseResult = startAdventureRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', parseResult.error.flatten());
        }

        const adventureRunService = new AdventureRunService();
        const run = await adventureRunService.startRun(authUser.uid, parseResult.data.characterId);

        logRequest({
            severity: 'INFO',
            message: 'Adventure run started',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: {
                runId: run.runId,
                state: run.state,
            },
        };

        return startAdventureResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to start adventure run',
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
