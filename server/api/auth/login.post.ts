import {
    defineEventHandler, readBody, 
} from 'h3';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../../utils/firebaseAdmin';
import { AccountService } from '../../services/account.service';
import {
    loginRequestSchema, loginResponseSchema, 
} from '../../../shared/schemas/api/auth.schema';
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
        } catch {
            throw new AuthError('Invalid authentication token');
        }

        // Validate required fields
        if (!decodedToken.uid || !decodedToken.email) {
            throw new AuthError('Invalid token payload');
        }

        // Create or get account and character
        const accountService = new AccountService();
        const {
            account, character, isNewAccount, 
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

        // Prepare and validate response
        const response = {
            success: true as const,
            data: {
                accountId: account.accountId,
                email: account.email,
                characterId: character.characterId,
                level: character.level,
                isNewAccount,
            },
        };

        // Validate response schema (development safety)
        const validatedResponse = loginResponseSchema.parse(response);

        return validatedResponse;
    } catch (error: unknown) {
        const statusCode = error && typeof error === 'object' && 'statusCode' in error 
            ? (error as { statusCode: number }).statusCode 
            : 500;
            
        logRequest({
            severity: 'ERROR',
            message: 'Login failed',
            method: event.method,
            path: event.path,
            status: statusCode,
            durationMs: Date.now() - startTime,
            requestId,
            error,
        });

        throw toH3Error(error);
    }
});
