<template>
    <v-dialog
        :model-value="open"
        max-width="420"
        persistent
    >
        <div class="blessing-select-dialog pa-4">
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
                    @click="selectedId = candidate.modifierId"
                >
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

            <SystemBtn
                block
                variant="flat"
                color="primary"
                class="text-none mt-4"
                :disabled="!selectedId"
                :loading="loading"
                @click="selectedId && $emit('select', selectedId)"
            >
                選擇
            </SystemBtn>
        </div>
    </v-dialog>
</template>

<script setup lang="ts">
import type { BlessingCandidate } from '../../composables/useAdventureRun';

type BlessingCandidateWithEffect = BlessingCandidate & { effectText: string };

const props = defineProps<{
    open: boolean;
    candidates: BlessingCandidateWithEffect[];
    loading?: boolean;
}>();
defineEmits<{ select: [modifierId: string] }>();

// 每次重新開啟(換一批候選祝福)都要清掉上一輪選取，避免殘留選取狀態誤觸。
const selectedId = ref<string | null>(null);
watch(() => props.open, (isOpen) => {
    if (isOpen) selectedId.value = null;
});
</script>

<style scoped lang="scss">
.blessing-select-dialog {
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);

    &__cards {
        display: flex;
        gap: 8px;
        align-items: stretch;
    }

    // 三張並排的祝福卡：厚實深色外框 + 內縮 outline，仿照 archetypeGallery.vue
    // 選角卡片的「華麗外框」語言；選取時 outline 轉綠並微微上浮、加光暈。
    &__card {
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
