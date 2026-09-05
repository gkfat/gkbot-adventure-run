<template>
    <div class="fill-height shop-page pa-3">
        <!-- 分頁：金幣商店 / 寶石商店 -->
        <div class="d-flex ga-2 mb-3">
            <SystemBtn
                v-for="option in TAB_OPTIONS"
                :key="option.key"
                :variant="activeTab === option.key ? 'flat' : 'outlined'"
                :color="activeTab === option.key ? 'primary' : undefined"
                class="text-none flex-grow-0"
                size="small"
                @click="activeTab = option.key"
            >
                {{ option.label }}
            </SystemBtn>
        </div>

        <!-- 讀取中 -->
        <div
            v-if="loading && !loaded"
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
                載入商店中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="currentError"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ currentError }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none flex-grow-0"
                prepend-icon="mdi-refresh"
                @click="loadCurrent"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 商品分層：裝備 / 道具 -->
        <div v-else>
            <div
                v-for="tier in tiers"
                :key="tier.key"
                class="shop-page__tier"
            >
                <div class="shop-page__tier-label font-pixel text-caption">
                    {{ tier.label }}
                </div>
                <v-row dense>
                    <v-col
                        v-for="slot in tier.items"
                        :key="slot.slotId"
                        cols="4"
                    >
                        <button
                            type="button"
                            class="pixel-slot pixel-slot--item pixel-press d-flex flex-column align-center justify-center"
                            :class="{ 'pixel-slot--sold': slot.sold }"
                            :style="{ borderColor: RARITY_COLOR[slot.item.rarity] }"
                            :disabled="slot.sold"
                            @click="openPurchase(slot)"
                        >
                            <span
                                class="pixel-slot__rarity font-pixel"
                                :style="{ background: RARITY_COLOR[slot.item.rarity] }"
                            >
                                {{ slot.item.rarity }}
                            </span>
                            <GameCommonPixelIcon
                                :name="resolvePixelIcon(slot.item)"
                                :size="32"
                            />
                            <span class="shop-page__name text-caption">
                                {{ slot.item.name }}
                            </span>
                            <span
                                v-if="primaryStatValue(slot.item)"
                                class="shop-page__stat font-pixel"
                                :style="{ color: RARITY_COLOR[slot.item.rarity] }"
                            >
                                {{ primaryStatValue(slot.item) }}
                            </span>
                            <span class="shop-page__price font-pixel d-flex align-center">
                                <GameCommonCurrencyIcon
                                    :type="activeTab"
                                    :size="10"
                                />
                                {{ activeTab === 'GOLD' ? slot.priceGold : slot.priceGems }}
                            </span>

                            <div
                                v-if="slot.sold"
                                class="pixel-slot__sold-badge font-pixel text-caption d-flex align-center justify-center"
                            >
                                已售出
                            </div>
                        </button>
                    </v-col>
                </v-row>
            </div>
        </div>

        <!-- 購買 dialog -->
        <GameCommonShopPurchaseDialog
            ref="purchaseDialogRef"
            :shop-type="activeTab"
        />
    </div>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, RARITY_ORDER_DESC, resolvePixelIcon, primaryStatValue, primaryStatMagnitude,
} from '../utils/equipmentDisplay';
import { ItemType } from '../../shared/types/item';
import type { ShopSlot, ShopType } from '../composables/useShop';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '商店',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 商店頁面' }],
});

const TAB_OPTIONS: { key: ShopType; label: string }[] = [
    { key: 'GOLD', label: '金幣商店' },
    { key: 'GEMS', label: '寶石商店' },
];

const activeTab = ref<ShopType>('GOLD');

const {
    goldItems, gemsItems,
    goldLoading, gemsLoading,
    goldLoaded, gemsLoaded,
    goldError, gemsError,
    fetchGoldShop, fetchGemsShop,
} = useShop();

// 稀有度高到低，同稀有度時主要能力值高到低
const sortByRarityThenStat = (items: ShopSlot[]) => [...items].sort((a, b) => {
    const rarityDiff = RARITY_ORDER_DESC.indexOf(a.item.rarity) - RARITY_ORDER_DESC.indexOf(b.item.rarity);
    if (rarityDiff !== 0) return rarityDiff;
    return primaryStatMagnitude(b.item) - primaryStatMagnitude(a.item);
});

const currentItems = computed(() => (activeTab.value === 'GOLD' ? goldItems.value : gemsItems.value));

const tiers = computed(() => [
    {
        key: 'EQUIPMENT',
        label: '裝備',
        items: sortByRarityThenStat(currentItems.value.filter(slot => slot.item.type === ItemType.EQUIPMENT)),
    },
    {
        key: 'POTION',
        label: '道具',
        items: sortByRarityThenStat(currentItems.value.filter(slot => slot.item.type === ItemType.POTION)),
    },
]);
const loading = computed(() => (activeTab.value === 'GOLD' ? goldLoading.value : gemsLoading.value));
const loaded = computed(() => (activeTab.value === 'GOLD' ? goldLoaded.value : gemsLoaded.value));
const currentError = computed(() => (activeTab.value === 'GOLD' ? goldError.value : gemsError.value));

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type PurchaseDialog = { open: (slot: ShopSlot) => void };
const purchaseDialogRef = ref<PurchaseDialog | null>(null);

const openPurchase = (slot: ShopSlot) => {
    if (slot.sold) return;
    purchaseDialogRef.value?.open(slot);
};

const loadCurrent = () => {
    if (activeTab.value === 'GOLD') {
        if (!goldLoaded.value) fetchGoldShop();
    } else if (!gemsLoaded.value) {
        fetchGemsShop();
    }
};

watch(activeTab, loadCurrent);
onMounted(loadCurrent);
</script>

<style scoped lang="scss">
.shop-page {
    width: 100%;
    overflow-y: auto;

    &__tier {
        margin-bottom: 16px;
    }

    &__tier-label {
        margin-bottom: 6px;
        font-size: 11px;
        color: rgb(var(--v-theme-secondary));
        opacity: 0.85;
    }

    &__name {
        max-width: 100%;
        padding: 0 4px;
        font-size: 10px;
        line-height: 1.2;
        text-align: center;
        color: rgb(var(--v-theme-primary));
    }

    &__stat {
        font-size: 9px;
    }

    &__price {
        gap: 2px;
        font-size: 9px;
        color: rgb(var(--v-theme-secondary));
    }
}

.pixel-slot {
    position: relative;
    gap: 3px;
    width: 100%;
    min-width: 0;
    padding: 8px 2px 6px;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 3px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    cursor: pointer;
    box-shadow:
        inset 2px 2px 0 rgba(255, 255, 255, 0.06),
        inset -2px -2px 0 rgba(0, 0, 0, 0.55);
    transition: transform 0.06s ease-out;

    &:hover:not(:disabled) {
        transform: translateY(-1px);
    }

    &:focus-visible {
        outline: 2px solid rgb(var(--v-theme-primary));
        outline-offset: 2px;
    }

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

    &--sold {
        cursor: default;
        opacity: 0.4;
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

    &__sold-badge {
        position: absolute;
        inset: 0;
        font-size: 10px;
        background: rgba(0, 0, 0, 0.55);
        color: rgb(var(--v-theme-secondary));
    }
}
</style>
