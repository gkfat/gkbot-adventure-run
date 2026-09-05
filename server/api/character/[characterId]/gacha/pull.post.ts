import {
    defineEventHandler, getRouterParam, readBody,
} from 'h3';
import { requireAuth } from '../../../../utils/auth';
import { GachaService } from '../../../../services/gacha.service';
import {
    gachaPullRequestSchema, gachaPullResponseSchema,
} from '../../../../../shared/schemas/api/gacha.schema';
import { toH3Error } from '../../../../utils/errorHandler';
import {
    AppError, ValidationError,
} from '../../../../../shared/types/errors';
import { logRequest } from '../../../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const characterId = getRouterParam(event, 'characterId');
        if (!characterId) {
            throw new ValidationError('characterId is required');
        }

        const body = await readBody(event);
        const parseResult = gachaPullRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', parseResult.error.flatten());
        }

        const gachaService = new GachaService();
        const result = await gachaService.pull(authUser.uid, characterId, parseResult.data.currency);

        logRequest({
            severity: 'INFO',
            message: 'Gacha pull completed',
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

        return gachaPullResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to complete gacha pull',
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
