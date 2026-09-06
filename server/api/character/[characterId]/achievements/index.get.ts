import {
    defineEventHandler, getRouterParam,
} from 'h3';
import { requireAuth } from '../../../../utils/auth';
import { AchievementService } from '../../../../services/achievement.service';
import { CharacterRepository } from '../../../../repositories/character.repository';
import { getAchievementsResponseSchema } from '../../../../../shared/schemas/api/quest.schema';
import { toH3Error } from '../../../../utils/errorHandler';
import {
    AppError, NotFoundError, ValidationError,
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

        const characterRepo = new CharacterRepository();
        const character = await characterRepo.getByIdForAccount(characterId, authUser.uid);
        if (!character) {
            throw new NotFoundError('character');
        }

        const achievementService = new AchievementService();
        const achievements = await achievementService.getAll(characterId);

        logRequest({
            severity: 'INFO',
            message: 'Achievements retrieved',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: { achievements },
        };

        return getAchievementsResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to get achievements',
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
