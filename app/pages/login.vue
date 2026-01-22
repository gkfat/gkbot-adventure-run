import { SystemBtn } from '../../.nuxt/components';
<template>
    <v-container class="fill-height">
        <v-card
            class="pa-8"
            color="transparent"
            variant="flat"
            rounded="xl"
            max-width="500"
            width="100%"
        >
            <!-- Logo / Icon -->
            <div class="text-center mb-6">
                <v-icon
                    icon="mdi-robot"
                    size="80"
                    color="primary"
                    :style="{
                        filter: 'drop-shadow(0 0 10px rgba(196, 203, 219, 0.5))'
                    }"
                />
            </div>

            <!-- Title -->
            <v-card-title class="text-h4 text-center">
                GkBot Adventure Run
            </v-card-title>

            <!-- Description -->
            <v-card-subtitle class="text-center text-h6 mb-8">
                試著摧毀更多的 GkBot 機器人吧！
            </v-card-subtitle>

            <!-- Error Alert -->
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                closable
                class="mb-4"
                @click:close="clearError"
            >
                {{ error }}
            </v-alert>

            <!-- Login Button -->
            <SystemBtn
                block
                size="x-large"
                color="primary"
                class="text-none"
                :loading="loading"
                :disabled="loading"
                prepend-icon="mdi-google"
                @click="handleGoogleLogin"
            >
                使用 Google 登入
            </SystemBtn>

            <!-- Additional Info -->
            <div class="text-center mt-6 text-caption text-medium-emphasis">
                登入即表示您同意我們的服務條款與隱私權政策
            </div>
        </v-card>
    </v-container>
</template>

<script setup lang="ts">
const { signInWithGoogle, loading, error, clearError, isAuthenticated, initialized } = useAuth();

// 設定 SEO
useHead({
    title: '歡迎',
    meta: [
        {
            name: 'description',
            content: '試著摧毀更多的 GkBot 機器人吧！',
        },
    ],
});

watch(
    [isAuthenticated, initialized],
    ([auth, init]) => {
        if (init && auth) {
            navigateTo('/main')
        }
    },
    { immediate: true },
);

/**
 * 處理 Google 登入
 */
const handleGoogleLogin = async () => {
    const success = await signInWithGoogle();
    
    if (success) {
        navigateTo('/main')
    }
};
</script>
