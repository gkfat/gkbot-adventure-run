import {
    defineEventHandler, getRouterParam,
} from 'h3';
import { requireAuth } from '../../../utils/auth';
import { CharacterService } from '../../../services/character.service';
import { QuestService } from '../../../services/quest.service';
import { QuestType } from '../../../../shared/types/quest';
import { getCharacterResponseSchema } from '../../../../shared/schemas/api/character.schema';
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
        const character = await characterService.getCharacterWithStats(authUser.uid, characterId);

        // 每次成功取得角色資料視為一次「登入」，用於「每日登入」任務進度
        // （已完成的任務會被 QuestService.incrementProgress 略過，重複呼叫是安全的）
        const questService = new QuestService();
        await questService.incrementProgress(characterId, QuestType.LOGIN, 1);

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
