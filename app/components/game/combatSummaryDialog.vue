<template>
    <GameDialogFrame
        model-value
        persistent
        :scrim="false"
        content-class="combat-summary-dialog"
    >
        <div
            class="text-center font-pixel text-subtitle-1 mb-3"
            :style="{ color: victory ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
        >
            {{ victory ? '戰鬥勝利' : '戰鬥失敗' }}
        </div>

        <div class="d-flex flex-wrap justify-center ga-4 mb-3">
            <div class="combat-summary-dialog__stat">
                <div class="text-caption text-medium-emphasis">回合</div>
                <div
                    class="font-pixel combat-summary-dialog__stat-value"
                    style="color: rgb(var(--v-theme-primary));"
                >
                    {{ roundCount }}
                </div>
            </div>
            <div
                v-if="expGained"
                class="combat-summary-dialog__stat"
            >
                <div class="text-caption text-medium-emphasis">EXP</div>
                <div
                    class="font-pixel combat-summary-dialog__stat-value"
                    style="color: rgb(var(--v-theme-primary));"
                >
                    +{{ expGained }}
                </div>
            </div>
            <div
                v-if="goldDropped"
                class="combat-summary-dialog__stat"
            >
                <div class="text-caption text-medium-emphasis">金幣</div>
                <div
                    class="font-pixel combat-summary-dialog__stat-value"
                    style="color: #e0c063;"
                >
                    +{{ goldDropped }}
                </div>
            </div>
            <div
                v-if="gemsDropped"
                class="combat-summary-dialog__stat"
            >
                <div class="text-caption text-medium-emphasis">寶石</div>
                <div
                    class="font-pixel combat-summary-dialog__stat-value"
                    style="color: rgb(var(--v-theme-green));"
                >
                    +{{ gemsDropped }}
                </div>
            </div>
        </div>

        <template v-if="droppedItems.length > 0">
            <div class="text-caption text-medium-emphasis text-left mb-1">
                掉落物品
            </div>
            <div class="combat-summary-dialog__items">
                <div
                    v-for="item in droppedItems"
                    :key="item.itemId"
                    class="combat-summary-dialog__item"
                >
                    <div
                        class="pixel-slot pixel-slot--item"
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
                            :size="32"
                        />
                    </div>
                    <div class="combat-summary-dialog__item-info">
                        <div
                            class="font-pixel text-body-2"
                            :style="{ color: RARITY_COLOR[item.rarity] }"
                        >
                            {{ describeItem(item).name }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            {{ describeItem(item).effectText }}
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </GameDialogFrame>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, resolvePixelIcon, describeItem, type ItemLike,
} from '../../utils/equipmentDisplay';

defineProps<{
    victory: boolean;
    roundCount: number;
    expGained: number;
    goldDropped: number;
    gemsDropped: number;
    droppedItems: (ItemLike & { itemId: string })[];
}>();
</script>

<style scoped lang="scss">
.combat-summary-dialog {
    text-align: center;

    &__stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    &__stat-value {
        font-size: 17px;
        font-weight: 700;
    }

    &__items {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }

    &__item {
        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
    }

    &__item-info {
        min-width: 0;
    }
}

// 跟 itemDetailDialog.vue／inventory.vue 同一套「pixel cabinet slot」樣式
// （目前專案沒有抽出共用元件，各處各自維護一份 scoped 樣式）。
.pixel-slot {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
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
