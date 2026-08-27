import { defineEventHandler } from 'h3';
import { requireAuth } from '../../utils/auth';
import { CharacterService } from '../../services/character.service';
import { getRosterResponseSchema } from '../../../shared/schemas/api/character.schema';
import { toH3Error } from '../../utils/errorHandler';
import { logRequest } from '../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const characterService = new CharacterService();
        const roster = await characterService.getRoster(authUser.uid);

        logRequest({
            severity: 'INFO',
            message: 'Character roster retrieved',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: roster,
        };

        return getRosterResponseSchema.parse(response);
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to get character roster',
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
