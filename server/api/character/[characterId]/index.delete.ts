import {
    defineEventHandler, getRouterParam,
} from 'h3';
import { requireAuth } from '../../../utils/auth';
import { CharacterService } from '../../../services/character.service';
import { deleteCharacterResponseSchema } from '../../../../shared/schemas/api/character.schema';
import { toH3Error } from '../../../utils/errorHandler';
import { ValidationError } from '../../../../shared/types/errors';
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
        await characterService.deleteCharacter(authUser.uid, characterId);

        logRequest({
            severity: 'INFO',
            message: 'Character deleted',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: { message: 'Character deleted' },
        };

        return deleteCharacterResponseSchema.parse(response);
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to delete character',
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
