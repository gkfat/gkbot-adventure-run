<template>
    <button
        type="button"
        class="pixel-slot pixel-slot--item pixel-press d-flex flex-column align-center justify-center"
        :class="{ 'pixel-slot--sold': shopSlot.sold }"
        :style="{ borderColor: RARITY_COLOR[shopSlot.item.rarity] }"
        :disabled="shopSlot.sold"
        @click="handleClick"
    >
        <span
            class="pixel-slot__rarity font-pixel"
            :style="{ background: RARITY_COLOR[shopSlot.item.rarity] }"
        >
            {{ shopSlot.item.rarity }}
        </span>
        <GameCommonPixelIcon
            :name="resolvePixelIcon(shopSlot.item)"
            :size="32"
        />
        <span class="shop-item-slot__name text-caption">
            {{ shopSlot.item.name }}
        </span>
        <!-- 固定保留一行高度，即使沒有主屬性也不留空，讓同一列的卡片維持等高 -->
        <span
            class="shop-item-slot__stat font-pixel"
            :style="{ color: RARITY_COLOR[shopSlot.item.rarity] }"
        >
            {{ primaryStatValue(shopSlot.item) || '-' }}
        </span>
        <div class="shop-item-slot__divider" />
        <span class="shop-item-slot__price font-pixel d-flex align-center">
            <GameCommonCurrencyIcon
                :type="shopSlot.currency"
                :size="10"
            />
            {{ shopSlot.price }}
        </span>

        <div
            v-if="shopSlot.sold"
            class="pixel-slot__sold-badge font-pixel text-caption d-flex align-center justify-center"
        >
            已售出
        </div>
    </button>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, resolvePixelIcon, primaryStatValue,
} from '../../../utils/equipmentDisplay';
import type { ShopSlot } from '../../../composables/useShop';

// prop 不能取名 `slot`：Vue 模板編譯器仍會把它當成舊版內容分發語法的保留字，
// 編譯時會被靜默丟棄（不會報錯），子元件永遠收不到值。
const props = defineProps<{ shopSlot: ShopSlot }>();
const emit = defineEmits<{ select: [slot: ShopSlot] }>();

const handleClick = () => {
    if (props.shopSlot.sold) return;
    emit('select', props.shopSlot);
};
</script>

<style scoped lang="scss">
.pixel-slot {
    position: relative;
    gap: 3px;
    width: 100%;
    height: 100%;
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

.shop-item-slot {
    &__name {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        max-width: 100%;
        padding: 0 4px;
        font-size: 10px;
        line-height: 1.2;
        text-align: center;
        color: rgb(var(--v-theme-primary));
    }

    &__stat {
        min-height: 11px;
        font-size: 9px;
    }

    &__divider {
        width: 70%;
        height: 1px;
        margin: 3px 0;
        background: rgba(196, 203, 219, 0.2);
    }

    &__price {
        gap: 2px;
        font-size: 9px;
        color: rgb(var(--v-theme-secondary));
    }
}
</style>
