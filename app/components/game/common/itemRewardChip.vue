<template>
    <div class="item-reward-chip">
        <div
            class="item-reward-chip__icon"
            :style="{ borderColor: RARITY_COLOR[item.rarity] }"
        >
            <span
                class="item-reward-chip__rarity font-pixel"
                :style="{ background: RARITY_COLOR[item.rarity] }"
            >
                {{ item.rarity }}
            </span>
            <GameCommonPixelIcon
                :name="resolvePixelIcon(item)"
                :size="32"
            />
        </div>
        <div class="item-reward-chip__info">
            <div
                class="font-pixel item-reward-chip__name"
                :style="{ color: RARITY_COLOR[item.rarity] }"
            >
                {{ describeItem(item).name }}
            </div>
            <div class="text-caption text-medium-emphasis item-reward-chip__effects">
                {{ describeItem(item).effectText }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, describeItem, resolvePixelIcon, type ItemLike,
} from '../../../utils/equipmentDisplay';

defineProps<{ item: ItemLike }>();
</script>

<style scoped lang="scss">
.item-reward-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;

    &__icon {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 44px;
        height: 44px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;
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

    &__name {
        font-size: 0.75rem;
        line-height: 1.3;
        word-break: break-word;
    }

    &__effects {
        line-height: 1.3;
    }
}
</style>
