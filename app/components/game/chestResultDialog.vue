<template>
    <v-dialog
        :model-value="open"
        max-width="360"
        persistent
    >
        <div class="chest-result-dialog pa-4">
            <div
                class="text-center font-pixel text-subtitle-1 mb-3"
                style="color: rgb(var(--v-theme-primary));"
            >
                開箱結果
            </div>

            <template v-if="result">
                <div class="text-body-2 text-center mb-3">
                    {{ result.description }}
                </div>

                <div class="d-flex flex-wrap justify-center ga-4 mb-1">
                    <div
                        v-if="result.hpHealed"
                        class="chest-result-dialog__stat"
                    >
                        <div class="text-caption text-medium-emphasis">HP</div>
                        <div
                            class="font-pixel chest-result-dialog__stat-value"
                            style="color: rgb(var(--v-theme-green));"
                        >
                            +{{ result.hpHealed }}
                        </div>
                    </div>
                    <div
                        v-if="result.goldGained"
                        class="chest-result-dialog__stat"
                    >
                        <div class="text-caption text-medium-emphasis">金幣</div>
                        <div
                            class="font-pixel chest-result-dialog__stat-value"
                            style="color: #e0c063;"
                        >
                            +{{ result.goldGained }}
                        </div>
                    </div>
                    <div
                        v-if="result.gemsGained"
                        class="chest-result-dialog__stat"
                    >
                        <div class="text-caption text-medium-emphasis">寶石</div>
                        <div
                            class="font-pixel chest-result-dialog__stat-value"
                            style="color: rgb(var(--v-theme-primary));"
                        >
                            +{{ result.gemsGained }}
                        </div>
                    </div>
                    <div
                        v-if="result.itemsGained?.length"
                        class="chest-result-dialog__stat"
                    >
                        <div class="text-caption text-medium-emphasis">道具</div>
                        <div
                            class="font-pixel chest-result-dialog__stat-value"
                            style="color: rgb(var(--v-theme-green));"
                        >
                            x{{ result.itemsGained.length }}
                        </div>
                    </div>
                    <div
                        v-if="result.blessingGranted"
                        class="chest-result-dialog__stat"
                    >
                        <div class="text-caption text-medium-emphasis">祝福</div>
                        <div
                            class="font-pixel chest-result-dialog__stat-value"
                            style="color: rgb(var(--v-theme-green));"
                        >
                            獲得
                        </div>
                    </div>
                    <div
                        v-if="result.curseApplied"
                        class="chest-result-dialog__stat"
                    >
                        <div class="text-caption text-medium-emphasis">詛咒</div>
                        <div
                            class="font-pixel chest-result-dialog__stat-value"
                            style="color: rgb(var(--v-theme-warning));"
                        >
                            遭受
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </v-dialog>
</template>

<script setup lang="ts">
import type { EventOutcome } from '../../composables/useAdventureRun';

defineProps<{ open: boolean; result: EventOutcome | null }>();
</script>

<style scoped lang="scss">
.chest-result-dialog {
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);

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
