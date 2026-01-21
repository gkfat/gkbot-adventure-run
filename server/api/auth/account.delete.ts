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

        // Delete account cascade
        const accountService = new AccountService();
        await accountService.deleteAccountCascade(authUser.uid);

        logRequest({
            severity: 'INFO',
            message: 'Account deleted',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: authUser.uid,
            requestId,
        });

        return {
            success: true,
            data: { message: 'Account and all associated data deleted successfully' },
        };
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Failed to delete account',
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
