import {
    defineEventHandler, readBody,
} from 'h3';
import { requireAuth } from '../../utils/auth';
import { AccountService } from '../../services/account.service';
import {
    updateAccountSettingsRequestSchema, updateAccountSettingsResponseSchema,
} from '../../../shared/schemas/api/account.schema';
import { toH3Error } from '../../utils/errorHandler';
import {
    AppError, ValidationError,
} from '../../../shared/types/errors';
import { logRequest } from '../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        const authUser = await requireAuth(event);

        const body = await readBody(event);
        const parseResult = updateAccountSettingsRequestSchema.safeParse(body);
        if (!parseResult.success) {
            throw new ValidationError('Invalid request', parseResult.error.flatten());
        }

        const accountService = new AccountService();
        const account = await accountService.updateAudioSettings(authUser.uid, parseResult.data);

        logRequest({
            severity: 'INFO',
            message: 'Account audio settings updated',
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
                bgmEnabled: account.bgmEnabled,
                sfxEnabled: account.sfxEnabled,
            },
        };

        return updateAccountSettingsResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to update account audio settings',
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
