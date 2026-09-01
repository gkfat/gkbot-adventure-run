<template>
    <v-dialog
        v-model="open"
        max-width="320"
    >
        <div class="delete-character pa-4">
            <div
                v-if="loading"
                class="d-flex flex-column align-center justify-center py-6"
            >
                <v-progress-circular
                    indeterminate
                    color="green"
                    :size="40"
                    :width="4"
                />
            </div>

            <div
                v-else-if="loadError"
                class="text-body-2 text-center py-4"
                style="color: rgb(var(--v-theme-warning));"
            >
                {{ loadError }}
            </div>

            <template v-else-if="detail">
                <div class="font-pixel text-subtitle-1 mb-3" style="color: rgb(var(--v-theme-warning));">
                    確認刪除角色？
                </div>

                <div class="d-flex align-center ga-3 mb-3">
                    <img
                        :src="detail.spriteUrl"
                        :alt="detail.className"
                        width="40"
                        height="40"
                        class="delete-character__sprite"
                    >
                    <div>
                        <div class="d-flex align-center ga-2">
                            <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                                LV {{ detail.level }}
                            </span>
                            <span class="text-caption text-medium-emphasis">{{ detail.className }}</span>
                        </div>
                        <div class="text-body-2">{{ detail.nickname }}</div>
                    </div>
                </div>

                <div class="text-caption text-medium-emphasis mb-1">屬性</div>
                <div class="delete-character__attrs mb-3">
                    <span
                        v-for="attr in attrList"
                        :key="attr.label"
                        class="text-caption"
                    >
                        {{ attr.label }} {{ attr.value }}
                    </span>
                </div>

                <div class="text-caption text-medium-emphasis mb-1">經濟</div>
                <div class="d-flex align-center ga-4 mb-3">
                    <div class="d-flex align-center ga-1">
                        <v-icon
                            icon="mdi-circle-multiple"
                            size="12"
                            style="color: #e0c063;"
                        />
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-secondary));">
                            {{ detail.gold }}
                        </span>
                    </div>
                    <div class="d-flex align-center ga-1">
                        <v-icon
                            icon="mdi-diamond-stone"
                            size="12"
                            color="primary"
                        />
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                            {{ detail.gems }}
                        </span>
                    </div>
                </div>

                <div class="text-caption text-medium-emphasis mb-1">裝備</div>
                <div
                    v-if="equippedItems.length > 0"
                    class="delete-character__equip-row mb-3"
                >
                    <div
                        v-for="item in equippedItems"
                        :key="item.itemId"
                        class="pixel-slot pixel-slot--equip"
                        :style="{ borderColor: RARITY_COLOR[item.rarity] }"
                    >
                        <span
                            class="pixel-slot__rarity font-pixel"
                            :style="{ background: RARITY_COLOR[item.rarity] }"
                        >
                            {{ item.rarity }}
                        </span>
                        <GamePixelIcon
                            :name="resolvePixelIcon(item)"
                            :size="26"
                        />
                    </div>
                </div>
                <div
                    v-else
                    class="text-caption text-medium-emphasis mb-3"
                >
                    未裝備任何物品
                </div>

                <div class="text-caption text-medium-emphasis mb-1">冒險進度</div>
                <div class="text-body-2 mb-4">
                    第 {{ detail.nextChapterIndex + 1 }} 章 · 關卡 {{ detail.currentLevelIndex + 1 }}/{{ detail.chapterTotalLevels }}
                </div>

                <div class="text-body-2 text-medium-emphasis mb-4">
                    刪除後角色的冒險紀錄與背包將一併移除，且無法復原。
                </div>

                <div
                    v-if="deleteError"
                    class="text-body-2 mb-3"
                    style="color: rgb(var(--v-theme-warning));"
                >
                    {{ deleteError }}
                </div>

                <SystemBtn
                    block
                    variant="flat"
                    color="warning"
                    class="text-none mb-2"
                    :loading="deleting"
                    @click="handleDelete"
                >
                    確認刪除
                </SystemBtn>
                <SystemBtn
                    block
                    variant="outlined"
                    color="primary"
                    class="text-none"
                    :disabled="deleting"
                    @click="open = false"
                >
                    取消
                </SystemBtn>
            </template>
        </div>
    </v-dialog>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, resolvePixelIcon, type ItemLike,
} from '../../utils/equipmentDisplay';
import type { EquipmentSlot } from '../../../shared/types/common';

