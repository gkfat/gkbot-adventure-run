<template>
    <GameCommonDialogFrame
        :model-value="modelValue"
        fullscreen
        content-class="achievements-dialog d-flex flex-column"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <div class="font-pixel text-h6 mb-3" style="color: rgb(var(--v-theme-primary)); opacity: 0.85;">
            成就
        </div>

        <div
            v-if="loading && !loaded"
            class="d-flex flex-column align-center justify-center flex-grow-1"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="48"
                :width="4"
            />
        </div>

        <div
            v-else-if="error"
            class="d-flex flex-column align-center justify-center flex-grow-1 px-6 text-center"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ error }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none flex-grow-0"
                prepend-icon="mdi-refresh"
                @click="fetchAchievements"
            >
                重試
            </SystemBtn>
        </div>

        <div
            v-else-if="achievements.length === 0"
            class="d-flex flex-column align-center justify-center flex-grow-1 text-medium-emphasis text-body-2"
        >
            目前沒有成就
        </div>

        <template v-else>
            <!-- 上半部：目前選取成就的詳情，比照 bestiaryDialog.vue 的版面 -->
            <div class="achievements-dialog__preview d-flex align-center flex-grow-0">
                <img
                    :src="selected?.completed ? BADGE_LIT : BADGE_LOCKED"
                    :alt="selected?.name"
                    class="achievements-dialog__preview-badge"
                    :class="{ 'achievements-dialog__preview-badge--claimable': selected?.completed && !selected?.claimed }"
                >
                <div class="ml-3 flex-grow-1">
                    <div class="d-flex align-center justify-space-between">
                        <span class="text-subtitle-1 font-weight-medium">{{ selected?.name }}</span>
                        <span class="text-caption text-medium-emphasis">
                            {{ selected ? Math.min(selected.currentCount, selected.targetCount) : 0 }}/{{ selected?.targetCount }}
                        </span>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-2">
                        {{ selected?.description }}
                    </p>

                    <v-progress-linear
                        v-if="selected"
                        :model-value="Math.min(100, (selected.currentCount / selected.targetCount) * 100)"
                        color="green"
                        bg-color="rgba(196, 203, 219, 0.15)"
                        height="6"
                        rounded
                        class="mb-2"
                    />

                    <div class="d-flex align-center justify-space-between">
                        <span class="d-flex align-center ga-1">
                            <GameCommonCurrencyIcon
                                type="GEMS"
                                :size="12"
                            />
                            <span class="font-pixel text-caption">{{ selected?.rewardGems }}</span>
                        </span>

                        <SystemBtn
                            size="small"
                            color="primary"
                            class="text-none"
                            :disabled="!selected?.completed || selected?.claimed || claimLoading"
                            @click="selected && handleClaim(selected.achievementId)"
                        >
                            {{ selected?.claimed ? '已領取' : '領取' }}
                        </SystemBtn>
                    </div>
                </div>
            </div>

            <!-- 下半部：可捲動的徽章格狀清單，一列 3 個 -->
            <div class="achievements-dialog__grid-scroll flex-grow-1">
                <v-row dense>
                    <v-col
                        v-for="achievement in achievements"
                        :key="achievement.achievementId"
                        cols="4"
                    >
                        <button
                            type="button"
                            class="achievements-dialog__cell d-flex flex-column align-center justify-center"
                            :class="{ 'achievements-dialog__cell--active': achievement.achievementId === selectedId }"
                            @click="selectedId = achievement.achievementId"
                        >
                            <span
                                v-if="achievement.completed && !achievement.claimed"
                                class="achievements-dialog__cell-dot-badge"
                                aria-hidden="true"
                            />

                            <img
                                :src="achievement.completed ? BADGE_LIT : BADGE_LOCKED"
                                :alt="achievement.name"
                                class="achievements-dialog__cell-badge"
                                :class="{ 'achievements-dialog__cell-badge--claimable': achievement.completed && !achievement.claimed }"
                            >

                            <span class="achievements-dialog__cell-name text-caption text-center">
                                {{ achievement.name }}
                            </span>
                        </button>
                    </v-col>
                </v-row>
            </div>
        </template>

        <SystemBtn
            block
            variant="outlined"
            color="primary"
            class="text-none mt-3 flex-grow-0"
            @click="emit('update:modelValue', false)"
        >
            關閉
        </SystemBtn>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
const BADGE_LIT = '/images/pixel-icons/achievementBadgeLit.png';
const BADGE_LOCKED = '/images/pixel-icons/achievementBadgeLocked.png';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const {
    achievements, loading, loaded, error, claimLoading, fetchAchievements, claim,
} = useAchievements();

const selectedId = ref<string | null>(null);
const selected = computed(() => achievements.value.find(a => a.achievementId === selectedId.value)
    ?? achievements.value[0]
    ?? null);

watch(() => props.modelValue, async (open) => {
    if (!open) return;
    await fetchAchievements();
    if (!achievements.value.some(a => a.achievementId === selectedId.value)) {
        selectedId.value = achievements.value[0]?.achievementId ?? null;
    }
});

const handleClaim = async (achievementId: string) => {
    await claim(achievementId);
};
</script>

<style scoped lang="scss">
// content-class 的說明見 bestiaryDialog.vue 同樣的註解。
.achievements-dialog {
    &__preview {
        padding: 12px;
        background: #14171c;
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        margin-bottom: 12px;
    }

    &__preview-badge {
        width: 64px;
        height: 64px;
        flex: 0 0 auto;
        image-rendering: pixelated;

        &--claimable {
            animation: achievement-badge-glow 1.8s ease-in-out infinite;
        }
    }

    &__grid-scroll {
        overflow-y: auto;
        min-height: 0;
    }

    &__cell {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        gap: 4px;
        padding: 8px 4px;
        background: #14171c;
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        cursor: pointer;
        transition: border-color 0.08s ease-out;

        &--active {
            border-color: rgb(var(--v-theme-primary));
        }
    }

    &__cell-dot-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgb(var(--v-theme-error));
        border: 1.5px solid #14171c;
    }

    &__cell-badge {
        width: 40px;
        height: 40px;
        image-rendering: pixelated;

        &--claimable {
            animation: achievement-badge-glow 1.8s ease-in-out infinite;
        }
    }

    &__cell-name {
        line-height: 1.2;
        color: rgb(var(--v-theme-primary));
        opacity: 0.85;
    }
}

@keyframes achievement-badge-glow {
    0%, 100% {
        filter: drop-shadow(0 0 2px rgba(129, 178, 154, 0.6));
    }
    50% {
        filter: drop-shadow(0 0 6px rgba(129, 178, 154, 0.95));
    }
}
</style>

<style lang="scss">
.achievements-dialog {
    height: 100%;
    min-height: 0;
}
</style>
