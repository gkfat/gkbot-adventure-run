<template>
    <GameCommonDialogFrame
        v-model="open"
        max-width="320"
        content-class="reward-claimed-dialog d-flex flex-column align-center text-center"
    >
        <template v-if="rewards">
            <div class="font-pixel text-subtitle-2 mb-3" style="color: rgb(var(--v-theme-green));">
                獲得獎勵
            </div>

            <div class="d-flex align-center justify-center ga-4 mb-4 flex-wrap">
                <div
                    v-if="rewards.gold"
                    class="d-flex align-center ga-1"
                >
                    <GameCommonCurrencyIcon
                        type="GOLD"
                        :size="18"
                    />
                    <span class="font-pixel text-body-1">+{{ rewards.gold }}</span>
                </div>
                <div
                    v-if="rewards.gems"
                    class="d-flex align-center ga-1"
                >
                    <GameCommonCurrencyIcon
                        type="GEMS"
                        :size="18"
                    />
                    <span class="font-pixel text-body-1">+{{ rewards.gems }}</span>
                </div>
                <div
                    v-if="rewards.itemCount"
                    class="d-flex align-center ga-1"
                >
                    <v-icon
                        icon="mdi-package-variant"
                        size="18"
                        color="primary"
                    />
                    <span class="font-pixel text-body-1">+{{ rewards.itemCount }} 件道具</span>
                </div>
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
// 通用「獲得獎勵」dialog：任何領取流程（信箱、每日補給箱等）都可共用，
// 只接受金幣/鑽石/道具數量這種最小公約數的顯示資訊，不綁定特定領取來源。
type ClaimedRewards = { gold?: number; gems?: number; itemCount?: number };

const open = ref(false);
const rewards = ref<ClaimedRewards | null>(null);

defineExpose({
    open: (target: ClaimedRewards) => {
        rewards.value = target;
        open.value = true;
    },
});
</script>
