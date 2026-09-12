import {
    defineEventHandler, getRouterParam,
} from 'h3';
import { requireAuth } from '../../../../../utils/auth';
import { ShopService } from '../../../../../services/shop.service';
import { CharacterRepository } from '../../../../../repositories/character.repository';
import { getDailySupplyResponseSchema } from '../../../../../../shared/schemas/api/shop.schema';
import { toH3Error } from '../../../../../utils/errorHandler';
import {
    AppError, NotFoundError, ValidationError,
} from '../../../../../../shared/types/errors';
import { logRequest } from '../../../../../utils/logger';

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

        const shopService = new ShopService();
        const supply = await shopService.getOrGenerateDailySupply(characterId);

        logRequest({
            severity: 'INFO',
            message: 'Daily supply retrieved',
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
                date: supply.date,
                rewardGold: supply.rewardGold,
                item: supply.item,
                claimed: supply.claimed,
            },
        };

        return getDailySupplyResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to get daily supply',
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
