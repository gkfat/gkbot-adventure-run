import {
    defineEventHandler, getRouterParam,
} from 'h3';
import { requireAuth } from '../../../../../../utils/auth';
import { QuestService } from '../../../../../../services/quest.service';
import { claimPersistentQuestResponseSchema } from '../../../../../../../shared/schemas/api/quest.schema';
import { toH3Error } from '../../../../../../utils/errorHandler';
import {
    AppError, ValidationError,
} from '../../../../../../../shared/types/errors';
import { logRequest } from '../../../../../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const characterId = getRouterParam(event, 'characterId');
        if (!characterId) {
            throw new ValidationError('characterId is required');
        }

        const questId = getRouterParam(event, 'questId');
        if (!questId) {
            throw new ValidationError('questId is required');
        }

        const questService = new QuestService();
        const {
            goldEarned, gemsEarned, 
        } = await questService.claimPersistent(authUser.uid, characterId, questId);

        logRequest({
            severity: 'INFO',
            message: 'Persistent quest claimed',
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
                goldEarned, gemsEarned, 
            },
        };

        return claimPersistentQuestResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to claim persistent quest',
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
