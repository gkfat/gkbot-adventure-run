<template>
    <div class="fill-height leaderboard-page pa-3 d-flex flex-column">
        <div class="d-flex align-center justify-space-between mb-3 flex-grow-0">
            <span
                class="font-pixel text-subtitle-2"
                style="color: rgb(var(--v-theme-primary));"
            >
                排行榜
            </span>
            <span class="text-caption text-medium-emphasis">
                本季結算倒數 <span class="font-pixel">{{ countdownText }}</span>
            </span>
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
                載入排行榜中
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
                @click="fetchLeaderboard()"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 榜單 -->
        <div
            v-else
            class="leaderboard-page__scroll flex-grow-1"
        >
            <div
                v-if="entries.length === 0"
                class="d-flex flex-column align-center justify-center fill-height text-medium-emphasis text-body-2"
            >
                本賽季目前還沒有人上榜
            </div>

            <div
                v-for="(entry, index) in entries"
                :key="entry.characterId"
                class="leaderboard-row mb-1 px-3 py-2 d-flex align-center ga-2"
                :class="{ 'leaderboard-row--mine': isMine(entry) }"
            >
                <span class="leaderboard-row__rank flex-shrink-0">
                    <span
                        v-if="trophyIcon(index + 1)"
                        class="leaderboard-row__trophy"
                        :class="trophyClass(index + 1)"
                    >
                        <GameCommonPixelIcon
                            :name="trophyIcon(index + 1)!"
                            :size="20"
                        />
                    </span>
                    <span v-else class="font-pixel">{{ index + 1 }}</span>
                </span>
                <span class="leaderboard-row__nickname flex-grow-1 text-body-2">{{ entry.nickname }}</span>
                <span class="leaderboard-row__score font-pixel flex-shrink-0">{{ entry.score }}</span>
            </div>
        </div>

        <!-- 自己的名次不在榜單顯示範圍內時，額外釘在下方 -->
        <div
            v-if="myEntry && myRank && !myEntryVisible"
            class="leaderboard-row leaderboard-row--mine leaderboard-row--pinned mt-2 px-3 py-2 d-flex align-center ga-2 flex-grow-0"
        >
            <span class="leaderboard-row__rank flex-shrink-0">
                <span
                    v-if="trophyIcon(myRank)"
                    class="leaderboard-row__trophy"
                    :class="trophyClass(myRank)"
                >
                    <GameCommonPixelIcon
                        :name="trophyIcon(myRank)!"
                        :size="20"
                    />
                </span>
                <span v-else class="font-pixel">{{ myRank }}</span>
            </span>
            <span class="leaderboard-row__nickname flex-grow-1 text-body-2">{{ myEntry.nickname }}</span>
            <span class="leaderboard-row__score font-pixel flex-shrink-0">{{ myEntry.score }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { LeaderboardEntryView } from '../composables/useLeaderboard';
import type { PixelIconName } from '../utils/pixelIcons';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '排行榜',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 排行榜頁面' }],
});

const {
    entries, myRank, myEntry, loading, loaded, error, countdownText, fetchLeaderboard, startCountdown, stopCountdown,
} = useLeaderboard();

const isMine = (entry: LeaderboardEntryView) => !!myEntry.value && entry.characterId === myEntry.value.characterId;
const myEntryVisible = computed(() => !!myEntry.value && entries.value.some(isMine));

const TROPHY_ICON_BY_RANK: Record<number, PixelIconName> = {
    1: 'trophyGold',
    2: 'trophySilver',
    3: 'trophyBronze',
};
const TROPHY_CLASS_BY_RANK: Record<number, string> = {
    1: 'leaderboard-row__trophy--gold',
    2: 'leaderboard-row__trophy--silver',
    3: 'leaderboard-row__trophy--bronze',
};
const trophyIcon = (rank: number | null | undefined): PixelIconName | null =>
    (rank && TROPHY_ICON_BY_RANK[rank]) || null;
const trophyClass = (rank: number | null | undefined): string | undefined =>
    rank ? TROPHY_CLASS_BY_RANK[rank] : undefined;

onMounted(() => {
    fetchLeaderboard();
    startCountdown();
});

onUnmounted(stopCountdown);
</script>

<style scoped lang="scss">
.leaderboard-page {
    width: 100%;
    overflow: hidden;

    &__scroll {
        overflow-y: auto;
        min-height: 0;
    }
}

.leaderboard-row {
    background: #14171c;
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;

    &--mine {
        border-color: rgb(var(--v-theme-green));
        // 不透明色，等同 #14171c 疊加 10% green 算出的等效色——半透明疊在
        // （沒有不透明底色的）頁面背景上會透出裝飾圖案，看起來像沒有底色
        // （known-issue.md #4，同 talents.vue --maxed 的修法）。
        background: #1f2729;
    }

    &--pinned {
        border-style: dashed;
    }

    &__rank {
        width: 28px;
        text-align: center;
        color: rgb(var(--v-theme-primary));
        opacity: 0.8;
        display: flex;
        justify-content: center;
    }

    &__trophy {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 50%;

        &--gold {
            background: radial-gradient(circle, rgba(224, 168, 62, 0.4) 0%, rgba(224, 168, 62, 0.22) 100%);
            box-shadow: 0 0 6px rgba(224, 168, 62, 0.45);
        }

        &--silver {
            background: radial-gradient(circle, rgba(195, 200, 207, 0.36) 0%, rgba(195, 200, 207, 0.18) 100%);
            box-shadow: 0 0 6px rgba(195, 200, 207, 0.35);
        }

        &--bronze {
            background: radial-gradient(circle, rgba(185, 122, 74, 0.38) 0%, rgba(185, 122, 74, 0.2) 100%);
            box-shadow: 0 0 6px rgba(185, 122, 74, 0.4);
        }
    }

    &__nickname {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__score {
        color: rgb(var(--v-theme-green));
    }
}
</style>
