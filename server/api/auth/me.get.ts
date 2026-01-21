import { defineEventHandler } from 'h3';
import { requireAuth } from '../../utils/auth';
import { AccountService } from '../../services/account.service';
import { toH3Error } from '../../utils/errorHandler';
import { logRequest } from '../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        // Require authentication
        const authUser = await requireAuth(event);

        // Get account from database
        const accountService = new AccountService();
        const account = await accountService.getAccount(authUser.uid);

        logRequest({
            severity: 'INFO',
            message: 'Account info retrieved',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        return {
            success: true,
            data: {
                accountId: account.accountId,
                email: account.email,
                createdAt: account.createdAt,
            },
        };
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to get account info',
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
