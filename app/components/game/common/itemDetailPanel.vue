<template>
    <div class="item-detail">
        <div
            v-if="showSlotLabel && item.type === 'EQUIPMENT' && item.equipSlot"
            class="item-detail__slot-label text-caption text-medium-emphasis font-pixel"
        >
            {{ SLOT_LABEL[item.equipSlot] }}
        </div>

        <div class="d-flex align-center ga-3 mb-3">
            <div
                class="pixel-slot pixel-slot--item pixel-slot--detail d-flex align-center justify-center"
                :class="{ 'pixel-slot--compact': compact }"
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
                    :size="compact ? 40 : 64"
                />
            </div>
            <div>
                <div
                    class="font-pixel item-detail__title"
                    :class="{ 'item-detail__title--with-slot-label': showSlotLabel }"
                    :style="{ color: RARITY_COLOR[item.rarity] }"
                >
                    {{ name }}
                </div>
                <div
                    v-if="item.type === 'EQUIPMENT' && item.weight !== undefined"
                    class="text-caption text-medium-emphasis"
                >
                    重量 {{ item.weight }}
                </div>
                <div
                    v-if="item.weaponType"
                    class="text-caption text-medium-emphasis"
                >
                    {{ WEAPON_TYPE_LABEL[item.weaponType] }}
                </div>
            </div>
        </div>

        <div
            v-if="item.type === 'EQUIPMENT' && item.weight !== undefined"
            class="mb-3"
        >
            <div class="item-detail__weight-bar d-flex">
                <div
                    v-for="(cell, index) in buildWeightBarCells(item.weight)"
                    :key="index"
                    class="item-detail__weight-cell"
                    :class="{
                        'item-detail__weight-cell--active': cell.active,
                        'item-detail__weight-cell--group-end': index === 2 || index === 5,
                    }"
                    :style="{ '--cell-color': WEIGHT_CLASS_COLOR[cell.weightClass] }"
                />
            </div>
            <div class="item-detail__weight-groups d-flex text-caption text-medium-emphasis">
                <span
                    v-for="weightClass in WEIGHT_CLASS_ORDER"
                    :key="weightClass"
                    class="item-detail__weight-group-label"
                    :style="resolveWeaponWeightClass(item) === weightClass ? { color: WEIGHT_CLASS_COLOR[weightClass] } : undefined"
                >
                    {{ WEIGHT_CLASS_LABEL[weightClass] }}
                </span>
            </div>
        </div>

        <div
            v-if="effects.length > 0"
            class="item-detail__effects d-flex flex-column ga-1 mb-3"
        >
            <div
                v-for="effect in effects"
                :key="effect.label"
                class="item-detail__effect-row d-flex align-baseline justify-space-between ga-3 text-body-2"
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

        <p
            v-if="showFlavor"
            class="text-body-2 text-medium-emphasis mb-3"
        >
            {{ flavor }}
        </p>
    </div>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, SLOT_LABEL, WEIGHT_CLASS_LABEL, WEIGHT_CLASS_COLOR, WEIGHT_CLASS_ORDER, WEAPON_TYPE_LABEL,
    resolvePixelIcon, resolveWeaponWeightClass, buildWeightBarCells, type ItemLike,
} from '../../../utils/equipmentDisplay';

withDefaults(defineProps<{
    item: ItemLike;
    name: string;
    effects: { label: string; value: string; positive: boolean }[];
    flavor: string;
    showFlavor?: boolean;
    showSlotLabel?: boolean;
    compact?: boolean;
}>(), {
    showFlavor: true,
    showSlotLabel: true,
    compact: false,
});
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

    &--compact {
        width: 56px;
        height: 56px;
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

.item-detail__weight-bar {
    gap: 1px;
}

.item-detail__weight-groups {
    margin-top: 2px;

    span {
        flex: 1 1 0;
        text-align: center;
    }
}

.item-detail__weight-cell {
    flex: 1 1 0;
    height: 5px;
    border-radius: 1px;
    background: var(--cell-color);
    opacity: 0.3;

    &--group-end {
        margin-right: 2px;
    }

    &--active {
        opacity: 1;
    }
}

.item-detail {
    position: relative;

    &__slot-label {
        position: absolute;
        top: 16px;
        right: 16px;
    }

    &__title {
        font-size: 0.85rem;
        line-height: 1.4;
        word-break: break-word;

        // 品名可能混雜英數字（走 font-pixel，字元較寬），保留右側空間避免與
        // __slot-label 重疊；比較模式欄位較窄且欄位標示已移到外層標題列，
        // 不需要保留這段空間
        &--with-slot-label {
            padding-right: 48px;
        }
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
