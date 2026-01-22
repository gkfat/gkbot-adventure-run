import {
    type Auth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User, 
} from 'firebase/auth';

interface AuthState {
    user: User | null;
    idToken: string | null;
    loading: boolean;
    error: string | null;
    initialized: boolean;
}

interface LoginResponse {
    success: boolean;
    data?: {
        accountId: string;
        email: string;
        isNewAccount: boolean;
    };
}

const authState = ref<AuthState>({
    user: null,
    idToken: null,
    loading: true,
    error: null,
    initialized: false,
});

let unsubscribe: (() => void) | null = null;

/**
 * Firebase Authentication Composable
 * 管理 client-side auth state 並與 server-side API 整合
 */
export const useAuth = () => {
    const { $firebaseAuth } = useNuxtApp();
    const router = useRouter();

    /**
     * 初始化 Auth State Listener
     */
    const initAuthListener = () => {
        if (!$firebaseAuth) {
            console.error('[useAuth] Firebase Auth not initialized');
            authState.value.loading = false;
            authState.value.initialized = true;
            return;
        }

        if (unsubscribe) {
            // 已經初始化過
            return;
        }

        unsubscribe = onAuthStateChanged(
            $firebaseAuth as Auth,
            async (user) => {
                authState.value.user = user;
                authState.value.loading = false;
                authState.value.initialized = true;

                if (user) {
                    try {
                        // 取得 ID token
                        const token = await user.getIdToken();
                        authState.value.idToken = token;
                    } catch (error) {
                        console.error('[useAuth] Failed to get ID token:', error);
                        authState.value.error = '無法取得認證憑證';
                    }
                } else {
                    authState.value.idToken = null;
                }
            },
            (error) => {
                console.error('[useAuth] Auth state change error:', error);
                authState.value.error = '認證狀態檢查失敗';
                authState.value.loading = false;
                authState.value.initialized = true;
            },
        );
    };

    /**
     * Google 登入
     */
    const signInWithGoogle = async (): Promise<boolean> => {
        if (!$firebaseAuth) {
            authState.value.error = 'Firebase 未正確初始化';
            return false;
        }

        authState.value.loading = true;
        authState.value.error = null;

        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await signInWithPopup($firebaseAuth as Auth, provider);
            const user = result.user;

            // 取得 ID token
            const idToken = await user.getIdToken();

            // 呼叫 server API 完成登入流程
            const response = await $fetch<LoginResponse>('/api/auth/login', {
                method: 'POST',
                body: { idToken },
            });

            if (response.success) {
                console.log('[useAuth] Login successful:', response.data);
                authState.value.idToken = idToken;
                return true;
            } else {
                throw new Error('Server login failed');
            }
        } catch (error: any) {
            console.error('[useAuth] Google sign in failed:', error);
            
            // 處理常見錯誤
            if (error.code === 'auth/popup-closed-by-user') {
                authState.value.error = '登入視窗已關閉';
            } else if (error.code === 'auth/popup-blocked') {
                authState.value.error = '瀏覽器阻擋了彈出視窗，請允許彈出視窗後重試';
            } else if (error.code === 'auth/cancelled-popup-request') {
                authState.value.error = '登入請求已取消';
            } else {
                authState.value.error = error.message || '登入失敗，請稍後再試';
            }
            
            return false;
        } finally {
            authState.value.loading = false;
        }
    };

    /**
     * 登出
     */
    const signOut = async (): Promise<void> => {
        if (!$firebaseAuth) {
            return;
        }

        authState.value.loading = true;
        authState.value.error = null;

        try {
            await firebaseSignOut($firebaseAuth as Auth);
            authState.value.user = null;
            authState.value.idToken = null;
            
            // 重定向到首頁
            await router.push('/');
        } catch (error: any) {
            console.error('[useAuth] Sign out failed:', error);
            authState.value.error = '登出失敗';
        } finally {
            authState.value.loading = false;
        }
    };

    /**
     * 取得新的 ID Token (用於 token refresh)
     */
    const refreshToken = async (): Promise<string | null> => {
        if (!authState.value.user) {
            return null;
        }

        try {
            const token = await authState.value.user.getIdToken(true); // force refresh
            authState.value.idToken = token;
            return token;
        } catch (error) {
            console.error('[useAuth] Token refresh failed:', error);
            return null;
        }
    };

    /**
     * 清除錯誤訊息
     */
    const clearError = () => {
        authState.value.error = null;
    };

    // 在組件 mount 時初始化 listener
    onMounted(() => {
        initAuthListener();
    });

    // 在組件 unmount 時清理
    onUnmounted(() => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    });

    return {
        // State
        user: computed(() => authState.value.user),
        idToken: computed(() => authState.value.idToken),
        loading: computed(() => authState.value.loading),
        error: computed(() => authState.value.error),
        initialized: computed(() => authState.value.initialized),
        isAuthenticated: computed(() => !!authState.value.user && !!authState.value.idToken),

        // Methods
        signInWithGoogle,
        signOut,
        refreshToken,
        clearError,
        initAuthListener,
    };
};
