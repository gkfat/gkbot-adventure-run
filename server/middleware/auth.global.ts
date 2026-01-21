/**
 * Global Authentication Middleware
 * 
 * Behavior:
 * 1. Public paths: Skip authentication entirely
 * 2. Optional auth paths: Try to authenticate, but don't fail if no token
 * 3. All other paths: Require authentication (default)
 * 
 * The auth token is verified and stored in event.context.auth if present.
 */
export default defineEventHandler(async (event) => {
    // Skip authentication for non-API routes (pages, assets, etc.)
    if (!event.path.startsWith('/api')) {
        return;
    }

    // Public paths - no authentication required or attempted
    const publicPaths = [
        '/api/health/ping',
        '/api/auth/login',
        '/api/openapi.json',
        '/api-docs',
    ];
    
    if (publicPaths.includes(event.path)) {
        return;
    }

    // Optional auth paths - try to authenticate but don't fail if no token
    // Add paths here if needed (e.g., public leaderboards)
    const optionalAuthPaths: string[] = [];

    const isOptionalAuth = optionalAuthPaths.some(path => 
        event.path.startsWith(path),
    );

    if (isOptionalAuth) {
        // Try to authenticate, but don't throw if it fails
        try {
            const user = await verifyAuthToken(event);
            event.context.auth = user;
        } catch {
            // Silent fail for optional auth
            event.context.auth = null;
        }
        return;
    }

    // Required auth (default for all other paths)
    try {
        const user = await verifyAuthToken(event);
        event.context.auth = user;
    } catch (error: any) {
        if (error instanceof AuthError) {
            throw createError({
                statusCode: 401,
                statusMessage: error.message,
            });
        }
        throw error;
    }
});
