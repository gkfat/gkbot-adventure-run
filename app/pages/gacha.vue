<template>
    <div class="fill-height gacha-page pa-3 d-flex flex-column">
        <!-- 機具銘牌：延續世界觀——福利社留下的老機器，劫後仍在運轉 -->
        <div class="gacha-page__nameplate font-pixel text-caption text-medium-emphasis">
            GK 福利社遺留機具 · MK-3
        </div>
        <div class="gacha-page__title font-pixel text-body-2 mb-1">
            裝備老虎機
        </div>
        <div class="gacha-page__flavor text-caption text-medium-emphasis mb-3">
            機具還嗡嗡運轉著，投幣就匡啷吐出一件零件——這樣也算中獎嗎？
        </div>

        <div class="gacha-page__divider" />

        <!-- 抽取過程的繽紛效果：畫在機身外圍（追逐燈框＋亂跳小圖示），
             機身面板內部維持乾淨、只顯示轉輪本身 -->
        <div class="gacha-page__cabinet-wrap">
            <template v-if="spinning">
                <div class="gacha-page__disco-marquee gacha-page__disco-marquee--top">
                    <span
                        v-for="n in 8"
                        :key="`t${n}`"
                        class="gacha-page__bulb"
                        :style="{ background: DISCO_COLORS[n % DISCO_COLORS.length], animationDelay: `${n * 0.08}s` }"
                    />
                </div>
                <div class="gacha-page__disco-marquee gacha-page__disco-marquee--bottom">
                    <span
                        v-for="n in 8"
                        :key="`b${n}`"
                        class="gacha-page__bulb"
                        :style="{ background: DISCO_COLORS[(8 - n) % DISCO_COLORS.length], animationDelay: `${n * 0.08}s` }"
                    />
                </div>

                <span
                    v-for="c in confetti"
                    :key="c.id"
                    class="gacha-page__confetti"
                    :style="confettiStyle(c)"
                >
                    <GameCommonPixelIcon
                        :name="c.icon"
                        :size="12"
                    />
                </span>
            </template>

            <!-- 機身：三軸轉輪 + 右側拉桿（拉桿本身不可點擊，需先投幣才會下拉） -->
            <div
                class="gacha-page__cabinet d-flex align-center justify-center my-4"
                :class="{ 'gacha-page__cabinet--disco': spinning }"
            >
                <div class="gacha-page__reel-bay d-flex align-center justify-center">
                    <div class="gacha-page__payline" />
                    <div
                        v-for="(icon, i) in reelIcons"
                        :key="i"
                        class="gacha-page__reel d-flex align-center justify-center"
                        :class="{ 'gacha-page__reel--spinning': reelSpinning[i] }"
                    >
                        <GameCommonPixelIcon
                            :name="icon"
                            :size="26"
                        />
                    </div>
                </div>

                <!-- 拉桿：不可點擊，投幣後才會下拉並帶動轉輪 -->
                <div
                    class="gacha-page__lever"
                    aria-hidden="true"
                >
                    <div class="gacha-page__lever-track" />
                    <div
                        :key="pullCount"
                        class="gacha-page__lever-handle"
                        :class="{ 'gacha-page__lever-handle--pull': spinning }"
                    />
                </div>
            </div>
        </div>

        <div class="gacha-page__divider mb-4" />

        <!-- 投幣選擇：金幣/寶石各自對應不同的稀有度區間，直接標示在按鈕上；
             拉桿要等這裡選好貨幣才會動作，不能直接扳拉桿 -->
        <div class="gacha-page__actions d-flex ga-3">
            <button
                type="button"
                class="gacha-page__action pixel-press d-flex flex-column align-center"
                :disabled="spinning || !canAffordGold"
                @click="handlePull('GOLD')"
            >
                <span class="gacha-page__action-label text-caption d-flex align-center justify-center ga-1">
                    <template v-if="pullingGold">
                        投幣中…
                    </template>
                    <template v-else>
                        投入
                        <GameCommonCurrencyIcon
                            type="GOLD"
                            :size="11"
                        />
                        <span class="font-pixel">{{ GOLD_COST }}</span>
                        金幣
                    </template>
                </span>
                <span class="gacha-page__action-band text-caption">N ~ SR</span>
                <span
                    class="gacha-page__action-meter"
                    :style="{ background: `linear-gradient(to right, ${RARITY_COLOR[Rarity.N]}, ${RARITY_COLOR[Rarity.SR]})` }"
                />
            </button>

            <button
                type="button"
                class="gacha-page__action pixel-press d-flex flex-column align-center"
                :disabled="spinning || !canAffordGems"
                @click="handlePull('GEMS')"
            >
                <span class="gacha-page__action-label text-caption d-flex align-center justify-center ga-1">
                    <template v-if="pullingGems">
                        投幣中…
                    </template>
                    <template v-else>
                        投入
                        <GameCommonCurrencyIcon
                            type="GEMS"
                            :size="11"
                        />
                        <span class="font-pixel">{{ GEMS_COST }}</span>
                        寶石
                    </template>
                </span>
                <span class="gacha-page__action-band text-caption">SR ~ L</span>
                <span
                    class="gacha-page__action-meter"
                    :style="{ background: `linear-gradient(to right, ${RARITY_COLOR[Rarity.SR]}, ${RARITY_COLOR[Rarity.L]})` }"
                />
            </button>
        </div>

        <div
            v-if="error"
            class="text-body-2 mt-3 text-center"
            style="color: rgb(var(--v-theme-warning));"
        >
            {{ error }}
        </div>

        <!-- 本次戰利品：只在這次停留頁面期間累積，離開頁面就清空（不落地儲存） -->
        <div
            v-if="sessionLoot.length"
            class="gacha-page__loot mt-4"
        >
            <div class="gacha-page__loot-label text-caption text-medium-emphasis mb-2">
                本次戰利品
            </div>
            <div class="d-flex flex-wrap ga-2">
                <div
                    v-for="loot in sessionLoot"
                    :key="loot.item.itemId"
                    class="gacha-page__loot-chip d-flex align-center justify-center"
                    :style="{ borderColor: RARITY_COLOR[loot.item.rarity] }"
                    :title="loot.item.name"
                >
                    <GameCommonPixelIcon
                        :name="resolvePixelIcon(loot.item)"
                        :size="20"
                    />
                </div>
            </div>
        </div>

        <!-- 抽取結果 -->
        <GameCommonDialogFrame
            v-model="resultOpen"
            max-width="320"
        >
            <template v-if="lastResult && detailInfo">
                <GameCommonItemDetailPanel
                    :item="lastResult.item"
                    :name="detailInfo.name"
                    :effects="detailInfo.effects"
                    :flavor="detailInfo.flavor"
                />

                <SystemBtn
                    block
                    variant="outlined"
                    color="primary"
                    class="text-none mt-2"
                    @click="resultOpen = false"
                >
                    關閉
                </SystemBtn>
            </template>
        </GameCommonDialogFrame>
    </div>
