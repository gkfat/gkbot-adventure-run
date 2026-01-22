/**
 * Auth Middleware
 * 保護需要登入的頁面
 * 
 * 使用方式：在 page 中加入 definePageMeta({ middleware: ['auth'] })
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip on server side (SSR is disabled but just in case)
    if (import.meta.server) {
        return;
    }

    const {
        isAuthenticated, initialized, loading, 
    } = useAuth();

    // 等待 auth state 初始化
    // 使用 watchEffect 等待初始化完成
    if (!initialized.value) {
        await new Promise<void>((resolve) => {
            const stopWatch = watch(
                () => initialized.value,
                (isInit) => {
                    if (isInit) {
                        stopWatch();
                        resolve();
                    }
                },
                { immediate: true },
            );

            // 防止無限等待（timeout 5 秒）
            setTimeout(() => {
                stopWatch();
                resolve();
            }, 5000);
        });
    }

    // 如果未登入，重定向到登入頁
    if (!isAuthenticated.value) {
        console.log('[auth middleware] Not authenticated, redirecting to /login');
        return navigateTo('/login', { replace: true });
    }

    // 已登入，允許訪問
});
