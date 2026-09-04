import {
    defineEventHandler, getRouterParam,
} from 'h3';
import { requireAuth } from '../../../utils/auth';
import { CharacterService } from '../../../services/character.service';
import { getBestiaryResponseSchema } from '../../../../shared/schemas/api/bestiary.schema';
import { toH3Error } from '../../../utils/errorHandler';
import {
    AppError, ValidationError,
} from '../../../../shared/types/errors';
import { logRequest } from '../../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const characterId = getRouterParam(event, 'characterId');
        if (!characterId) {
            throw new ValidationError('characterId is required');
        }

        const characterService = new CharacterService();
        const archetypes = await characterService.getBestiary(authUser.uid, characterId);

        logRequest({
            severity: 'INFO',
            message: 'Bestiary retrieved',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: { archetypes },
        };

        return getBestiaryResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to get bestiary',
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
