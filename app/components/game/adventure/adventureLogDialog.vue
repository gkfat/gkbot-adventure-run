<template>
    <GameCommonDialogFrame
        :model-value="modelValue"
        max-width="420"
        content-class="adventure-log-dialog"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <div class="d-flex align-center justify-space-between mb-3">
            <span class="font-pixel text-subtitle-2" style="color: rgb(var(--v-theme-green));">
                冒險記事本
            </span>
            <v-icon
                icon="mdi-close"
                size="20"
                class="pixel-press"
                @click="$emit('update:modelValue', false)"
            />
        </div>

        <div
            v-if="entries.length === 0"
            class="text-caption text-medium-emphasis text-center py-4"
        >
            目前還沒有任何紀錄
        </div>

        <div
            v-else
            class="adventure-log-dialog__list"
        >
            <div
                v-for="entry in entries"
                :key="entry.seq"
                class="adventure-log-dialog__entry"
            >
                <template v-if="entry.kind === 'COMBAT'">
                    <div
                        class="text-caption font-pixel mb-1"
                        :style="{ color: entry.data.summary.victory ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
                    >
                        戰鬥{{ entry.data.summary.victory ? '勝利' : '失敗' }}（回合 {{ entry.data.summary.roundCount }}）
                    </div>
                    <div
                        v-for="(log, index) in entry.data.combatLog"
                        :key="index"
                        class="text-caption text-medium-emphasis"
                    >
                        {{ describeCombatLogEntry(log, entry.data.summary.enemies) }}
                    </div>
                </template>

                <template v-else-if="entry.kind === 'EVENT'">
                    <div class="text-caption font-pixel mb-1" style="color: rgb(var(--v-theme-primary));">
                        事件
                    </div>
                    <div class="text-caption text-medium-emphasis">
                        {{ entry.data.description }}
                    </div>
                    <div class="d-flex flex-wrap ga-3 text-caption text-medium-emphasis mt-1">
                        <span v-if="entry.data.hpHealed">HP +{{ entry.data.hpHealed }}</span>
                        <span v-if="entry.data.goldGained">金幣 +{{ entry.data.goldGained }}</span>
                        <span v-if="entry.data.gemsGained">寶石 +{{ entry.data.gemsGained }}</span>
                        <span v-if="entry.data.blessingGranted">獲得一個祝福</span>
                        <span v-if="entry.data.curseApplied">遭受一個詛咒</span>
                    </div>
                    <div
                        v-if="entry.data.itemsGained?.length"
                        class="d-flex flex-column ga-2 mt-1"
                    >
                        <GameCommonItemRewardChip
                            v-for="gainedItem in entry.data.itemsGained"
                            :key="gainedItem.itemId"
                            :item="gainedItem"
                        />
                    </div>
                </template>

                <template v-else-if="entry.kind === 'HEAL'">
                    <div class="text-caption text-medium-emphasis">
                        使用藥水，回復 {{ entry.hpHealed }} 點生命值
                    </div>
                </template>

                <template v-else-if="entry.kind === 'BLESSING'">
                    <div class="text-caption text-medium-emphasis">
                        獲得祝福：{{ entry.name }}（{{ entry.description }}）
                    </div>
                </template>
            </div>
        </div>

        <SystemBtn
            block
            variant="outlined"
            color="primary"
            class="text-none mt-3"
            @click="$emit('update:modelValue', false)"
        >
            關閉
        </SystemBtn>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import type { RunLogEntry } from '../../../composables/useAdventureRun';
import { describeCombatLogEntry } from '../../../utils/combatLogDisplay';

defineProps<{ modelValue: boolean; entries: RunLogEntry[] }>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped lang="scss">
.adventure-log-dialog {
    max-height: 80vh;
    display: flex;
    flex-direction: column;

    &__list {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    &__entry {
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(196, 203, 219, 0.1);

        &:last-child {
            border-bottom: none;
        }
    }
}
</style>
