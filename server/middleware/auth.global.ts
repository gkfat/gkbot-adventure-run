/**
 * 1. 驗證 Firebase ID Token
 * 2. 把 user 掛到 event.context.auth
 * 3. 未授權自動回 401
 */
export default defineEventHandler(async (event) => {
    try {
        const user = await verifyAuthToken(event);
        event.context.auth = user;
    } catch (error: any) {
        if (error instanceof AuthError) {
            throw createError({
                statusCode: 401, statusMessage: error.message, 
            });
        }
        throw error;
    }
});
