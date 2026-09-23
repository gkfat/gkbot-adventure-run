<template>
    <div class="w-100 character-stage__footer">
        <!-- 中斷中的冒險：顯示上次斷掉的位置 -->
        <div
            v-if="interruptedRunLabel"
            class="text-caption text-medium-emphasis character-stage__interrupted-run"
        >
            上次探索中斷於：{{ interruptedRunLabel }}
        </div>

        <!-- 章節關卡進度：置中顯示於開始探索按鈕上方 -->
        <GameCharacterStageChapterProgress
            v-if="levelProgress"
            :stage-name="levelProgress.stageName"
            :level-index="levelProgress.levelIndex"
            :level-total="levelProgress.levelTotal"
            class="mx-auto mb-2"
        />

        <div class="character-stage__cta-row d-flex flex-column align-center ga-2">
            <button
                type="button"
                class="cta-btn"
                :class="{ 'cta-btn--bounce': bouncing }"
                :disabled="loading"
                @click="handleStart"
                @animationend="bouncing = false"
            >
                <span class="cta-btn__label">{{ label }}</span>
            </button>

            <!-- 放棄探索：僅在有進行中的 run 時顯示 -->
            <SystemBtn
                v-if="showAbandon"
                variant="outlined"
                color="error"
                size="small"
                class="text-none character-stage__abandon-btn"
                :loading="loading"
                @click="emit('abandon')"
            >
                放棄探索
            </SystemBtn>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    label: string;
    levelProgress: { stageName: string; levelIndex: number; levelTotal: number } | null;
    loading: boolean;
    showAbandon: boolean;
    interruptedRunLabel: string | null;
}>();

const emit = defineEmits<{
    start: [];
    abandon: [];
}>();

// 點擊時強制播放一次「按下→回彈」動畫，不依賴滑鼠/觸控實際按住的時間長短
// （純 CSS :active 在快速點擊或部分行動瀏覽器上不保證觸發），確保視覺回饋
// 一定會完整播放。animationend 會在動畫播完後把 class 移除以便下次重新觸發。
const bouncing = ref(false);

const { playSfx } = useAudio();

const handleStart = () => {
    bouncing.value = false;
    requestAnimationFrame(() => {
        bouncing.value = true;
    });
    playSfx('click.wav');
    emit('start');
};
</script>

<style scoped lang="scss">
.character-stage__footer {
    flex-shrink: 0;
}

.character-stage__abandon-btn {
    min-width: 132px;
}

// ---------------------------------------------------------------------------
// 像素感矩形「開始探索」按鈕：邊框圖來自 pixel-art-studio 手繪的 9-slice 素材
// （public/images/ui/cta-btn-idle.png／cta-btn-pressed.png），border-image 保
// 留四角不變形只拉伸中央。點擊時播放 cta-btn-press 關鍵影格動畫：位移下沉、
// 邊框圖瞬間切換成凹陷版，再用彈簧曲線回彈到原位。
// ---------------------------------------------------------------------------
.cta-btn {
    position: relative;
    min-width: 220px;
    padding: 12px 36px;
    border-width: 8px;
    border-style: solid;
    border-image-source: url('/images/ui/cta-btn-idle.png');
    border-image-slice: 4 fill;
    border-image-width: 8px;
    border-image-repeat: stretch;
    background: transparent;
    cursor: pointer;
    image-rendering: pixelated;
    transform: translateY(0);

    &:disabled {
        cursor: not-allowed;
    }

    &:hover:not(:disabled) {
        transform: translateY(2px);
    }

    &--bounce {
        animation: cta-btn-press 0.4s;
    }

    &__label {
        display: block;
        color: #1c1e24;
        font-size: 18px;
        font-weight: 700;
        text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.25);
    }
}

@keyframes cta-btn-press {
    0% {
        transform: translateY(0);
        border-image-source: url('/images/ui/cta-btn-idle.png');
        animation-timing-function: ease-out;
    }

    25% {
        transform: translateY(6px);
        border-image-source: url('/images/ui/cta-btn-pressed.png');
        animation-timing-function: linear;
    }

    55% {
        transform: translateY(6px);
        border-image-source: url('/images/ui/cta-btn-pressed.png');
        animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    100% {
        transform: translateY(0);
        border-image-source: url('/images/ui/cta-btn-idle.png');
    }
}
</style>
