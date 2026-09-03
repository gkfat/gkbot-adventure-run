<template>
    <div
        v-if="modifier"
        class="modifier-acquired-banner"
    >
        <img
            :src="modifier.isBlessing ? '/images/combat-fx/buff-spark.png' : '/images/combat-fx/debuff-spark.png'"
            alt=""
            class="modifier-acquired-banner__spark"
        >
        <div
            class="font-pixel text-subtitle-2 mb-1"
            :style="{ color: modifier.isBlessing ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
        >
            {{ modifier.isBlessing ? '獲得祝福' : '遭受詛咒' }}
        </div>
        <div class="text-body-1 mb-1">
            {{ modifier.name }}
        </div>
        <div class="text-caption text-medium-emphasis mb-1">
            {{ modifier.description }}
        </div>
        <div
            v-if="effectText"
            class="text-caption font-pixel"
            :style="{ color: modifier.isBlessing ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
        >
            {{ effectText }}
        </div>
    </div>
</template>

<script setup lang="ts">
import type { RunModifier } from '../../../shared/types/adventure';

defineProps<{ modifier: RunModifier | null; effectText?: string }>();
</script>

<style scoped lang="scss">
// 取代原本的 v-dialog：疊在目前節點內容（父層需 position: relative，見
// adventure.vue 的 __scroll）上的全寬 banner，summary 資訊留在這裡，確認用的
// 「關閉」按鈕改到角色下方的 __actions 區塊，跟 combat-summary-banner 同一套
// 視覺語言。
.modifier-acquired-banner {
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
    animation: modifier-acquired-banner-in 0.2s ease-out forwards;

    &__spark {
        width: 56px;
        height: 56px;
        margin-bottom: 4px;
        image-rendering: pixelated;
        animation: modifier-acquired-banner-spark-pop 0.5s ease-out;
    }
}

@keyframes modifier-acquired-banner-spark-pop {
    0% {
        opacity: 0;
        transform: scale(0.4);
    }
    60% {
        opacity: 1;
        transform: scale(1.1);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes modifier-acquired-banner-in {
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
