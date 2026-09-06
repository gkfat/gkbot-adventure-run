<template>
    <div class="fill-height quests-page pa-3 d-flex flex-column">
        <!-- Tab 切換：每日任務／常駐任務 -->
        <div class="quests-page__tabs d-flex ga-2 mb-3 flex-grow-0">
            <button
                type="button"
                class="quests-page__tab pixel-press font-pixel"
                :class="{ 'quests-page__tab--active': tab === 'daily' }"
                @click="tab = 'daily'"
            >
                每日任務
            </button>
            <button
                type="button"
                class="quests-page__tab pixel-press font-pixel"
                :class="{ 'quests-page__tab--active': tab === 'persistent' }"
                @click="tab = 'persistent'"
            >
                常駐任務
            </button>
        </div>

        <!-- 讀取中 -->
        <div
            v-if="loading && !loaded"
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
                載入任務中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="error"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
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
                @click="fetchActive"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 任務清單 -->
        <div
            v-else
            class="quests-page__scroll flex-grow-1"
        >
            <div
                v-if="activeQuests.length === 0"
                class="d-flex flex-column align-center justify-center fill-height text-medium-emphasis text-body-2"
            >
                目前沒有任務
            </div>

            <div
                v-for="quest in activeQuests"
                :key="quest.questId"
                class="quest-row mb-1 px-3 py-2 d-flex align-center ga-2"
                :class="{ 'quest-row--claimed': quest.claimed }"
                :title="quest.name"
            >
                <div class="quest-row__main flex-grow-1">
                    <span class="text-body-2 quest-row__name">{{ quest.description }}</span>
                    <div class="d-flex align-center ga-2 mt-1">
                        <v-progress-linear
                            :model-value="progressPercent(quest)"
                            :color="quest.completed ? 'green' : 'primary'"
                            bg-color="rgba(196, 203, 219, 0.15)"
                            height="5"
                            rounded
                            class="quest-row__progress"
                        />
                        <span class="text-caption text-medium-emphasis quest-row__count flex-shrink-0">
                            {{ Math.min(quest.currentCount, quest.targetCount) }}/{{ quest.targetCount }}
                        </span>
                    </div>
                </div>

                <span
                    v-if="quest.rewardGems > 0"
                    class="quest-row__chip d-flex align-center ga-1 flex-shrink-0"
                >
                    <GameCommonCurrencyIcon
                        type="GEMS"
                        :size="11"
                    />
                    <span class="font-pixel text-caption">{{ quest.rewardGems }}</span>
                </span>
                <span
                    v-if="quest.rewardGold > 0"
                    class="quest-row__chip d-flex align-center ga-1 flex-shrink-0"
                >
                    <GameCommonCurrencyIcon
                        type="GOLD"
                        :size="11"
                    />
                    <span class="font-pixel text-caption">{{ quest.rewardGold }}</span>
                </span>

                <!-- 領取狀態以圖示表達，不用文字：鎖頭＝未達成、發光下載匣＝可領取、勾勾＝已領取 -->
                <button
                    type="button"
                    class="quest-row__status d-flex align-center justify-center flex-shrink-0"
                    :class="statusClass(quest)"
                    :disabled="!quest.completed || quest.claimed || claimLoading"
                    :aria-label="statusLabel(quest)"
                    @click="handleClaim(quest)"
                >
                    <v-icon
                        :icon="statusIcon(quest)"
                        size="20"
                    />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { QuestProgress } from '../composables/useQuests';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '任務',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 任務頁面' }],
});

const {
    dailyQuests, persistentQuests, loading, loaded, error, claimLoading, fetchDaily, fetchPersistent, claim,
} = useQuests();

const tab = ref<'daily' | 'persistent'>('daily');

// 未領取（含未達成／可領取）排在前面，已領取的沉到最下方
const activeQuests = computed(() => {
    const quests = tab.value === 'daily' ? dailyQuests.value : persistentQuests.value;
    return [...quests].sort((a, b) => Number(a.claimed) - Number(b.claimed));
});

const progressPercent = (quest: QuestProgress) => Math.min(100, (quest.currentCount / quest.targetCount) * 100);

const statusIcon = (quest: QuestProgress) => {
    if (quest.claimed) return 'mdi-check-circle';
    if (quest.completed) return 'mdi-tray-arrow-down';
    return 'mdi-lock-outline';
};

const statusClass = (quest: QuestProgress) => {
    if (quest.claimed) return 'quest-row__status--claimed';
    if (quest.completed) return 'quest-row__status--claimable';
    return 'quest-row__status--locked';
};

const statusLabel = (quest: QuestProgress) => {
    if (quest.claimed) return '已領取';
    if (quest.completed) return '領取獎勵';
    return '尚未達成';
};

const fetchActive = () => (tab.value === 'daily' ? fetchDaily() : fetchPersistent());

onMounted(() => {
    fetchDaily();
    fetchPersistent();
});

const handleClaim = async (quest: QuestProgress) => {
    if (!quest.completed || quest.claimed) return;
    await claim(quest.questId, tab.value);
};
</script>

<style scoped lang="scss">
// 可領取狀態的強調色，跟成就徽章的指示燈同一色系（achievementsDialog.vue 用 #e0c063）
$claim-color: #e0c063;

.quests-page {
    width: 100%;
    overflow: hidden;

    &__tabs {
        gap: 8px;
    }

    &__tab {
        flex: 1 1 0;
        padding: 8px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        color: rgb(var(--v-theme-primary));
        opacity: 0.5;
        cursor: pointer;
        transition: opacity 0.08s ease-out;

        &--active {
            opacity: 1;
            border-color: rgb(var(--v-theme-green));
            color: rgb(var(--v-theme-green));
        }
    }

    &__scroll {
        overflow-y: auto;
        min-height: 0;
    }
}

.quest-row {
    position: relative;
    background: #14171c;
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;

    // 已領取：整列蓋上一層半透明遮罩，視覺上退到背景
    &--claimed::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(20, 23, 28, 0.55);
        border-radius: inherit;
        pointer-events: none;
    }

    &__main {
        min-width: 0;
    }

    &__name {
        display: block;
        white-space: normal;
        word-break: break-word;
    }

    &__progress {
        flex: 1 1 auto;
        min-width: 32px;
    }

    &__count {
        white-space: nowrap;
    }

    &__chip {
        padding: 3px 6px;
        background: rgba(196, 203, 219, 0.06);
        border: 1px solid rgba(196, 203, 219, 0.18);
        border-radius: 3px;
    }

    &__status {
        width: 32px;
        height: 32px;
        border-radius: 3px;
        border: 1px solid transparent;
        background: transparent;
        color: rgb(var(--v-theme-primary));
        cursor: default;

        &--locked {
            opacity: 0.35;
        }

        &--claimable {
            opacity: 1;
            color: $claim-color;
            border-color: rgba(224, 192, 99, 0.5);
            cursor: pointer;
            animation: quest-status-glow 1.6s ease-in-out infinite;

            &:hover {
                background: rgba(224, 192, 99, 0.12);
            }
        }

        &--claimed {
            opacity: 0.7;
            color: rgb(var(--v-theme-green));
        }
    }
}

@keyframes quest-status-glow {
    0%, 100% {
        filter: drop-shadow(0 0 1px rgba(224, 192, 99, 0.5));
    }
    50% {
        filter: drop-shadow(0 0 5px rgba(224, 192, 99, 0.9));
    }
}
</style>
