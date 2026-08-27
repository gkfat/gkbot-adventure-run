import {
    defineEventHandler, readBody,
} from 'h3';
import { requireAuth } from '../../utils/auth';
import { CharacterService } from '../../services/character.service';
import {
    allocateAttributesRequestSchema, allocateAttributesResponseSchema,
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
        const parseResult = allocateAttributesRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid attribute allocation request', parseResult.error.flatten());
        }

        const characterService = new CharacterService();
        const character = await characterService.allocateAttributes(authUser.uid, parseResult.data);

        logRequest({
            severity: 'INFO',
            message: 'Attributes allocated',
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
                attributes: character.attributes,
                unspentAttributePoints: character.unspentAttributePoints,
            },
        };

        return allocateAttributesResponseSchema.parse(response);
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to allocate attributes',
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
