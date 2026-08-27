import {
    defineEventHandler, getRouterParam, readBody,
} from 'h3';
import { requireAuth } from '../../../utils/auth';
import { CharacterService } from '../../../services/character.service';
import {
    setNicknameRequestSchema, setNicknameResponseSchema,
} from '../../../../shared/schemas/api/character.schema';
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

        const body = await readBody(event);
        const parseResult = setNicknameRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid nickname', parseResult.error.flatten());
        }

        const characterService = new CharacterService();
        const character = await characterService.setNickname(authUser.uid, characterId, parseResult.data.nickname);

        logRequest({
            severity: 'INFO',
            message: 'Nickname updated',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: { nickname: character.nickname },
        };

        return setNicknameResponseSchema.parse(response);
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to update nickname',
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
