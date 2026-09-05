<template>
    <div class="item-detail">
        <div
            v-if="item.type === 'EQUIPMENT' && item.equipSlot"
            class="item-detail__slot-label text-caption text-medium-emphasis font-pixel"
        >
            {{ SLOT_LABEL[item.equipSlot] }}
        </div>

        <div class="d-flex align-center ga-3 mb-3">
            <div
                class="pixel-slot pixel-slot--item pixel-slot--detail d-flex align-center justify-center"
                :style="{ borderColor: RARITY_COLOR[item.rarity] }"
            >
                <span
                    class="pixel-slot__rarity font-pixel"
                    :style="{ background: RARITY_COLOR[item.rarity] }"
                >
                    {{ item.rarity }}
                </span>
                <GameCommonPixelIcon
                    :name="resolvePixelIcon(item)"
                    :size="64"
                />
            </div>
            <div>
                <div
                    class="font-pixel item-detail__title"
                    :style="{ color: RARITY_COLOR[item.rarity] }"
                >
                    {{ name }}
                </div>
                <div
                    v-if="item.weaponWeightClass"
                    class="text-caption text-medium-emphasis"
                >
                    {{ WEIGHT_CLASS_LABEL[item.weaponWeightClass] }}
                </div>
                <div class="text-caption text-medium-emphasis">
                    稀有度 {{ item.rarity }}
                </div>
            </div>
        </div>

        <div
            v-if="effects.length > 0"
            class="item-detail__effects d-flex flex-column mb-3"
        >
            <div
                v-for="effect in effects"
                :key="effect.label"
                class="item-detail__effect-row d-flex align-baseline justify-space-between text-body-2"
            >
                <span>{{ effect.label }}</span>
                <span
                    class="font-pixel"
                    :class="effect.positive ? 'item-detail__effect-value--positive' : 'item-detail__effect-value--negative'"
                >{{ effect.value }}</span>
            </div>
        </div>
        <p
            v-else
            class="text-body-2 text-medium-emphasis mb-3"
        >
            沒有額外效果
        </p>

        <p class="text-body-2 text-medium-emphasis mb-3">
            {{ flavor }}
        </p>
    </div>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, SLOT_LABEL, WEIGHT_CLASS_LABEL, resolvePixelIcon, type ItemLike,
} from '../../../utils/equipmentDisplay';

defineProps<{
    item: ItemLike;
    name: string;
    effects: { label: string; value: string; positive: boolean }[];
    flavor: string;
}>();
</script>

<style scoped lang="scss">
.pixel-slot {
    position: relative;
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

    &--detail {
        width: 88px;
        height: 88px;
        flex: 0 0 auto;
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

.item-detail {
    position: relative;

    &__slot-label {
        position: absolute;
        top: 16px;
        right: 16px;
    }

    // 品名可能混雜英數字（走 font-pixel，字元較寬），縮小字級並保留右側空間，
    // 避免與 __slot-label 重疊
    &__title {
        padding-right: 48px;
        font-size: 0.85rem;
        line-height: 1.4;
        word-break: break-word;
    }

    &__effects {
        gap: 4px;
    }

    &__effect-row {
        gap: 12px;
    }

    &__effect-value {
        &--positive {
            color: rgb(var(--v-theme-green));
        }

        &--negative {
            color: rgb(var(--v-theme-warning));
        }
    }
}
</style>