</template>

<script setup lang="ts">
import { describeItem, resolvePixelIcon, RARITY_COLOR } from '../utils/equipmentDisplay';
import { Rarity } from '../../shared/types/common';
import { GACHA_CONFIG } from '../../shared/constants/gacha';
import type { PixelIconName } from '../utils/pixelIcons';
import type { GachaPullResponseData } from '../composables/useGacha';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '老虎機',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 裝備老虎機' }],
});

const GOLD_COST = GACHA_CONFIG.GOLD_COST;
const GEMS_COST = GACHA_CONFIG.GEMS_COST;

const { character, fetchCharacter } = useCharacter();
const { invalidate: invalidateInventory } = useInventory();
const {
    pull, error, lastResult,
} = useGacha();

const spinning = ref(false);
const pullCount = ref(0);
const pullingCurrency = ref<'GOLD' | 'GEMS' | null>(null);
const pullingGold = computed(() => pullingCurrency.value === 'GOLD');
const pullingGems = computed(() => pullingCurrency.value === 'GEMS');

const canAffordGold = computed(() => (character.value?.gold ?? 0) >= GOLD_COST);
const canAffordGems = computed(() => (character.value?.gems ?? 0) >= GEMS_COST);

const REEL_SYMBOLS: PixelIconName[] = ['sword', 'shield', 'helmet', 'chest', 'boot', 'ring'];
const REEL_TICK_MS = 70;
// 三軸依序停下（左→中→右），模擬真正拉桿老虎機的節奏感，而不是三軸同時停。
const REEL_STOP_DELAYS_MS = [520, 760, 1040];

const reelIndexes = ref([0, 1, 2]);
const reelSpinning = ref([false, false, false]);
const reelIcons = computed(() => reelIndexes.value.map(i => REEL_SYMBOLS[i % REEL_SYMBOLS.length] as PixelIconName));

