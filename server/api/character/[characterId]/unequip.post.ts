import {
    defineEventHandler, getRouterParam, readBody,
} from 'h3';
import { requireAuth } from '../../../utils/auth';
import { EquipmentService } from '../../../services/equipment.service';
import {
    unequipItemRequestSchema, unequipItemResponseSchema,
} from '../../../../shared/schemas/api/inventory.schema';
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
        const parseResult = unequipItemRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', parseResult.error.flatten());
        }

        const equipmentService = new EquipmentService();
        const unequipped = await equipmentService.unequipItem(authUser.uid, characterId, parseResult.data.slot);

        logRequest({
            severity: 'INFO',
            message: 'Item unequipped',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: { unequipped },
        };

        return unequipItemResponseSchema.parse(response);
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to unequip item',
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
