<template>
    <GameDialogFrame
        :model-value="open"
        max-width="420"
        persistent
        :scrim="false"
        content-class="blessing-select-dialog"
    >
        <div
            class="text-center font-pixel text-subtitle-1 mb-3"
            style="color: rgb(var(--v-theme-green));"
        >
            選擇一個祝福
        </div>

        <div class="blessing-select-dialog__cards">
            <button
                v-for="candidate in candidates"
                :key="candidate.modifierId"
                type="button"
                class="blessing-select-dialog__card pixel-press"
                :class="{ 'blessing-select-dialog__card--active': selectedId === candidate.modifierId }"
                :style="{ borderColor: RARITY_COLOR[candidate.rarity] }"
                @click="emit('update:selectedId', candidate.modifierId)"
            >
                <span
                    class="blessing-select-dialog__rarity font-pixel"
                    :style="{ background: RARITY_COLOR[candidate.rarity] }"
                >
                    {{ candidate.rarity }}
                </span>

                <span class="font-pixel text-caption blessing-select-dialog__card-level mt-2">
                    LV.{{ candidate.level }}
                </span>
                <div class="font-pixel blessing-select-dialog__card-name font-weight-bold mb-2">
                    {{ candidate.name }}
                </div>
                <div class="text-caption text-medium-emphasis blessing-select-dialog__card-desc">
                    {{ candidate.description }}
                </div>
                <div
                    v-if="candidate.effectText"
                    class="font-pixel text-caption blessing-select-dialog__card-effect"
                >
                    {{ candidate.effectText }}
                </div>
            </button>
        </div>
    </GameDialogFrame>
</template>

<script setup lang="ts">
import type { BlessingCandidate } from '../../composables/useAdventureRun';
import type { BlessingRarity } from '../../../shared/constants/blessings';

type BlessingCandidateWithEffect = BlessingCandidate & { effectText: string };

// 稀有度外框/徽章顏色 — 沿用裝備稀有度呈現手法 (app/utils/equipmentDisplay.ts
// RARITY_COLOR)，但這是 Blessing 專屬的三級稀有度，維持獨立定義。
const RARITY_COLOR: Record<BlessingRarity, string> = {
    COMMON: '#8a8f98',
    RARE: '#4fc3f7',
    EPIC: '#ffb300',
};

defineProps<{
    open: boolean;
    candidates: BlessingCandidateWithEffect[];
    selectedId: string | null;
}>();
const emit = defineEmits<{ 'update:selectedId': [modifierId: string] }>();
</script>

<style scoped lang="scss">
.blessing-select-dialog {
    &__cards {
        display: flex;
        gap: 8px;
        align-items: stretch;
    }

    // 三張並排的祝福卡：厚實深色外框 + 內縮 outline，仿照 archetypeGallery.vue
    // 選角卡片的「華麗外框」語言；選取時 outline 轉綠並微微上浮、加光暈。
    &__card {
        position: relative;
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 4px;
        padding: 10px 6px;
        background: rgba(196, 203, 219, 0.04);
        border: 3px solid rgb(20, 20, 20);
        outline: 2px solid rgba(196, 203, 219, 0.25);
        outline-offset: -6px;
        border-radius: 2px;
        cursor: pointer;
        transition: transform 0.15s ease-out, outline-color 0.1s ease-out, box-shadow 0.15s ease-out;

        &--active {
            outline-color: rgb(var(--v-theme-green));
            transform: translateY(-3px);
            box-shadow: 0 4px 14px rgba(var(--v-theme-green), 0.35);
        }
    }

    // 左上角稀有度徽章 — 沿用 inventory.vue 的 .pixel-slot__rarity 定位手法。
    &__rarity {
        position: absolute;
        top: -6px;
        left: -6px;
        padding: 0 3px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        border-radius: 2px;
        white-space: nowrap;
    }

    // 等級標示移到卡片內、標題正上方，避免跟左上角稀有度徽章擠在同一行重疊。
    &__card-level {
        color: rgb(var(--v-theme-green));
        line-height: 1.2;
    }

    &__card-name {
        color: rgb(var(--v-theme-primary));
    }

    &__card-desc {
        line-height: 1.4;
    }

    // 三張卡的敘述文字長短不一，數值若跟著往下排會高低不齊；margin-top: auto
    // 把它推到 card 底部對齊，不受敘述行數影響。
    &__card-effect {
        margin-top: auto;
    }
}
</style>
