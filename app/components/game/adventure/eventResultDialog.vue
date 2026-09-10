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

            <!-- 行內對話呈現：玩家 stage（adventure-page__stage-fx-anchor）在這個
                 dialog 開啟期間可能被置中的 v-dialog 完全遮蔽（design.md 決策 2/
                 open question 2），沿用同一份 useDialogueBubble 狀態與台詞資料，
                 只是換一個一定看得到的渲染位置，不影響資料層設計。 -->
            <div
                v-if="playerDialogueText"
                class="text-caption text-center font-pixel event-result-dialog__dialogue mb-3"
            >
                「{{ playerDialogueText }}」
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
import { useDialogueBubble } from '../../../composables/useDialogueBubble';

defineProps<{ open: boolean; result: EventOutcome | null }>();

const { bubbles: dialogueBubbles } = useDialogueBubble();
const playerDialogueText = computed(() => dialogueBubbles.get('player')?.text ?? null);
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

    &__dialogue {
        color: rgba(255, 255, 255, 0.75);
    }
}
</style>
