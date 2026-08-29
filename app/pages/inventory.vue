<template>
    <div class="fill-height inventory-page pa-3">
        <!-- 讀取中 -->
        <div
            v-if="(characterLoading && !character) || (inventoryLoading && !inventoryLoaded)"
            class="d-flex flex-column align-center justify-center fill-height"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="56"
                :width="5"
                class="mb-4"
            />
            <div class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary)); opacity: 0.8;">
                載入背包中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="characterError || inventoryError"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ characterError || inventoryError }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none flex-grow-0"
                prepend-icon="mdi-refresh"
                @click="loadAll"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 背包內容 -->
        <template v-else>
            <!-- 頂部：目前裝備總覽 -->
            <div class="inventory-page__box mb-3">
                <div class="text-caption text-medium-emphasis mb-2">目前裝備</div>
                <div class="inventory-page__equip-row">
                    <div
                        v-for="slot in EQUIP_SLOTS_ALL"
                        :key="slot"
                        class="equip-slot-wrap"
                    >
                        <button
                            type="button"
                            class="pixel-slot pixel-slot--equip pixel-press"
                            :style="slotStyle(slot)"
                            :aria-label="slotLabel(slot)"
                            @click="openSlotDetail(slot)"
                        >
                            <GamePixelIcon
                                :name="slotIcon(slot)"
                                :size="30"
                            />
                        </button>
                        <span class="equip-slot-wrap__label text-caption text-medium-emphasis">
                            {{ SLOT_LABEL[slot] }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- 篩選 -->
            <div class="d-flex ga-2 mb-3">
                <SystemBtn
                    v-for="option in FILTER_OPTIONS"
                    :key="option.key"
                    :variant="filter === option.key ? 'flat' : 'outlined'"
                    :color="filter === option.key ? 'primary' : undefined"
                    class="text-none flex-grow-0"
                    size="small"
                    @click="filter = option.key"
                >
                    {{ option.label }}
                </SystemBtn>
            </div>

            <!-- 格狀背包，一列 6 格，依稀有度由高到低排序 -->
            <div
                v-if="sortedItems.length > 0"
                class="inventory-page__grid"
            >
                <button
                    v-for="item in sortedItems"
                    :key="item.itemId"
                    type="button"
                    class="pixel-slot pixel-slot--item pixel-press"
                    :class="{ 'pixel-slot--equipped': isEquipped(item) }"
                    :style="{ borderColor: RARITY_COLOR[item.rarity] }"
                    @click="openDetail(item)"
                >
                    <GamePixelIcon
                        :name="resolvePixelIcon(item)"
                        :size="32"
                    />
                    <span
                        class="pixel-slot__rarity font-pixel"
                        :style="{ color: RARITY_COLOR[item.rarity] }"
                    >
                        {{ item.rarity }}
                    </span>

                    <div
                        v-if="isEquipped(item)"
                        class="pixel-slot__badge"
                        aria-label="裝備中"
                    >
                        <v-icon
                            icon="mdi-check-bold"
                            size="10"
                        />
                    </div>
                </button>
            </div>
            <div
                v-else
                class="text-center text-body-2 text-medium-emphasis mt-6"
            >
                這個分類目前沒有物品
            </div>
        </template>

        <!-- 物品詳情 dialog -->
        <v-dialog
            v-model="detailOpen"
            max-width="300"
        >
            <div
                v-if="detailItem"
                class="item-detail pa-4"
            >
                <div class="d-flex align-center ga-3 mb-3">
                    <div
                        class="pixel-slot pixel-slot--item pixel-slot--detail"
                        :style="{ borderColor: RARITY_COLOR[detailItem.rarity] }"
                    >
                        <GamePixelIcon
                            :name="resolvePixelIcon(detailItem)"
                            :size="40"
                        />
                    </div>
                    <div>
                        <div
                            class="font-pixel text-subtitle-1"
                            :style="{ color: RARITY_COLOR[detailItem.rarity] }"
                        >
                            {{ detailInfo?.name }}
                        </div>
                        <div class="text-caption text-medium-emphasis mb-1">
                            稀有度 {{ detailItem.rarity }}
                        </div>
                        <div class="text-body-2">
                            {{ detailInfo?.effectText }}
                        </div>
                    </div>
                </div>

                <p class="text-body-2 text-medium-emphasis mb-3">
                    {{ detailInfo?.flavor }}
                </p>

                <div
                    v-if="isEquipped(detailItem)"
                    class="item-detail__equipped-tag text-caption font-pixel mb-3"
                >
                    <v-icon
                        icon="mdi-check-bold"
                        size="12"
                        class="mr-1"
                    />
                    裝備中
                </div>

                <div
                    v-if="equipActionError"
                    class="text-body-2 mb-3"
                    style="color: rgb(var(--v-theme-warning));"
                >
                    {{ equipActionError }}
                </div>

                <SystemBtn
                    v-if="detailItem.type === 'EQUIPMENT'"
                    block
                    variant="flat"
                    :color="isEquipped(detailItem) ? 'warning' : 'primary'"
                    class="text-none mb-2"
                    :loading="equipActionLoading"
                    @click="isEquipped(detailItem) ? handleUnequip(detailItem) : handleEquip(detailItem)"
                >
                    {{ isEquipped(detailItem) ? '卸下' : '裝備' }}
                </SystemBtn>

                <SystemBtn
                    block
                    variant="outlined"
                    color="primary"
                    class="text-none"
                    @click="detailOpen = false"
                >
                    關閉
                </SystemBtn>
            </div>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import type { EquipmentSlot } from '../../shared/types/common';
import {
    EQUIP_SLOTS_ALL, SLOT_PIXEL_ICON, SLOT_LABEL, RARITY_COLOR, RARITY_ORDER_DESC,
    resolvePixelIcon, describeItem, pickTargetSlot, type ItemLike,
} from '../utils/equipmentDisplay';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '背包',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 背包頁面' }],
});

