<template>
    <div class="character-stage__box character-stage__summary">
        <div class="character-stage__summary-grid character-stage__summary-grid--no-level">
            <div class="character-stage__summary-col">
                <v-row dense>
                    <v-col
                        v-for="attr in attributeEntries"
                        :key="attr.key"
                        cols="6"
                        class="character-stage__stat d-flex align-center"
                    >
                        <span class="text-caption text-medium-emphasis character-stage__stat-label">{{ attr.label }}</span>
                        <span class="d-flex align-center ga-1">
                            <button
                                v-if="allocating"
                                type="button"
                                class="attr-step-btn pixel-press d-flex align-center justify-center"
                                :disabled="attr.pending <= 0"
                                aria-label="減少"
                                @click="emit('decrement', attr.key)"
                            >
                                −
                            </button>
                            <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                                {{ attr.value }}<span
                                    v-if="attr.pending > 0"
                                    style="color: rgb(var(--v-theme-warning));"
                                >+{{ attr.pending }}</span>
                            </span>
                            <button
                                v-if="allocating"
                                type="button"
                                class="attr-step-btn pixel-press d-flex align-center justify-center"
                                :disabled="remainingPoints <= 0"
                                aria-label="增加"
                                @click="emit('increment', attr.key)"
                            >
                                +
                            </button>
                        </span>
                    </v-col>
                </v-row>
            </div>

            <div class="character-stage__summary-col character-stage__col--divided character-stage__summary-col--points d-flex flex-column align-center">
                <span
                    class="font-pixel text-caption"
                    :style="{ color: remainingPoints > 0 ? 'rgb(var(--v-theme-warning))' : 'rgb(var(--v-theme-primary))' }"
                >
                    +{{ remainingPoints }} 可用屬性點
                </span>
                <SystemBtn
                    v-if="!allocating && unspentAttributePoints > 0"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                    class="text-none mt-1"
                    @click="emit('start-allocating')"
                >
                    分配
                </SystemBtn>
                <div
                    v-else-if="allocating"
                    class="d-flex ga-2 mt-1"
                >
                    <button
                        type="button"
                        class="attr-allocation-btn pixel-press d-flex align-center justify-center"
                        aria-label="儲存"
                        :disabled="totalPending === 0 || savingAllocation"
                        @click="emit('save-allocation')"
                    >
                        <GameCommonPixelIcon name="confirm" :size="18" />
                    </button>
                    <button
                        type="button"
                        class="attr-allocation-btn pixel-press d-flex align-center justify-center"
                        aria-label="取消"
                        :disabled="savingAllocation"
                        @click="emit('cancel-allocating')"
                    >
                        <GameCommonPixelIcon name="cancel" :size="18" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
type AttributeKey = 'STR' | 'AGI' | 'CON' | 'LUCK';

const ATTRIBUTE_META: { key: AttributeKey; label: string }[] = [
    { key: 'STR', label: '力量' },
    { key: 'AGI', label: '敏捷' },
    { key: 'CON', label: '體質' },
    { key: 'LUCK', label: '幸運' },
];

const props = defineProps<{
    attributes: Record<AttributeKey, number>;
    unspentAttributePoints: number;
    allocating: boolean;
    savingAllocation: boolean;
    pendingAllocation: Record<AttributeKey, number>;
    remainingPoints: number;
    totalPending: number;
}>();

const emit = defineEmits<{
    'start-allocating': [];
    'cancel-allocating': [];
    'save-allocation': [];
    'increment': [key: AttributeKey];
    'decrement': [key: AttributeKey];
}>();

const attributeEntries = computed(() => (
    ATTRIBUTE_META.map(({ key, label }) => ({
        key,
        label,
        value: props.attributes[key],
        pending: props.pendingAllocation[key],
    }))
));
</script>

<style scoped lang="scss">
.character-stage__box {
    width: 100%;
    max-width: 280px;
    padding: 10px 12px;
    background: rgba(196, 203, 219, 0.04);
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;
}

.character-stage__summary {
    max-width: none;
    padding: 8px 12px;
}

.character-stage__summary-grid {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    column-gap: 12px;

    &--no-level {
        grid-template-columns: 1fr auto;
    }
}

.character-stage__summary-col {
    min-width: 0;

    &--points {
        gap: 2px;
        white-space: nowrap;
    }
}

.character-stage__col--divided {
    padding-left: 12px;
    border-left: 1px solid rgba(196, 203, 219, 0.12);
}

.character-stage__stat {
    gap: 6px;
    min-width: 0;
}

.character-stage__stat-label {
    white-space: nowrap;
    flex-shrink: 0;
}

.attr-allocation-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid rgba(196, 203, 219, 0.3);
    border-radius: 3px;
    background: rgba(196, 203, 219, 0.06);
    cursor: pointer;

    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
}

.attr-step-btn {
    width: 16px;
    height: 16px;
    padding: 0;
    line-height: 1;
    font-size: 11px;
    border: 1px solid rgba(196, 203, 219, 0.3);
    border-radius: 3px;
    background: rgba(196, 203, 219, 0.06);
    color: rgb(var(--v-theme-primary));
    cursor: pointer;

    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
}
</style>