const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function spinOneReel(reelIndex: number, stopDelayMs: number): Promise<void> {
    return new Promise((resolve) => {
        if (prefersReducedMotion) {
            reelIndexes.value[reelIndex] = Math.floor(Math.random() * REEL_SYMBOLS.length);
            resolve();
            return;
        }

        reelSpinning.value[reelIndex] = true;
        const tick = setInterval(() => {
            reelIndexes.value[reelIndex] = (reelIndexes.value[reelIndex] ?? 0) + 1;
        }, REEL_TICK_MS);

        setTimeout(() => {
            clearInterval(tick);
            reelSpinning.value[reelIndex] = false;
            resolve();
        }, stopDelayMs);
    });
}

async function spinReels(): Promise<void> {
    await Promise.all(REEL_STOP_DELAYS_MS.map((delay, i) => spinOneReel(i, delay)));
}

// ---------------------------------------------------------------------------
// Disco 效果：轉動期間才出現，畫在機身「外圍」——追逐燈沿機身外緣的上下兩條，
// 亂跳的小裝備圖示則散布在機身四周的留白區域，機身面板本身維持乾淨。
// ---------------------------------------------------------------------------
const DISCO_COLORS = ['#8a8f98', '#4fc3f7', '#ab47bc', '#ffb300', '#ff5252', '#81b29a'];
type Confetti = { id: number; left: number; top: number; icon: PixelIconName; color: string; duration: number; delay: number };
const confetti: Confetti[] = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: (i * 13) % 100,
    top: (i * 37) % 100,
    icon: REEL_SYMBOLS[i % REEL_SYMBOLS.length] as PixelIconName,
    color: DISCO_COLORS[i % DISCO_COLORS.length] as string,
    duration: 0.5 + (i % 3) * 0.15,
    delay: (i % 4) * 0.1,
}));
function confettiStyle(c: Confetti) {
    return {
        left: `${c.left}%`,
        top: `${c.top}%`,
        color: c.color,
        animationDuration: `${c.duration}s`,
        animationDelay: `${c.delay}s`,
    };
}

const resultOpen = ref(false);

const detailInfo = computed(() => (lastResult.value ? describeItem(lastResult.value.item) : null));

// 本次停留頁面期間抽到的裝備——只存在這個頁面元件的生命週期內，
// 離開頁面（元件卸載）就跟著消失，不寫入任何持久化狀態。
const sessionLoot = ref<GachaPullResponseData[]>([]);

// 拉桿只在投幣（點選金幣/寶石按鈕）後才會下拉並帶動轉輪；拉桿本身不可點擊觸發。
const handlePull = async (currency: 'GOLD' | 'GEMS') => {
    pullingCurrency.value = currency;
    pullCount.value++;
    spinning.value = true;

    const [result] = await Promise.all([pull(currency), spinReels()]);

    spinning.value = false;
    pullingCurrency.value = null;

    if (result) {
        sessionLoot.value = [result, ...sessionLoot.value];
        await fetchCharacter();
        invalidateInventory();
        resultOpen.value = true;
    }
};
</script>

