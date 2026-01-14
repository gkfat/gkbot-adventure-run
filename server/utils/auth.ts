import type { H3Event } from 'h3';
import { getHeader } from 'h3';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../utils/firebaseAdmin';
import { AuthError } from '../../shared/types/errors';
import type { AuthTokenPayload } from '../../shared/types';

/**
 * 驗證 Firebase ID Token
 */
export async function verifyAuthToken(event: H3Event): Promise<AuthTokenPayload> {
    const authHeader = getHeader(event, 'authorization');
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthError('Missing or invalid authorization header');
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const app = getFirebaseAdminApp();
        const auth = getAuth(app);
        const decodedToken = await auth.verifyIdToken(idToken);

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            email_verified: decodedToken.email_verified,
        };
    } catch (error: any) {
        throw new AuthError(`Invalid authentication token: ${error.message}`);
    }
}

/**
 * Require authentication for a route
 * Usage: const user = await requireAuth(event);
 */
export async function requireAuth(event: H3Event): Promise<AuthTokenPayload> {
    // Check if already authenticated (cached in event context)
    if (event.context.auth) return event.context.auth;

    const auth = await verifyAuthToken(event);
    event.context.auth = auth; // Cache for subsequent calls
    return auth;
}

/**
 * Get authenticated user (returns null if not authenticated)
 */
export async function getAuthUser(event: H3Event): Promise<AuthTokenPayload | null> {
    try {
        return await requireAuth(event);
    } catch {
        return null;
    }
}