type CharacterDetail = {
    characterId: string;
    className: string;
    level: number;
    gold: number;
    gems: number;
    attributes: { STR: number; AGI: number; CON: number; LUCK: number };
    equipment: Partial<Record<EquipmentSlot, string>>;
    nickname: string;
    spriteUrl: string;
    nextChapterIndex: number;
    currentLevelIndex: number;
    chapterTotalLevels: number;
};

type EquippedItem = ItemLike & { itemId: string };

const emit = defineEmits<{ deleted: [characterId: string] }>();

const api = useApi();
const { deleteCharacter } = useCharacter();

const open = ref(false);
const loading = ref(false);
const loadError = ref<string | null>(null);
const deleting = ref(false);
const deleteError = ref<string | null>(null);

const detail = ref<CharacterDetail | null>(null);
const equippedItems = ref<EquippedItem[]>([]);

const attrList = computed(() => (detail.value ? [
    { label: '力量', value: detail.value.attributes.STR },
    { label: '敏捷', value: detail.value.attributes.AGI },
    { label: '體質', value: detail.value.attributes.CON },
    { label: '幸運', value: detail.value.attributes.LUCK },
] : []));

const load = async (characterId: string) => {
    loading.value = true;
    loadError.value = null;
    detail.value = null;
    equippedItems.value = [];

    try {
        const [characterRes, inventoryRes] = await Promise.all([
            api.get<{ success: boolean; data: CharacterDetail }>(`/api/character/${characterId}`),
            api.get<{ success: boolean; data: { items: EquippedItem[] } }>(`/api/character/${characterId}/inventory`),
        ]);

        detail.value = characterRes.data;

        const equippedIds = new Set(Object.values(characterRes.data.equipment).filter(Boolean));
        equippedItems.value = inventoryRes.data.items.filter(item => equippedIds.has(item.itemId));
    } catch (err: unknown) {
        console.error('[GameDeleteCharacterDialog] Failed to load character detail:', err);
        loadError.value = err instanceof Error ? err.message : '無法取得角色資料';
    } finally {
        loading.value = false;
    }
};

const handleDelete = async () => {
    if (!detail.value) return;

    deleting.value = true;
    deleteError.value = null;

    const characterId = detail.value.characterId;
    const success = await deleteCharacter(characterId);

    deleting.value = false;
    if (success) {
        open.value = false;
        emit('deleted', characterId);
    } else {
        deleteError.value = '刪除失敗，請稍後再試';
    }
};

defineExpose({
    open: (characterId: string) => {
        deleteError.value = null;
        open.value = true;
        load(characterId);
    },
});
</script>

<style scoped lang="scss">
.delete-character {
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);

    &__sprite {
        image-rendering: pixelated;
        flex: 0 0 auto;
    }

    &__attrs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 14px;
    }

    &__equip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
}

.pixel-slot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 3px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    box-shadow:
        inset 2px 2px 0 rgba(255, 255, 255, 0.06),
        inset -2px -2px 0 rgba(0, 0, 0, 0.55);

    &::before,
    &::after {
        content: '';
        position: absolute;
        width: 6px;
        height: 6px;
        pointer-events: none;
        opacity: 0.55;
    }

    &::before {
        top: -2px;
        left: -2px;
        border-top: 2px solid rgb(var(--v-theme-primary));
        border-left: 2px solid rgb(var(--v-theme-primary));
    }

    &::after {
        bottom: -2px;
        right: -2px;
        border-bottom: 2px solid rgb(var(--v-theme-primary));
        border-right: 2px solid rgb(var(--v-theme-primary));
    }

    &--equip {
        width: 40px;
        height: 40px;
        padding: 0;
    }

    &__rarity {
        position: absolute;
        top: -6px;
        left: -6px;
        padding: 0 2px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        border-radius: 2px;
        white-space: nowrap;
    }
}
</style>
