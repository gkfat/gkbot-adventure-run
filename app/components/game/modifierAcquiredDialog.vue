<template>
    <GameDialogFrame
        :model-value="!!modifier"
        persistent
        :scrim="false"
        content-class="modifier-acquired-dialog"
    >
        <template v-if="modifier">
            <img
                :src="modifier.isBlessing ? '/images/combat-fx/buff-spark.png' : '/images/combat-fx/debuff-spark.png'"
                alt=""
                class="modifier-acquired-dialog__spark"
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
                class="text-caption font-pixel mb-3"
                :style="{ color: modifier.isBlessing ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
            >
                {{ effectText }}
            </div>
        </template>
    </GameDialogFrame>
</template>

<script setup lang="ts">
import type { RunModifier } from '../../../shared/types/adventure';

defineProps<{ modifier: RunModifier | null; effectText?: string }>();
</script>

<style scoped lang="scss">
.modifier-acquired-dialog {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    &__spark {
        width: 56px;
        height: 56px;
        margin-bottom: 4px;
        image-rendering: pixelated;
        animation: modifier-acquired-dialog-spark-pop 0.5s ease-out;
    }
}

@keyframes modifier-acquired-dialog-spark-pop {
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
</style>
