import {
    defineEventHandler, getRouterParam,
} from 'h3';
import { requireAuth } from '../../../../../utils/auth';
import { MailboxService } from '../../../../../services/mailbox.service';
import { claimMailResponseSchema } from '../../../../../../shared/schemas/api/mailbox.schema';
import { toH3Error } from '../../../../../utils/errorHandler';
import {
    AppError, ValidationError,
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

        const mailId = getRouterParam(event, 'mailId');
        if (!mailId) {
            throw new ValidationError('mailId is required');
        }

        const mailboxService = new MailboxService();
        const result = await mailboxService.claim(authUser.uid, characterId, mailId);

        logRequest({
            severity: 'INFO',
            message: 'Mail claimed',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        const response = {
            success: true,
            data: result,
        };

        return claimMailResponseSchema.parse(response);
    } catch (error: unknown) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to claim mail',
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
