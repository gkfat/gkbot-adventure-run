<template>
    <v-navigation-drawer
        :model-value="modelValue"
        location="right"
        temporary
        width="280"
        color="background"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <div class="account-drawer d-flex flex-column fill-height">
            <!-- 帳號資訊 -->
            <div class="pa-5 text-center">
                <v-avatar
                    size="64"
                    color="dark"
                    class="mb-3"
                >
                    <v-img
                        v-if="user?.photoURL"
                        :src="user.photoURL"
                        :alt="user.displayName || 'User'"
                    />
                    <v-icon
                        v-else
                        icon="mdi-account"
                        size="32"
                    />
                </v-avatar>

                <div class="text-subtitle-1 font-weight-medium">
                    {{ user?.displayName || '未知使用者' }}
                </div>
                <div class="text-caption text-medium-emphasis mb-2">
                    {{ user?.email }}
                </div>
            </div>

            <v-divider />

            <v-row
                v-if="character"
                dense
                class="pa-4 ma-0 flex-grow-0"
            >
                <v-col cols="4">
                    <SystemBtn
                        block
                        stacked
                        size="small"
                        color="primary"
                        variant="flat"
                        class="text-none account-drawer__square-btn"
                        @click="handleSwitchCharacter"
                    >
                        <v-icon class="mb-2">mdi-account-switch-outline</v-icon>
                        切換角色
                    </SystemBtn>
                </v-col>
                <v-col cols="4">
                    <SystemBtn
                        block
                        stacked
                        size="small"
                        color="primary"
                        variant="flat"
                        class="text-none account-drawer__square-btn"
                        @click="bestiaryOpen = true"
                    >
                        <v-icon class="mb-2">mdi-book-open-page-variant-outline</v-icon>
                        圖鑑
                    </SystemBtn>
                </v-col>
                <v-col cols="4">
                    <SystemBtn
                        block
                        stacked
                        size="small"
                        color="primary"
                        variant="flat"
                        class="text-none account-drawer__square-btn"
                        @click="achievementsOpen = true"
                    >
                        <span class="account-drawer__icon-wrap d-inline-flex">
                            <v-icon class="mb-2">mdi-trophy-outline</v-icon>
                            <span
                                v-if="hasClaimableAchievements"
                                class="account-drawer__dot-badge"
                                aria-hidden="true"
                            />
                        </span>
                        成就
                    </SystemBtn>
                </v-col>
                <v-col cols="4">
                    <SystemBtn
                        block
                        stacked
                        size="small"
                        color="primary"
                        variant="flat"
                        class="text-none account-drawer__square-btn"
                        @click="audioSettingsOpen = true"
                    >
                        <v-icon class="mb-2">mdi-volume-high</v-icon>
                        音效設定
                    </SystemBtn>
                </v-col>
            </v-row>

            <v-spacer />

            <!-- 登出 -->
            <div class="pa-4">
                <SystemBtn
                    block
                    color="warning"
                    variant="outlined"
                    class="text-none"
                    prepend-icon="mdi-logout"
                    :loading="loading"
                    @click="handleSignOut"
                >
                    登出
                </SystemBtn>
            </div>
        </div>

        <GameCommonBestiaryDialog v-model="bestiaryOpen" />
        <GameCommonAchievementsDialog v-model="achievementsOpen" />
        <GameCommonAudioSettingsDialog v-model="audioSettingsOpen" />
    </v-navigation-drawer>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const bestiaryOpen = ref(false);
const achievementsOpen = ref(false);
const audioSettingsOpen = ref(false);

const { user, signOut, loading } = useAuth();
const { character, clearSelection, reset: resetCharacter } = useCharacter();
const { reset: resetInventory } = useInventory();
const { reset: resetQuests } = useQuests();
const { hasClaimable: hasClaimableAchievements, fetchAchievements, reset: resetAchievements } = useAchievements();
const { reset: resetAudio } = useAudio();

// 抽屜開啟時預先抓取成就進度，讓「成就」按鈕能即時顯示可領取紅點
watch(() => props.modelValue, (open) => {
    if (open) fetchAchievements();
});

const handleSignOut = async () => {
    await signOut();
    resetCharacter();
    resetInventory();
    resetQuests();
    resetAchievements();
    resetAudio();
};

const handleSwitchCharacter = () => {
    clearSelection();
    emit('update:modelValue', false);
    // 角色選擇畫面只存在於 /main；若是在其他頁面（例如背包）切換角色，需先導回去
    navigateTo('/main');
};
</script>

<style scoped lang="scss">
// 正方形 pixel 風格按鈕：icon 在第一列置中，文字在第二列置中（v-btn 的 stacked
// 版面本身就是 icon 在上、文字在下，這裡只需固定成正方形並讓兩列都水平置中）。
.account-drawer__square-btn {
    width: 100%;
    aspect-ratio: 1;
    height: auto;
    min-width: 0;
    padding: 0 !important;

    :deep(.v-btn__content) {
        font-size: 13px;
        white-space: nowrap;
    }
}

.account-drawer__icon-wrap {
    position: relative;
}

// 可領取成就的紅點提示，比照 bottomNav.vue 的 __badge 定位方式
.account-drawer__dot-badge {
    position: absolute;
    top: -2px;
    right: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(var(--v-theme-error));
    border: 1.5px solid rgb(var(--v-theme-background));
}
</style>
