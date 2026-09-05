<template>
    <GameCommonDialogFrame
        v-model="open"
        max-width="320"
        content-class="shop-purchase-dialog"
    >
        <template v-if="slot && detailInfo">
            <GameCommonItemDetailPanel
                :item="slot.item"
                :name="detailInfo.name"
                :effects="detailInfo.effects"
                :flavor="detailInfo.flavor"
            />

            <div class="d-flex align-center ga-1 mb-3">
                <GameCommonCurrencyIcon :type="currency" />
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
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import { describeItem } from '../../../utils/equipmentDisplay';
import type { ShopSlot } from '../../../composables/useShop';

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

const currency = computed(() => slot.value?.currency ?? 'GOLD');
const price = computed(() => slot.value?.price ?? 0);
const balance = computed(() => (
    currency.value === 'GOLD' ? character.value?.gold : character.value?.gems
) ?? 0);
const canAfford = computed(() => balance.value >= price.value);

const handlePurchase = async () => {
    if (!slot.value) return;

    const success = await purchase(slot.value.slotId, 'INVENTORY');
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
