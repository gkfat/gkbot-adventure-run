import {
    defineEventHandler, readBody,
} from 'h3';
import { requireAuth } from '../../utils/auth';
import { CharacterService } from '../../services/character.service';
import {
    createCharacterRequestSchema, createCharacterResponseSchema,
} from '../../../shared/schemas/api/character.schema';
import { toH3Error } from '../../utils/errorHandler';
import { ValidationError } from '../../../shared/types/errors';
import { logRequest } from '../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const body = await readBody(event);
        const parseResult = createCharacterRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid character creation request', parseResult.error.flatten());
        }

        const characterService = new CharacterService();
        const character = await characterService.createCharacterFromArchetype(
            authUser.uid,
            parseResult.data.archetypeId,
        );

        logRequest({
            severity: 'INFO',
            message: 'Character created',
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

        return createCharacterResponseSchema.parse(response);
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to create character',
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
