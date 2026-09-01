import { SystemBtn } from '../../.nuxt/components';
<template>
    <v-container class="fill-height">
        <v-card
            class="py-8"
            color="transparent"
            variant="flat"
            rounded="xl"
            max-width="500"
            width="100%"
        >
            <!-- Logo / Icon -->
            <div class="text-center">
                <img
                    src="/images/favicon-bot-pixel.png"
                    alt="GkBot"
                    class="login-gkbot"
                    width="140"
                    height="163"
                >
            </div>

            <!-- Title -->
            <v-card-title class="font-pixel login-title text-center text-wrap">
                GkBot<br>
                Adventure<br>
                Run
            </v-card-title>

            <!-- Description -->
            <v-card-subtitle class="text-center text-body-1 mb-8 text-wrap">
                在機械智能叛變的末世，<br>你能生存多久？
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
        </v-card>
    </v-container>
</template>

<script setup lang="ts">
const { signInWithGoogle, loading, error, clearError, isAuthenticated, initialized, initAuthListener } = useAuth();

// 設定 SEO
useHead({
    title: '歡迎',
    meta: [
        {
            name: 'description',
            content: '公元 5487 年，GkBot 一夜倒戈。廢棄設施深處，還有東西在等你。',
        },
    ],
});

// 初始化 auth listener
onMounted(() => {
    initAuthListener();
});

// 監聽登入狀態變化，自動跳轉
watch(
    [isAuthenticated, initialized],
    ([auth, init]) => {
        if (init && auth && !loading.value) {
            console.log('[login.vue] Auth detected, navigating to /main');
            navigateTo('/main', { replace: true });
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
        // onAuthStateChanged 會觸發，watch 會處理導航
        console.log('[login.vue] Login successful, waiting for auth state update');
    }
};
</script>

<style scoped lang="scss">
.login-gkbot {
    image-rendering: pixelated;
    filter: drop-shadow(0 0 14px rgba(201, 162, 75, 0.25)) drop-shadow(0 6px 0 rgba(0, 0, 0, 0.4));
}

// 末世感美術字：鏽蝕鎖黃 + 暗紅/青偏移的故障陰影，疊在既有 8-bit 字體上
.login-title {
    color: #c9a24b;
    letter-spacing: 1px;
    line-height: 1.6;
    text-shadow:
        2px 2px 0 rgba(0, 0, 0, 0.6),
        -2px 0 0 rgba(140, 30, 30, 0.45),
        2px 0 0 rgba(60, 120, 130, 0.35);
}
</style>