const {
    character, loading: characterLoading, error: characterError, fetchCharacter, equipItem, unequipItem,
} = useCharacter();
const {
    items, loading: inventoryLoading, loaded: inventoryLoaded, error: inventoryError, itemById, fetchInventory,
} = useInventory();

type FilterKey = 'ALL' | 'EQUIPMENT' | 'POTION';

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: '全部' },
    { key: 'EQUIPMENT', label: '裝備' },
    { key: 'POTION', label: '道具' },
];

const filter = ref<FilterKey>('ALL');

const sortedItems = computed(() => {
    const filtered = filter.value === 'ALL'
        ? items.value
        : items.value.filter(item => item.type === filter.value);

    return [...filtered].sort(
        (a, b) => RARITY_ORDER_DESC.indexOf(a.rarity) - RARITY_ORDER_DESC.indexOf(b.rarity),
    );
});

const slotLabel = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    return item ? `${SLOT_LABEL[slot]}：已裝備（${item.rarity}）` : `${SLOT_LABEL[slot]}：空`;
};

const slotStyle = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    if (!item) {
        return { borderColor: 'rgba(196, 203, 219, 0.25)', opacity: 0.5 };
    }
    return { borderColor: RARITY_COLOR[item.rarity], opacity: 1 };
};

// Show the equipped item's own picture when the slot is filled, otherwise
// the generic placeholder for that slot.
const slotIcon = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    return item ? resolvePixelIcon(item) : SLOT_PIXEL_ICON[slot];
};

const isEquipped = (item: { itemId: string }) => (
    Object.values(character.value?.equipment ?? {}).includes(item.itemId)
);

const detailOpen = ref(false);
const detailItem = ref<ItemLike & { itemId: string } | null>(null);
const detailInfo = computed(() => (detailItem.value ? describeItem(detailItem.value) : null));

const equipActionLoading = ref(false);
const equipActionError = ref<string | null>(null);

const openDetail = (item: ItemLike & { itemId: string }) => {
    detailItem.value = item;
    equipActionError.value = null;
    detailOpen.value = true;
};

const openSlotDetail = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    if (item) {
        openDetail(item);
    }
};

const findEquippedSlot = (item: { itemId: string }): EquipmentSlot | undefined => {
    const entry = Object.entries(character.value?.equipment ?? {}).find(([, id]) => id === item.itemId);
    return entry?.[0] as EquipmentSlot | undefined;
};

const handleEquip = async (item: ItemLike & { itemId: string }) => {
    equipActionLoading.value = true;
    equipActionError.value = null;

    const slot = pickTargetSlot(item, character.value?.equipment ?? {});
    const success = await equipItem(item.itemId, slot);

    equipActionLoading.value = false;
    if (success) {
        detailOpen.value = false;
    } else {
        equipActionError.value = '裝備失敗，請稍後再試';
    }
};

const handleUnequip = async (item: ItemLike & { itemId: string }) => {
    const slot = findEquippedSlot(item);
    if (!slot) return;

    equipActionLoading.value = true;
    equipActionError.value = null;

    const success = await unequipItem(slot);

    equipActionLoading.value = false;
    if (success) {
        detailOpen.value = false;
    } else {
        equipActionError.value = '卸下失敗，請稍後再試';
    }
};

const loadAll = () => {
    fetchCharacter();
    fetchInventory();
};

onMounted(() => {
    if (!character.value) fetchCharacter();
    if (!inventoryLoaded.value) fetchInventory();
});
</script>

<style scoped lang="scss">
.inventory-page {
    width: 100%;
    overflow-y: auto;

    &__box {
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }

    &__equip-row {
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        gap: 4px;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
    }
}

.equip-slot-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;

    &__label {
        font-size: 10px;
        line-height: 1;
        white-space: nowrap;
    }
}

// Shared "pixel cabinet slot" look: a beveled dark cell with retro corner
// brackets, used for both the equipped-gear overview and the item grid.
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
        width: 48px;
        height: 48px;
        padding: 0;
        cursor: pointer;
        transition: transform 0.06s ease-out;

        &:hover {
            transform: translateY(-1px);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &--item {
        flex-direction: column;
        gap: 2px;
        aspect-ratio: 1;
        width: 100%;
        padding: 0;
        cursor: pointer;
        transition: transform 0.06s ease-out;

        &:hover {
            transform: translateY(-1px);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &--equipped {
        &::before,
        &::after {
            border-color: rgb(var(--v-theme-green));
            opacity: 1;
        }
    }

    &--detail {
        width: 64px;
        height: 64px;
        flex: 0 0 auto;
    }

    &__rarity {
        font-size: 9px;
    }

    &__badge {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(var(--v-theme-green));
        color: rgb(var(--v-theme-background));
        border: 2px solid rgb(var(--v-theme-background));
    }
}

.item-detail {
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);

    &__equipped-tag {
        display: inline-flex;
        align-items: center;
        color: rgb(var(--v-theme-green));
    }
}
</style>
