<template>
    <div class="combat-summary-banner">
        <div
            class="font-pixel text-subtitle-1 mb-2"
            :style="{ color: victory ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
        >
            {{ victory ? '戰鬥勝利' : '戰鬥失敗' }}
        </div>
        <div class="d-flex justify-center flex-wrap ga-4 text-caption text-medium-emphasis">
            <span>回合 {{ roundCount }}</span>
            <span v-if="expGained">EXP +{{ expGained }}</span>
            <span v-if="goldDropped">金幣 +{{ goldDropped }}</span>
            <span v-if="gemsDropped">寶石 +{{ gemsDropped }}</span>
        </div>
        <div
            v-if="droppedItemNames.length > 0"
            class="text-caption text-medium-emphasis mt-1"
        >
            掉落物品：{{ droppedItemNames.join('、') }}
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    victory: boolean;
    roundCount: number;
    expGained: number;
    goldDropped: number;
    gemsDropped: number;
    droppedItemNames: string[];
}>();
</script>

<style scoped lang="scss">
// 取代原本的 v-dialog：疊在 arena（父層需 position: relative）上的全寬 banner，
// summary 資訊留在這裡，確認用的「關閉」按鈕改到角色下方的 __actions 區塊
// （見 adventure.vue），跟 combatResultPanel.vue 的 wave-banner 同一套視覺語言。
.combat-summary-banner {
    position: absolute;
    // combatResultPanel.vue 的 &__enemy-row 用等量的負 margin 讓卡片出手/受擊
    // 特效可以溢出捲動框而不撐出捲軸（padding: 16px 0 18px; margin: -16px 0
    // -18px），敵人 avatar/文字視覺上會超出 arena 的版面框。banner 蓋在 arena
    // 正上方，inset 要跟著往外延伸同樣的量，才不會讓敵人卡片從 banner 上下緣
    // 露出來。
    inset: -16px 0 -18px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 12px;
    background: rgb(10, 11, 14);
    border-block: 1px solid rgba(196, 203, 219, 0.25);
    opacity: 0;
    animation: combat-summary-banner-in 0.2s ease-out forwards;
}

@keyframes combat-summary-banner-in {
    0% {
        opacity: 0;
        transform: scaleY(0.6);
    }
    100% {
        opacity: 1;
        transform: scaleY(1);
    }
}
</style>
