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
        <div class="bestiary-dialog__preview">
            <div class="bestiary-dialog__preview-avatar">
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
            <div class="bestiary-dialog__grid">
                <button
                    v-for="entry in archetypes"
                    :key="entry.slug"
                    type="button"
                    class="bestiary-dialog__cell"
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
                </button>
            </div>
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
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 16px;
        background: #14171c;
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        margin-bottom: 12px;
    }

    &__preview-avatar {
        width: 96px;
        height: 96px;
        display: flex;
        align-items: center;
        justify-content: center;
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

    &__grid-scroll {
        overflow-y: auto;
        min-height: 0;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
    }

    &__cell {
        width: 100%;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
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
