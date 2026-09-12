<template>
    <GameCommonDialogFrame
        v-model="open"
        max-width="320"
        content-class="daily-supply-claim-dialog"
    >
        <template v-if="result && detailInfo">
            <div class="daily-supply-claim-dialog__title font-pixel text-caption text-center mb-3">
                每日補給箱開啟
            </div>

            <GameCommonItemDetailPanel
                :item="result.item"
                :name="detailInfo.name"
                :effects="detailInfo.effects"
                :flavor="detailInfo.flavor"
            />

            <div class="d-flex align-center ga-1 mb-3">
                <GameCommonCurrencyIcon type="GOLD" />
                <span class="font-pixel text-body-2">+{{ result.rewardGold }}</span>
            </div>

            <SystemBtn
                block
                variant="flat"
                color="primary"
                class="text-none"
                @click="open = false"
            >
                太好了
            </SystemBtn>
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import { describeItem } from '../../../utils/equipmentDisplay';
import type { ShopItemInstance } from '../../../composables/useShop';

type ClaimResult = { rewardGold: number; item: ShopItemInstance };

const open = ref(false);
const result = ref<ClaimResult | null>(null);

const detailInfo = computed(() => (result.value ? describeItem(result.value.item) : null));

defineExpose({
    open: (target: ClaimResult) => {
        result.value = target;
        open.value = true;
    },
});
</script>

<style scoped lang="scss">
.daily-supply-claim-dialog__title {
    color: rgb(var(--v-theme-secondary));
}
</style>
