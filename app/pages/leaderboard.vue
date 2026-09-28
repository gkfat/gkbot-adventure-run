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
            <!--
                前三名：頒獎台。固定顯示 1～3 名的講台圖，該名次還沒有人上榜時只顯示
                空講台。講台圖／暱稱＋獎勵拆成兩個獨立的 v-row：講台圖這排要讓三座
                底部切齊、側邊相連，若和下方文字疊在同一個 flex column 裡，名次沒人
                上榜時少了暱稱／獎勵這段內容，align="end" 對齊的會是「整欄」的底部
                （也就是文字的底部），講台圖本身反而對不齊。
            -->
            <v-row
                no-gutters
                align="end"
                class="leaderboard-page__podium"
            >
                <v-col
                    v-for="slot in podiumSlots"
                    :key="slot.rank"
                    cols="4"
                    :style="{ order: slot.order }"
                >
                    <GameLeaderboardPodiumColumn
                        :entry="slot.entry"
                        :rank="slot.rank"
                    />
                </v-col>
            </v-row>

            <v-row
                no-gutters
                class="mb-3"
            >
                <v-col
                    v-for="slot in podiumSlots"
                    :key="slot.rank"
                    cols="4"
                    class="d-flex flex-column align-center"
                    :style="{ order: slot.order }"
                >
                    <span
                        v-if="slot.entry"
                        class="podium-info__nickname text-caption mt-1"
                    >{{ slot.entry.nickname }}</span>
                </v-col>
            </v-row>

            <div
                v-if="entries.length === 0"
                class="text-center text-medium-emphasis text-body-2 mb-2"
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
                    <span class="font-pixel">{{ index + 1 }}</span>
                </span>
                <span class="leaderboard-row__nickname flex-grow-1 text-body-2">{{ entry.nickname }}</span>
                <span
                    v-if="entry.rewardGems > 0"
                    class="leaderboard-row__reward d-flex align-center ga-1 flex-shrink-0"
                >
                    <GameCommonCurrencyIcon
                        type="GEMS"
                        :size="11"
                    />
                    <span class="font-pixel text-caption">{{ entry.rewardGems }}</span>
                </span>
                <span
                    v-if="entry.rewardGold > 0"
                    class="leaderboard-row__reward d-flex align-center ga-1 flex-shrink-0"
                >
                    <GameCommonCurrencyIcon
                        type="GOLD"
                        :size="11"
                    />
                    <span class="font-pixel text-caption">{{ entry.rewardGold }}</span>
                </span>
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
            <span
                v-if="myEntry.rewardGems > 0"
                class="leaderboard-row__reward d-flex align-center ga-1 flex-shrink-0"
            >
                <GameCommonCurrencyIcon
                    type="GEMS"
                    :size="11"
                />
                <span class="font-pixel text-caption">{{ myEntry.rewardGems }}</span>
            </span>
            <span
                v-if="myEntry.rewardGold > 0"
                class="leaderboard-row__reward d-flex align-center ga-1 flex-shrink-0"
            >
                <GameCommonCurrencyIcon
                    type="GOLD"
                    :size="11"
                />
                <span class="font-pixel text-caption">{{ myEntry.rewardGold }}</span>
            </span>
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

// 講台固定顯示第 1～3 名，不論當下是否有人上榜；下方清單則完整列出所有名次
// （含前三名，從第 1 名開始降冪排序），講台只是額外的視覺強調。視覺順序固定
// 「2-1-3」
// （2 名在左、1 名置中最高、3 名在右），用 CSS order 排列 v-col 這個實際
// 的 flex item（套在巢狀元件內層無效——flex order 只影響直接子層）。
const PODIUM_VISUAL_ORDER: Record<1 | 2 | 3, number> = {
    2: 0,
    1: 1,
    3: 2,
};
const podiumSlots = computed(() => ([1, 2, 3] as const).map(rank => ({
    rank,
    entry: entries.value[rank - 1] ?? null,
    order: PODIUM_VISUAL_ORDER[rank],
})));

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

    &__podium {
        padding-top: 4px;
    }
}

.podium-info {
    &__nickname {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: rgb(var(--v-theme-primary));
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

    &__reward {
        padding: 3px 6px;
        background: rgba(196, 203, 219, 0.06);
        border: 1px solid rgba(196, 203, 219, 0.18);
        border-radius: 3px;
    }
}
</style>