<style scoped lang="scss">
.gacha-page {
    width: 100%;
    overflow-y: auto;

    &__nameplate {
        opacity: 0.6;
    }

    &__flavor {
        display: block;
    }

    &__divider {
        width: 100%;
        height: 1px;
        background: rgba(196, 203, 219, 0.15);
    }

    // ---- 機身外圍容器：留白給 disco 追逐燈/亂跳圖示，機身本體置中 -----------------
    &__cabinet-wrap {
        position: relative;
        padding: 18px 8px;
    }

    &__disco-marquee {
        position: absolute;
        left: 6%;
        right: 6%;
        display: flex;
        justify-content: space-between;
        pointer-events: none;

        &--top {
            top: 0;
        }

        &--bottom {
            bottom: 0;
        }
    }

    &__bulb {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        animation: gacha-page-bulb-flash 0.9s linear infinite;
    }

    &__confetti {
        position: absolute;
        animation-name: gacha-page-confetti-jump;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
        pointer-events: none;
    }

    &__cabinet {
        position: relative;
        gap: 14px;
        padding: 14px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 4px;
        background: #14171c;
        box-shadow:
            inset 2px 2px 0 rgba(255, 255, 255, 0.06),
            inset -2px -2px 0 rgba(0, 0, 0, 0.55);

        &--disco {
            animation: gacha-page-cabinet-glow 1.2s linear infinite;
        }
    }

    &__reel-bay {
        position: relative;
        gap: 10px;
    }

    &__payline {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 1px;
        background: rgba(196, 203, 219, 0.3);
        pointer-events: none;
    }

    &__reel {
        position: relative;
        width: 56px;
        height: 56px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #0d0f13;
        box-shadow:
            inset 2px 2px 0 rgba(255, 255, 255, 0.06),
            inset -2px -2px 0 rgba(0, 0, 0, 0.55);
        overflow: hidden;

        &--spinning {
            animation: gacha-page-reel-blur 0.07s linear infinite;
        }
    }

    // 拉桿：純裝飾用互動回饋，不接受點擊（見範本 aria-hidden + pointer-events），
    // 只在投幣（下方按鈕）觸發抽取時才會下拉。
    &__lever {
        position: relative;
        width: 26px;
        height: 78px;
        pointer-events: none;
    }

    &__lever-track {
        position: absolute;
        left: 50%;
        top: 6px;
        bottom: 10px;
        width: 4px;
        margin-left: -2px;
        border-radius: 2px;
        background: rgba(196, 203, 219, 0.18);
    }

    &__lever-handle {
        position: absolute;
        left: 50%;
        top: 6px;
        width: 16px;
        height: 16px;
        margin-left: -8px;
        border-radius: 50%;
        background: rgb(var(--v-theme-secondary));
        border: 2px solid rgba(0, 0, 0, 0.4);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);

        &--pull {
            animation: gacha-page-lever-pull 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1;
        }
    }

    &__actions {
        width: 100%;
    }

    &__action {
        position: relative;
        flex: 1 1 0;
        gap: 4px;
        padding: 10px 6px 12px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;
        color: rgb(var(--v-theme-primary));
        overflow: hidden;
        box-shadow:
            inset 2px 2px 0 rgba(255, 255, 255, 0.06),
            inset -2px -2px 0 rgba(0, 0, 0, 0.55);

        &:disabled {
            opacity: 0.4;
            cursor: default;
        }
    }

    &__action-label {
        color: rgb(var(--v-theme-secondary));
        opacity: 0.9;
    }

    &__action-band {
        font-size: 9px;
        color: rgb(var(--v-theme-primary));
        opacity: 0.5;
    }

    &__action-meter {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 3px;
    }

    // ---- 本次戰利品 ----------------------------------------------------------
    &__loot-chip {
        width: 36px;
        height: 36px;
        border: 2px solid;
        border-radius: 3px;
        background: #14171c;
    }
}

@keyframes gacha-page-reel-blur {
    0%, 100% {
        filter: blur(0);
    }
    50% {
        filter: blur(1.5px);
    }
}

@keyframes gacha-page-lever-pull {
    0% {
        transform: translateY(0);
    }
    35% {
        transform: translateY(46px);
    }
    100% {
        transform: translateY(0);
    }
}

@keyframes gacha-page-bulb-flash {
    0%, 100% {
        opacity: 0.2;
        transform: scale(0.8);
    }
    50% {
        opacity: 1;
        transform: scale(1.2);
        box-shadow: 0 0 4px currentColor;
    }
}

@keyframes gacha-page-confetti-jump {
    0%, 100% {
        transform: translateY(0) rotate(0deg);
        opacity: 0.9;
    }
    50% {
        transform: translateY(-14px) rotate(180deg);
        opacity: 0.4;
    }
}

@keyframes gacha-page-cabinet-glow {
    0%, 100% {
        box-shadow: 0 0 10px 2px rgba(138, 143, 152, 0.55);
    }
    20% {
        box-shadow: 0 0 10px 2px rgba(79, 195, 247, 0.55);
    }
    40% {
        box-shadow: 0 0 10px 2px rgba(171, 71, 188, 0.55);
    }
    60% {
        box-shadow: 0 0 10px 2px rgba(255, 179, 0, 0.55);
    }
    80% {
        box-shadow: 0 0 10px 2px rgba(255, 82, 82, 0.55);
    }
}

@media (prefers-reduced-motion: reduce) {
    .gacha-page__reel--spinning,
    .gacha-page__lever-handle--pull,
    .gacha-page__bulb,
    .gacha-page__confetti,
    .gacha-page__cabinet--disco {
        animation: none;
    }
}
</style>
