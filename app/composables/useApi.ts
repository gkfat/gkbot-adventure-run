import type { FetchOptions } from 'ofetch';

/**
 * API Client Composable
 * 自動附加 Authorization header 並處理 token refresh
 */
export const useApi = () => {
    const { idToken, refreshToken, isAuthenticated } = useAuth();

    /**
     * 執行認證請求
     * @param url API endpoint
     * @param options fetch options
     */
    const authenticatedFetch = async <T>(
        url: string,
        options: FetchOptions = {},
    ): Promise<T> => {
        // 確保已登入
        if (!isAuthenticated.value) {
            throw new Error('Not authenticated');
        }

        let token = idToken.value;

        // 如果沒有 token，嘗試 refresh
        if (!token) {
            token = await refreshToken();
            if (!token) {
                throw new Error('Failed to get authentication token');
            }
        }

        // 合併 headers
        const headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        };

        try {
            return await $fetch<T>(url, {
                ...options,
                headers,
            });
        } catch (error: any) {
            // 如果是 401 錯誤，嘗試 refresh token 後重試一次
            if (error.statusCode === 401 || error.status === 401) {
                console.log('[useApi] Token expired, refreshing...');
                
                const newToken = await refreshToken();
                if (!newToken) {
                    throw new Error('Authentication expired, please login again');
                }

                // 重試請求
                return await $fetch<T>(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        Authorization: `Bearer ${newToken}`,
                    },
                });
            }

            throw error;
        }
    };

    /**
     * GET 請求
     */
    const get = <T>(url: string, options: FetchOptions = {}): Promise<T> => {
        return authenticatedFetch<T>(url, {
            ...options,
            method: 'GET',
        });
    };

    /**
     * POST 請求
     */
    const post = <T>(url: string, body?: any, options: FetchOptions = {}): Promise<T> => {
        return authenticatedFetch<T>(url, {
            ...options,
            method: 'POST',
            body,
        });
    };

    /**
     * PUT 請求
     */
    const put = <T>(url: string, body?: any, options: FetchOptions = {}): Promise<T> => {
        return authenticatedFetch<T>(url, {
            ...options,
            method: 'PUT',
            body,
        });
    };

    /**
     * DELETE 請求
     */
    const del = <T>(url: string, options: FetchOptions = {}): Promise<T> => {
        return authenticatedFetch<T>(url, {
            ...options,
            method: 'DELETE',
        });
    };

    return {
        authenticatedFetch,
        get,
        post,
        put,
        delete: del,
    };
};
