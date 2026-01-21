import {
    defineEventHandler, readBody, 
} from 'h3';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../../utils/firebaseAdmin';
import { AccountService } from '../../services/account.service';
import { loginRequestSchema } from '../../../shared/schemas/api/auth.schema';
import { toH3Error } from '../../utils/errorHandler';
import { AuthError } from '../../../shared/types/errors';
import { logRequest } from '../../utils/logger';

export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const requestId = event.context.requestId || crypto.randomUUID();

    try {
        // Parse and validate request body
        const body = await readBody(event);
        const parseResult = loginRequestSchema.safeParse(body);

        if (!parseResult.success) {
            throw new AuthError('Invalid request: idToken is required');
        }

        const { idToken } = parseResult.data;

        // Verify Firebase ID Token
        const auth = getAuth(getFirebaseAdminApp());
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        } catch (error: any) {
            throw new AuthError('Invalid authentication token');
        }

        // Validate required fields
        if (!decodedToken.uid || !decodedToken.email) {
            throw new AuthError('Invalid token payload');
        }

        // Create or get account
        const accountService = new AccountService();
        const {
            account, isNewAccount, 
        } = await accountService.createOrGetAccount(
            decodedToken.uid,
        );

        // Set auth context for subsequent middleware/handlers
        event.context.auth = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            email_verified: decodedToken.email_verified,
        };

        logRequest({
            severity: 'INFO',
            message: isNewAccount ? 'User registered' : 'User logged in',
            method: event.method,
            path: event.path,
            status: 200,
            durationMs: Date.now() - startTime,
            userId: decodedToken.uid,
            requestId,
        });

        return {
            success: true,
            data: {
                accountId: account.accountId,
                email: account.email,
                isNewAccount,
            },
        };
    } catch (error: any) {
        logRequest({
            severity: 'ERROR',
            message: 'Login failed',
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
