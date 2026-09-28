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
                    class="gkbot-logo"
                    width="140"
                    height="163"
                >
            </div>

            <!-- Title -->
            <v-card-title class="font-pixel gkbot-title text-center text-wrap">
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
            console.log('[login.vue] Auth detected, navigating to /loading');
            navigateTo('/loading', { replace: true });
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
