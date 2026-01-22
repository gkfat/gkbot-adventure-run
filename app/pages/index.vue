<template>
    <v-container class="fill-height">
        <v-row no-gutters class="fill-height justify-center align-center">
            <v-col cols="auto" class="text-center">
                <v-progress-circular
                    indeterminate
                    color="primary"
                    :size="70"
                    :width="7"
                    class="mb-5"
                />
                <p class="text-h6">
                    遊戲載入中...
                </p>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
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

const { isAuthenticated, initialized, initAuthListener } = useAuth();

// 初始化 auth listener
onMounted(() => {
    initAuthListener();
});

// 監聽 auth 初始化完成後進行導航
watch([initialized, isAuthenticated], ([isInit, isAuth]) => {
    if (isInit || isAuth) {
        if (isAuthenticated.value) {
            navigateTo('/main', { replace: true });
        } else {
            navigateTo('/login', { replace: true });
        }
    }
}, { immediate: true });
</script>
