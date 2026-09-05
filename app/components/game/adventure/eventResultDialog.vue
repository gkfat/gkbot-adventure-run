<template>
    <GameCommonDialogFrame
        :model-value="open"
        persistent
        :scrim="false"
        content-class="event-result-dialog"
    >
        <div
            class="text-center font-pixel text-subtitle-1 mb-3"
            style="color: rgb(var(--v-theme-primary));"
        >
            {{ result?.eventType === EventType.CHOICE ? '開箱結果' : '事件結果' }}
        </div>

        <template v-if="result">
            <div class="text-body-2 text-center mb-3">
                {{ result.description }}
            </div>

            <div class="d-flex flex-wrap justify-center ga-4 mb-3">
                <div
                    v-if="result.hpHealed"
                    class="event-result-dialog__stat"
                >
                    <div class="text-caption text-medium-emphasis">HP</div>
                    <div
                        class="font-pixel event-result-dialog__stat-value"
                        style="color: rgb(var(--v-theme-green));"
                    >
                        +{{ result.hpHealed }}
                    </div>
                </div>
                <div
                    v-if="result.goldGained"
                    class="event-result-dialog__stat"
                >
                    <div class="text-caption text-medium-emphasis">金幣</div>
                    <div
                        class="font-pixel event-result-dialog__stat-value"
                        style="color: #e0c063;"
                    >
                        +{{ result.goldGained }}
                    </div>
                </div>
                <div
                    v-if="result.gemsGained"
                    class="event-result-dialog__stat"
                >
                    <div class="text-caption text-medium-emphasis">寶石</div>
                    <div
                        class="font-pixel event-result-dialog__stat-value"
                        style="color: rgb(var(--v-theme-primary));"
                    >
                        +{{ result.gemsGained }}
                    </div>
                </div>
                <div
                    v-if="result.blessingGranted"
                    class="event-result-dialog__stat"
                >
                    <div class="text-caption text-medium-emphasis">祝福</div>
                    <div
                        class="font-pixel event-result-dialog__stat-value"
                        style="color: rgb(var(--v-theme-green));"
                    >
                        獲得
                    </div>
                </div>
                <div
                    v-if="result.curseApplied"
                    class="event-result-dialog__stat"
                >
                    <div class="text-caption text-medium-emphasis">詛咒</div>
                    <div
                        class="font-pixel event-result-dialog__stat-value"
                        style="color: rgb(var(--v-theme-warning));"
                    >
                        遭受
                    </div>
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
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import type { EventOutcome } from '../../../composables/useAdventureRun';
import { EventType } from '../../../../shared/types/adventure';

defineProps<{ open: boolean; result: EventOutcome | null }>();
</script>

<style scoped lang="scss">
.event-result-dialog {
    &__stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    &__stat-value {
        font-size: 15px;
        font-weight: 700;
    }
}
</style>
