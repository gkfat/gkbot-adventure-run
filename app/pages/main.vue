<template>
    <v-container class="main-page">
        <!-- App Bar -->
        <v-card class="mb-6" elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                    <v-icon
                        icon="mdi-robot"
                        size="32"
                        color="primary"
                        class="mr-3"
                    />
                    <span class="text-h5">GkBot Adventure Run</span>
                </div>
                
                <v-btn
                    color="error"
                    variant="text"
                    prepend-icon="mdi-logout"
                    :loading="loading"
                    @click="handleSignOut"
                >
                    登出
                </v-btn>
            </v-card-title>
        </v-card>

        <!-- User Info Card -->
        <v-card class="mb-6" elevation="2">
            <v-card-title>
                <v-icon icon="mdi-account-circle" class="mr-2" />
                使用者資訊
            </v-card-title>
            <v-card-text>
                <v-list>
                    <v-list-item>
                        <template #prepend>
                            <v-avatar>
                                <v-img
                                    v-if="user?.photoURL"
                                    :src="user.photoURL"
                                    :alt="user.displayName || 'User'"
                                />
                                <v-icon v-else icon="mdi-account" />
                            </v-avatar>
                        </template>
                        <v-list-item-title>{{ user?.displayName || '未知使用者' }}</v-list-item-title>
                        <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>

        <!-- API Test Card -->
        <v-card class="mb-6" elevation="2">
            <v-card-title>
                <v-icon icon="mdi-api" class="mr-2" />
                API 測試
            </v-card-title>
            <v-card-text>
                <v-btn
                    color="primary"
                    :loading="apiLoading"
                    :disabled="apiLoading"
                    prepend-icon="mdi-account-check"
                    @click="testMeApi"
                >
                    測試 /api/auth/me
                </v-btn>

                <!-- API Response -->
                <v-alert
                    v-if="apiResponse"
                    :type="apiError ? 'error' : 'success'"
                    variant="tonal"
                    class="mt-4"
                    closable
                    @click:close="apiResponse = null"
                >
                    <div class="text-subtitle-2 mb-2">API 回應：</div>
                    <pre class="text-caption">{{ apiResponse }}</pre>
                </v-alert>
            </v-card-text>
        </v-card>

        <!-- Game Placeholder -->
        <v-card elevation="2">
            <v-card-title>
                <v-icon icon="mdi-gamepad-variant" class="mr-2" />
                遊戲區域
            </v-card-title>
            <v-card-text class="text-center pa-8">
                <v-icon
                    icon="mdi-hammer-wrench"
                    size="64"
                    color="primary"
                    class="mb-4"
                />
                <div class="text-h6 text-medium-emphasis">
                    遊戲功能開發中...
                </div>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup lang="ts">
// 保護此頁面，需要登入
definePageMeta({
    middleware: ['auth'],
});

const { user, signOut, loading } = useAuth();
const api = useApi();

// 設定 SEO
useHead({
    title: '主頁',
    meta: [
        {
            name: 'description',
            content: 'GkBot Adventure Run 遊戲主頁',
        },
    ],
});

// API 測試相關
const apiLoading = ref(false);
const apiResponse = ref<any>(null);
const apiError = ref(false);

/**
 * 測試 /api/auth/me API
 */
const testMeApi = async () => {
    apiLoading.value = true;
    apiError.value = false;
    apiResponse.value = null;

    try {
        const response = await api.get('/api/auth/me');
        apiResponse.value = response;
        apiError.value = false;
    } catch (error: any) {
        console.error('API test failed:', error);
        apiResponse.value = {
            error: error.message || 'API 請求失敗',
            statusCode: error.statusCode || error.status,
        };
        apiError.value = true;
    } finally {
        apiLoading.value = false;
    }
};

/**
 * 處理登出
 */
const handleSignOut = async () => {
    await signOut();
};
</script>

<style scoped lang="scss">
.main-page {
    max-width: 1200px;
    padding-top: 2rem;
    padding-bottom: 2rem;
}

pre {
    background: rgba(0, 0, 0, 0.2);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
}
</style>