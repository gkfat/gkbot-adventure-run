import {
    defineEventHandler, getRouterParam, readBody,
} from 'h3';
import { requireAuth } from '../../../../utils/auth';
import { CharacterSkillService } from '../../../../services/character-skill.service';
import {
    unlockSkillRequestSchema, unlockSkillResponseSchema,
} from '../../../../../shared/schemas/api/character-skill.schema';
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
        const parseResult = unlockSkillRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid skill unlock request', parseResult.error.flatten());
        }

        const characterSkillService = new CharacterSkillService();
        const character = await characterSkillService.unlockSkill(authUser.uid, characterId, parseResult.data.skillId);

        logRequest({
            severity: 'INFO',
            message: 'Skill unlocked',
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
                skillFragments: character.skillFragments,
                unlockedSkills: character.unlockedSkills,
            },
        };

        return unlockSkillResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to unlock skill',
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
