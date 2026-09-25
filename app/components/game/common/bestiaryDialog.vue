<template>
    <GameCommonDialogFrame
        :model-value="modelValue"
        fullscreen
        content-class="bestiary-dialog d-flex flex-column"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <div class="font-pixel text-h6 mb-3" style="color: rgb(var(--v-theme-primary)); opacity: 0.85;">
            圖鑑
        </div>

        <!-- 上半部：目前選取敵人的大方框 -->
        <div class="bestiary-dialog__preview d-flex flex-column align-center text-center flex-grow-0">
            <div class="bestiary-dialog__preview-avatar d-flex align-center justify-center">
                <img
                    v-if="selected?.encountered"
                    :src="selected.portraitUrl"
                    :alt="selected.name"
                    class="bestiary-dialog__preview-img"
                >
                <v-icon
                    v-else
                    :icon="UNKNOWN_ENEMY_ICON"
                    size="56"
                    color="primary"
                />
            </div>
            <span
                v-if="selected?.encountered && selected.tier"
                class="bestiary-dialog__tier mt-2"
                :class="`bestiary-dialog__tier--${selected.tier}`"
            >
                {{ tierLabel(selected.tier) }}
            </span>
            <div class="text-subtitle-1 font-weight-medium mt-2">
                {{ selected?.encountered ? selected.name : UNKNOWN_ENEMY_NAME }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
                {{ selected?.encountered ? selected.description : UNKNOWN_ENEMY_DESCRIPTION }}
            </div>
            <div
                v-if="selected?.encountered"
                class="text-caption text-medium-emphasis mt-2"
            >
                已擊敗 {{ selected.defeatedCount ?? 0 }} 隻
            </div>
        </div>

        <!-- 下半部：可捲動的敵人格狀清單，一列 5 個 -->
        <div class="bestiary-dialog__grid-scroll flex-grow-1">
            <v-row dense>
                <v-col
                    v-for="entry in archetypes"
                    :key="entry.slug"
                    cols="3"
                >
                    <button
                        type="button"
                        class="bestiary-dialog__cell d-flex align-center justify-center"
                        :class="{ 'bestiary-dialog__cell--active': entry.slug === selectedSlug }"
                        @click="selectedSlug = entry.slug"
                    >
                        <img
                            v-if="entry.encountered"
                            :src="entry.portraitUrl"
                            :alt="entry.name"
                            class="bestiary-dialog__cell-img"
                        >
                        <v-icon
                            v-else
                            :icon="UNKNOWN_ENEMY_ICON"
                            size="18"
                            color="primary"
                        />
                        <span
                            v-if="entry.encountered && entry.tier"
                            class="bestiary-dialog__cell-tier"
                            :class="`bestiary-dialog__cell-tier--${entry.tier}`"
                        >
                            {{ tierLabel(entry.tier) }}
                        </span>
                    </button>
                </v-col>
            </v-row>
        </div>

        <SystemBtn
            block
            variant="outlined"
            color="primary"
            class="text-none mt-3 flex-grow-0"
            @click="emit('update:modelValue', false)"
        >
            關閉
        </SystemBtn>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import type { GetBestiaryResponse, BestiaryEntry } from '../../../../shared/schemas/api/bestiary.schema';
import {
    UNKNOWN_ENEMY_ICON, UNKNOWN_ENEMY_NAME, UNKNOWN_ENEMY_DESCRIPTION,
} from '../../../utils/enemyAvatar';

// boss-tier-enhancements：圖鑑呈現敵人固有位階（小兵／Boss），未遇過的敵人
// 不顯示（tier 只在 entry.encountered 為 true 時由後端回傳，見 bestiary.schema.ts）。
const tierLabel = (tier: 'normal' | 'boss') => (tier === 'boss' ? 'Boss' : '小兵');

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const api = useApi();
const { character } = useCharacter();

const archetypes = ref<BestiaryEntry[]>([]);
const selectedSlug = ref<string | null>(null);
const selected = computed(() => archetypes.value.find(entry => entry.slug === selectedSlug.value) ?? null);

const fetchBestiary = async () => {
    if (!character.value) return;

    const response = await api.get<GetBestiaryResponse>(`/api/character/${character.value.characterId}/bestiary`);
    archetypes.value = response.data.archetypes;
    selectedSlug.value = archetypes.value[0]?.slug ?? null;
};

watch(() => props.modelValue, (open) => {
    if (open) fetchBestiary();
});
</script>

<style scoped lang="scss">
// .bestiary-dialog's own height/min-height live in the unscoped block below —
// this class is passed as GameCommonDialogFrame's content-class prop, so the
// div it lands on belongs to dialogFrame.vue's template, not this component's;
// a scoped selector here would never carry this SFC's data-v attribute and
// therefore never match it. The nested &__x classes below are unaffected —
// their elements ARE defined in this SFC's own <slot> content.
.bestiary-dialog {
    &__preview {
        padding: 16px;
        background: #14171c;
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        margin-bottom: 12px;
    }

    &__preview-avatar {
        width: 96px;
        height: 96px;
        background: rgba(196, 203, 219, 0.04);
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        overflow: hidden;
    }

    &__preview-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
    }

    // boss-tier-enhancements：位階標籤，樣式比照 combatResultPanel.vue 的
    // __tier--boss/__tier--minion 配色慣例。
    &__tier {
        display: inline-block;
        font-size: 10px;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;

        &--boss {
            background: rgba(var(--v-theme-warning), 0.2);
            color: rgb(var(--v-theme-warning));
        }

        &--normal {
            background: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.7);
        }
    }

    &__cell-tier {
        position: absolute;
        bottom: 2px;
        right: 2px;
        font-size: 8px;
        line-height: 1;
        padding: 1px 3px;
        border-radius: 3px;
        font-weight: 700;
        pointer-events: none;

        &--boss {
            background: rgba(var(--v-theme-warning), 0.85);
            color: #0a0c10;
        }

        &--normal {
            background: rgba(0, 0, 0, 0.6);
            color: rgba(255, 255, 255, 0.8);
        }
    }

    &__grid-scroll {
        overflow-y: auto;
        min-height: 0;
    }

    &__cell {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        background: #14171c;
        border: 1px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.08s ease-out;

        &--active {
            border-color: rgb(var(--v-theme-primary));
        }
    }

    &__cell-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
    }
}
</style>

<style lang="scss">
// Unscoped counterpart to the block above — see the comment there.
.bestiary-dialog {
    height: 100%;
    min-height: 0;
}
</style>
