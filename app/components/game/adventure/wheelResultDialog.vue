<template>
    <GameCommonDialogFrame
        model-value
        persistent
        :scrim="false"
        content-class="wheel-result-dialog"
    >
        <div class="wheel-result-dialog__title font-pixel mb-2">
            轉盤結果
        </div>
        <div class="text-caption text-medium-emphasis mb-8">
            {{ result?.description }}
        </div>

        <div class="wheel-spinner mb-4">
            <img
                src="/images/wheel/roulette-wheel.png"
                alt="轉盤"
                class="wheel-spinner__wheel"
                :style="{ transform: `rotate(${rotationDeg}deg)` }"
                @transitionend="revealed = true"
            >
            <img
                src="/images/wheel/roulette-pointer.png"
                alt="指針"
                class="wheel-spinner__pointer"
            >
        </div>

        <template v-if="revealed && result">
            <template v-if="result.goldGained || result.gemsGained || result.itemsGained?.length">
                <div
                    v-if="result.goldGained || result.gemsGained"
                    class="d-flex flex-wrap justify-center ga-4 mb-3"
                >
                    <div
                        v-if="result.goldGained"
                        class="d-flex align-center ga-1"
                    >
                        <GameCommonCurrencyIcon type="GOLD" :size="18" />
                        <span class="font-pixel text-body-1" style="color: #e0c063;">+{{ result.goldGained }}</span>
                    </div>
                    <div
                        v-if="result.gemsGained"
                        class="d-flex align-center ga-1"
                    >
                        <GameCommonCurrencyIcon type="GEMS" :size="18" />
                        <span class="font-pixel text-body-1" style="color: rgb(var(--v-theme-primary));">+{{ result.gemsGained }}</span>
                    </div>
                </div>
                <div
                    v-if="result.itemsGained?.length"
                    class="d-flex flex-column ga-2 mb-3"
                >
                    <GameCommonItemRewardChip
                        v-for="gainedItem in result.itemsGained"
                        :key="gainedItem.itemId"
                        :item="gainedItem"
                    />
                </div>
            </template>
            <div
                v-else
                class="text-body-2 text-medium-emphasis mb-3"
            >
                這次沒有任何收穫
            </div>
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import {
    ref, watch,
} from 'vue';
import type { EventOutcome } from '../../../composables/useAdventureRun';

const props = defineProps<{ result: EventOutcome | null; started: boolean }>();

// 轉盤圖上四個扇形的範圍（順時針角度，以 12 點鐘指針為 0 度），必須跟
// pixel-art/vr-roulette-wheel/build.py 的 SECTORS 保持一致 —— 扇形大小依實際
// 機率（server/constants/templates/events.ts）：gems 3% / 金幣 67% / 裝備 15% /
// 沒中獎 15%，而非平均分割。
const SECTORS = {
    gold: { start: 0, end: 241.2 },
    equipment: { start: 241.2, end: 295.2 },
    noWin: { start: 295.2, end: 349.2 },
    gem: { start: 349.2, end: 360 },
} as const;
const SPIN_TURNS = 6;
const JITTER_SAFETY = 0.7; // 停格點在扇形內隨機偏移，最多取半個扇形寬度的 70%，避免落在分隔線上

const rotationDeg = ref(0);
const revealed = ref(false);
let spinTriggered = false;

function segmentFor(result: EventOutcome): keyof typeof SECTORS {
    if (result.gemsGained) return 'gem';
    if (result.goldGained) return 'gold';
    if (result.itemsGained?.length) return 'equipment';
    return 'noWin';
}

function startSpin() {
    if (!props.result || spinTriggered) return;
    spinTriggered = true;
    const segment = segmentFor(props.result);
    const { start, end } = SECTORS[segment];
    const center = (start + end) / 2;
    const halfWidth = (end - start) / 2;
    const jitter = (Math.random() - 0.5) * 2 * halfWidth * JITTER_SAFETY;
    const stopAngle = (360 - (center + jitter) + 360) % 360;
    requestAnimationFrame(() => {
        rotationDeg.value = SPIN_TURNS * 360 + stopAngle;
    });
}

watch(() => props.started, started => {
    if (started) startSpin();
}, { immediate: true });
</script>

<style scoped lang="scss">
.wheel-result-dialog {
    text-align: center;
}

.wheel-result-dialog__title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #f7dd94;
    text-shadow: 0 0 8px rgba(224, 168, 62, 0.7), 0 0 2px rgba(0, 0, 0, 0.6);
}

.wheel-spinner {
    position: relative;
    width: 176px;
    height: 176px;
    margin-inline: auto;
}

.wheel-spinner__wheel {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    transition: transform 2.6s cubic-bezier(0.12, 0.68, 0.12, 1);
}

.wheel-spinner__pointer {
    position: absolute;
    top: -26px;
    left: 50%;
    width: 52px;
    height: 52px;
    transform: translateX(-50%);
    image-rendering: pixelated;
}
</style>
