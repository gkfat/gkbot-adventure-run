<template>
    <v-dialog
        v-model="open"
        max-width="300"
    >
        <div
            v-if="slot"
            class="item-detail pa-4"
        >
            <div
                v-if="slot.item.equipSlot"
                class="item-detail__slot-label text-caption text-medium-emphasis font-pixel"
            >
                {{ SLOT_LABEL[slot.item.equipSlot] }}
            </div>

            <div class="d-flex align-center ga-3 mb-3">
                <div
                    class="pixel-slot pixel-slot--item pixel-slot--detail"
                    :style="{ borderColor: RARITY_COLOR[slot.item.rarity] }"
                >
                    <span
                        class="pixel-slot__rarity font-pixel"
                        :style="{ background: RARITY_COLOR[slot.item.rarity] }"
                    >
                        {{ slot.item.rarity }}
                    </span>
                    <GamePixelIcon
                        :name="resolvePixelIcon(slot.item)"
                        :size="40"
                    />
                </div>
                <div>
                    <div
                        class="font-pixel item-detail__title"
                        :style="{ color: RARITY_COLOR[slot.item.rarity] }"
                    >
                        {{ detailInfo?.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis mb-1">
                        稀有度 {{ slot.item.rarity }}
                    </div>
                    <div class="text-body-2">
                        {{ detailInfo?.effectText }}
                    </div>
                </div>
            </div>

            <p class="text-body-2 text-medium-emphasis mb-3">
                {{ detailInfo?.flavor }}
            </p>

            <div class="d-flex align-center ga-1 mb-3">
                <GameCurrencyIcon :type="props.shopType" />
                <span class="font-pixel text-body-2">{{ price }}</span>
                <span
                    v-if="!canAfford"
                    class="text-caption ml-2"
                    style="color: rgb(var(--v-theme-warning));"
                >
                    餘額不足
                </span>
            </div>

            <div
                v-if="purchaseError"
                class="text-body-2 mb-3"
                style="color: rgb(var(--v-theme-warning));"
            >
                {{ purchaseError }}
            </div>

            <SystemBtn
                block
                variant="flat"
                color="primary"
                class="text-none mb-2"
                :loading="purchaseLoading"
                :disabled="!canAfford"
                @click="handlePurchase"
            >
                購買
            </SystemBtn>

            <SystemBtn
                block
                variant="outlined"
                color="primary"
                class="text-none"
                @click="open = false"
            >
                關閉
            </SystemBtn>
        </div>
    </v-dialog>
</template>

<script setup lang="ts">
import {
    RARITY_COLOR, SLOT_LABEL, resolvePixelIcon, describeItem,
} from '../../utils/equipmentDisplay';
import type { ShopSlot, ShopType } from '../../composables/useShop';

const props = defineProps<{ shopType: ShopType }>();
const emit = defineEmits<{ purchased: [] }>();

const {
    character, fetchCharacter,
} = useCharacter();
const { invalidate: invalidateInventory } = useInventory();
const {
    purchase, purchaseLoading, purchaseError,
} = useShop();

const open = ref(false);
const slot = ref<ShopSlot | null>(null);

const detailInfo = computed(() => (slot.value ? describeItem(slot.value.item) : null));

const price = computed(() => (
    props.shopType === 'GOLD' ? slot.value?.priceGold : slot.value?.priceGems
) ?? 0);
const balance = computed(() => (
    props.shopType === 'GOLD' ? character.value?.gold : character.value?.gems
) ?? 0);
const canAfford = computed(() => balance.value >= price.value);

const handlePurchase = async () => {
    if (!slot.value) return;

    const success = await purchase(props.shopType, slot.value.slotId, 'INVENTORY');
    if (success) {
        await fetchCharacter();
        invalidateInventory();
        open.value = false;
        emit('purchased');
    }
};

defineExpose({
    open: (target: ShopSlot) => {
        slot.value = target;
        open.value = true;
    },
});
</script>

<style scoped lang="scss">
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

    &--detail {
        width: 64px;
        height: 64px;
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
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);

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
}
</style>
