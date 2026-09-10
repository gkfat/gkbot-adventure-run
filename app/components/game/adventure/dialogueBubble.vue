<template>
    <div
        v-if="text"
        class="dialogue-bubble"
    >
        {{ text }}
        <span class="dialogue-bubble__tail" />
    </div>
</template>

<script setup lang="ts">
// 純渲染元件：定位錨點是父層 position: relative 的容器（玩家 stage 的
// __stage-fx-anchor、敵人卡片的 __fx-anchor），跟既有 sparkFx/damageText 疊放
// 在同一層。呼叫端要把 bubble 的 key 綁在這個元件標籤本身的 :key 上（比照
// sparkFx.vue 的慣例），讓新台詞觸發時整個元件重新掛載、重播進出場 animation。
defineProps<{ text: string | null }>();
</script>

<style scoped lang="scss">
// 不套用 .font-pixel：台詞是中英混排（GK 博士、PR 等），Press Start 2P 沒有
// CJK 字符會 fallback 回 Noto Sans TC，但兩者字面大小不同級，混排會讓英數字
// 明顯比中文大一圈（見 index.scss 的 .font-pixel 註解：僅限純英數字元使用，
// 見使用者回報截圖）。用預設字體讓中英文大小一致。
.dialogue-bubble {
    position: absolute;
    bottom: 100%;
    left: 50%;
    z-index: 3;
    transform: translate(-50%, 4px);
    margin-bottom: 6px;
    // width 明確設 max-content：敵人卡片只有 72px 寬，absolute + 只設 left（沒
    // 設 right）時瀏覽器的 shrink-to-fit 會以極窄的 containing block 去夾寬度，
    // 導致文字被擠成一字一行（見使用者回報截圖）。明確給 max-content 讓寬度
    // 依文字自然寬度撐開，max-width 才是真正的換行上限。
    width: max-content;
    max-width: 120px;
    padding: 5px 8px;
    border-radius: 3px;
    background: rgba(10, 12, 16, 0.88);
    border: 1px solid rgba(196, 203, 219, 0.35);
    color: #fff;
    font-size: 10px;
    line-height: 1.4;
    text-align: center;
    white-space: normal;
    word-break: break-word;
    pointer-events: none;
    opacity: 0;
    animation: dialogue-bubble-in 0.18s ease-out forwards, dialogue-bubble-out 0.2s ease-in 2.2s forwards;

    &__tail {
        position: absolute;
        top: 100%;
        left: 50%;
        width: 0;
        height: 0;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: rgba(10, 12, 16, 0.88);
        border-bottom: 0;
    }
}

@keyframes dialogue-bubble-in {
    0% {
        opacity: 0;
        transform: translate(-50%, 10px);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, 4px);
    }
}

@keyframes dialogue-bubble-out {
    0% {
        opacity: 1;
        transform: translate(-50%, 4px);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, 0);
    }
}
</style>
