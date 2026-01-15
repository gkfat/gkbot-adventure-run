/**
 * 1. 驗證 Firebase ID Token
 * 2. 把 user 掛到 event.context.auth
 * 3. 未授權自動回 401
 * 4. 部分路由可跳過認證（如 health check）
 */
export default defineEventHandler(async (event) => {
    // 不需要認證的路由
    const publicPaths = ['/api/health/ping'];
    
    if (publicPaths.includes(event.path)) {
        return;
    }

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
