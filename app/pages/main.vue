<template>
    <div class="fill-height">
        <!-- 讀取角色列表 -->
        <div
            v-if="rosterLoading && !rosterLoaded"
            class="d-flex flex-column align-center justify-center fill-height"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="56"
                :width="5"
                class="mb-4"
            />
            <div class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary)); opacity: 0.8;">
                載入角色列表中
            </div>
        </div>

        <!-- 取得角色列表失敗 -->
        <div
            v-else-if="rosterError"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ rosterError }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none flex-grow-0"
                prepend-icon="mdi-refresh"
                @click="fetchRoster"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 已選定角色：進入遊戲畫面 -->
        <GameCharacterStage v-else-if="selectedCharacterId" />

        <!-- 選擇職業建立新角色（roster 為空或玩家主動點新建） -->
        <GameArchetypeGallery
            v-else-if="roster.length === 0 || showGallery"
            @cancel="showGallery = false"
        />

        <!-- 角色列表 -->
        <GameCharacterRoster v-else @create="showGallery = true" />
    </div>
</template>

<script setup lang="ts">
// 保護此頁面，需要登入
definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

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

const {
    roster, rosterLoading, rosterLoaded, rosterError, selectedCharacterId, fetchRoster,
} = useCharacter();

const showGallery = ref(false);

onMounted(() => {
    if (!rosterLoaded.value) {
        fetchRoster();
    }
});
</script>
