<template>
    <div
        v-if="result"
        class="wheel-result-banner"
    >
        <div class="font-pixel text-subtitle-2 mb-2" style="color: rgb(var(--v-theme-primary));">
            轉盤結果
        </div>
        <div class="text-caption text-medium-emphasis mb-3">
            {{ result.description }}
        </div>
        <div
            v-if="result.goldGained || result.gemsGained || result.itemsGained?.length"
            class="d-flex flex-wrap justify-center ga-4"
        >
            <div
                v-if="result.goldGained"
                class="d-flex align-center ga-1"
            >
                <GameCurrencyIcon type="GOLD" :size="18" />
                <span class="font-pixel text-body-1" style="color: #e0c063;">+{{ result.goldGained }}</span>
            </div>
            <div
                v-if="result.gemsGained"
                class="d-flex align-center ga-1"
            >
                <GameCurrencyIcon type="GEMS" :size="18" />
                <span class="font-pixel text-body-1" style="color: rgb(var(--v-theme-primary));">+{{ result.gemsGained }}</span>
            </div>
            <div
                v-if="result.itemsGained?.length"
                class="font-pixel text-body-1"
                style="color: rgb(var(--v-theme-green));"
            >
                獲得物品 x{{ result.itemsGained.length }}
            </div>
        </div>
        <div
            v-else
            class="text-body-2 text-medium-emphasis"
        >
            這次沒有任何收穫
        </div>
    </div>
</template>

<script setup lang="ts">
import type { EventOutcome } from '../../composables/useAdventureRun';

defineProps<{ result: EventOutcome | null }>();
</script>

<style scoped lang="scss">
// 跟 GameModifierAcquiredBanner 同一套視覺語言（疊在目前節點內容上的全寬
// banner，確認用的「關閉」按鈕在下方 __actions 區塊，見 adventure.vue
// wheelResultPending 的用法），差別只在轉盤是開獎結果、沒有祝福/詛咒那種
// 需要疊在角色身上的光暈特效。
.wheel-result-banner {
    position: absolute;
    inset: 0;
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
    animation: wheel-result-banner-in 0.2s ease-out forwards;
}

@keyframes wheel-result-banner-in {
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
