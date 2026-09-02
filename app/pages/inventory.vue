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
                            <span
                                v-if="itemById(character?.equipment[slot])"
                                class="pixel-slot__rarity font-pixel"
                                :style="{ background: RARITY_COLOR[itemById(character?.equipment[slot])!.rarity] }"
                            >
                                {{ itemById(character?.equipment[slot])!.rarity }}
                            </span>
                            <GamePixelIcon
                                :name="slotIcon(slot)"
                                :size="30"
                            />
                            <span
                                v-if="slotValue(slot)"
                                class="pixel-slot__value pixel-slot__value--equip font-pixel"
                                :style="{ color: slotValueColor(slot) }"
                            >
                                {{ slotValue(slot) }}
                            </span>
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
                    <span
                        class="pixel-slot__rarity font-pixel"
                        :style="{ background: RARITY_COLOR[item.rarity] }"
                    >
                        {{ item.rarity }}
                    </span>
                    <GamePixelIcon
                        :name="resolvePixelIcon(item)"
                        :size="32"
                    />
                    <span
                        v-if="primaryStatValue(item)"
                        class="pixel-slot__value font-pixel"
                        :style="{ color: RARITY_COLOR[item.rarity] }"
                    >
                        {{ primaryStatValue(item) }}
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
        <GameItemDetailDialog ref="itemDetailDialogRef" />
    </div>
</template>

<script setup lang="ts">
import type { EquipmentSlot } from '../../shared/types/common';
import {
    EQUIP_SLOTS_ALL, SLOT_PIXEL_ICON, SLOT_LABEL, RARITY_COLOR, RARITY_ORDER_DESC,
    resolvePixelIcon, primaryStatValue, primaryStatMagnitude,
    equippedStatValue, equippedStatColor, type ItemLike,
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
    character, loading: characterLoading, error: characterError, fetchCharacter,
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

// Second-level grouping when both types are shown together (filter === 'ALL')
const TYPE_ORDER: string[] = ['EQUIPMENT', 'POTION'];

const sortedItems = computed(() => {
    const filtered = filter.value === 'ALL'
        ? items.value
        : items.value.filter(item => item.type === filter.value);

    return [...filtered].sort((a, b) => {
        const rarityDiff = RARITY_ORDER_DESC.indexOf(a.rarity) - RARITY_ORDER_DESC.indexOf(b.rarity);
        if (rarityDiff) return rarityDiff;

        const typeDiff = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
        if (typeDiff) return typeDiff;

        return primaryStatMagnitude(b) - primaryStatMagnitude(a);
    });
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

const slotValue = (slot: EquipmentSlot) => equippedStatValue(itemById(character.value?.equipment[slot]));
const slotValueColor = (slot: EquipmentSlot) => equippedStatColor(itemById(character.value?.equipment[slot]));

const isEquipped = (item: { itemId: string }) => (
    Object.values(character.value?.equipment ?? {}).includes(item.itemId)
);

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type ItemDetailDialog = { open: (item: ItemLike & { itemId: string; sellPriceGold: number }) => void };
const itemDetailDialogRef = ref<ItemDetailDialog | null>(null);

const openDetail = (item: ItemLike & { itemId: string; sellPriceGold: number }) => {
    itemDetailDialogRef.value?.open(item);
};

const openSlotDetail = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    if (item) {
        openDetail(item);
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
    gap: 10px;
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

    &__value {
        font-size: 9px;

        &--equip {
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            padding: 0 3px;
            line-height: 1.3;
            background: #14171c;
            white-space: nowrap;
        }
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
