import {
    defineEventHandler, getRouterParam, readBody,
} from 'h3';
import { requireAuth } from '../../../../utils/auth';
import { ShopService } from '../../../../services/shop.service';
import {
    purchaseItemRequestSchema, purchaseItemResponseSchema,
} from '../../../../../shared/schemas/api/shop.schema';
import { toH3Error } from '../../../../utils/errorHandler';
import {
    AppError, ValidationError,
} from '../../../../../shared/types/errors';
import type { EquipmentSlot } from '../../../../../shared/types/common';
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
        const parseResult = purchaseItemRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', parseResult.error.flatten());
        }

        const shopService = new ShopService();
        const result = await shopService.purchaseItem(
            authUser.uid,
            characterId,
            parseResult.data.shopType,
            parseResult.data.slotId,
            parseResult.data.destination,
            parseResult.data.replaceSlot as EquipmentSlot | undefined,
        );

        logRequest({
            severity: 'INFO',
            message: 'Shop item purchased',
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
                item: result.item,
                goldSpent: result.goldSpent,
                gemsSpent: result.gemsSpent,
            },
        };

        return purchaseItemResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to purchase shop item',
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
