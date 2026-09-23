<template>
    <v-container class="fill-height">
        <v-row no-gutters class="fill-height justify-center align-center">
            <v-col
                cols="10"
                sm="8"
                class="text-center"
            >
                <p class="text-h6 mb-6">
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
                <p class="text-caption text-medium-emphasis mt-2">
                    {{ loadedCount }} / {{ totalCount }}
                </p>
            </v-col>
        </v-row>
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

// 素材全部下載完成才進入主畫面，避免遊戲內第一次觸發音效/圖片時卡頓
onMounted(async () => {
    await preloadAssets();
    navigateTo('/main', { replace: true });
});
</script>
