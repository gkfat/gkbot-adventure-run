<template>
    <v-container class="fill-height" @click="handleReadyClick">
        <v-card
            class="py-8 mx-auto"
            color="transparent"
            variant="flat"
            rounded="xl"
            max-width="500"
            width="100%"
        >
            <!-- Logo / Icon，與 login.vue 一致，維持登入 → 載入 → 開始遊戲的視覺連貫 -->
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

            <template v-if="!ready">
                <p class="text-h6 text-center mb-6">
                    正在載入遊戲資源...
                </p>
                <v-progress-linear
                    :model-value="progress"
                    color="primary"
                    height="22"
                    rounded
                    striped
                >
                    <template #default>
                        <span class="text-caption font-weight-bold">{{ progress }}%</span>
                    </template>
                </v-progress-linear>
                <p class="text-caption text-medium-emphasis text-center mt-2">
                    {{ loadedCount }} / {{ totalCount }}
                </p>
            </template>
            <p v-else class="text-h6 text-center">
                請點擊任一處開始遊戲
            </p>
        </v-card>
    </v-container>
</template>

<script setup lang="ts">
// 保護此頁面，需要登入
definePageMeta({
    middleware: ['auth'],
});

useHead({
    title: '載入中',
});

const {
    progress, loadedCount, totalCount, preloadAssets,
} = useAssetPreloader();

// 素材全部下載完成才顯示「請點擊任一處開始遊戲」，等使用者點擊（觸發
// useAudio 內的 unlockAudioPlayback 首次手勢解鎖）後才進入主畫面，避免
// iOS Safari 因為沒有使用者手勢而擋下遊戲內的 BGM/音效播放。
const ready = ref(false);

onMounted(async () => {
    await preloadAssets();
    ready.value = true;
});

function handleReadyClick(): void {
    if (!ready.value) return;
    navigateTo('/main', { replace: true });
}
</script>
