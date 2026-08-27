import { defineEventHandler } from 'h3';
import { requireAuth } from '../../utils/auth';
import { CharacterService } from '../../services/character.service';
import { getCharacterResponseSchema } from '../../../shared/schemas/api/character.schema';
import { toH3Error } from '../../utils/errorHandler';
import { logRequest } from '../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const characterService = new CharacterService();
        const character = await characterService.getCharacterWithStats(authUser.uid);

        logRequest({
            severity: 'INFO',
            message: 'Character info retrieved',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: character,
        };

        return getCharacterResponseSchema.parse(response);
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to get character info',
            method: event.method,
            path: event.path,
            status: error.statusCode || 500,
            durationMs: Date.now() - startTime,
            requestId,
            error,
        });

        throw toH3Error(error);
    }
});
