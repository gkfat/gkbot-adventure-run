<template>
    <div class="fill-height shop-page pa-3">
        <!-- 每日補給箱：每日限領一次，內容物在領取前保持未知，以寶箱示意 -->
        <div
            v-if="dailySupply"
            class="shop-page__supply mb-3"
        >
            <span class="shop-page__supply-badge font-pixel">每日補給</span>
            <div class="shop-page__supply-body d-flex align-center">
                <div class="shop-page__supply-slots d-flex ga-2">
                    <div
                        class="shop-page__supply-slot d-flex align-center justify-center"
                        :class="{ 'shop-page__supply-slot--claimed': dailySupply.claimed }"
                    >
                        <GameCommonPixelIcon
                            name="treasureChest"
                            :size="28"
                        />
                    </div>
                    <div
                        class="shop-page__supply-slot d-flex flex-column align-center justify-center"
                        :class="{ 'shop-page__supply-slot--claimed': dailySupply.claimed }"
                    >
                        <GameCommonCurrencyIcon
                            type="GOLD"
                            :size="20"
                        />
                        <span class="font-pixel text-caption mt-1">{{ dailySupply.rewardGold }}</span>
                    </div>
                </div>
                <div class="shop-page__supply-info flex-grow-1">
                    <div class="shop-page__supply-flavor text-caption text-medium-emphasis">
                        每天準時送來的一份補給品，真好奇是誰送的...?
                    </div>
                </div>
                <SystemBtn
                    :disabled="dailySupply.claimed"
                    :loading="claimDailySupplyLoading"
                    variant="outlined"
                    color="primary"
                    size="small"
                    class="text-none flex-grow-0"
                    @click="handleClaimDailySupply"
                >
                    {{ dailySupply.claimed ? '已領取' : '領取' }}
                </SystemBtn>
            </div>
        </div>

        <!-- 每日補給揭曉 dialog -->
        <GameCommonDailySupplyClaimDialog ref="claimDialogRef" />

        <!-- 老虎機入口：沿用商品格位的卡片語彙（角標／分隔線／價格列），放大成橫幅 -->
        <button
            type="button"
            class="shop-page__gacha-banner pixel-press"
            @click="navigateTo('/gacha')"
        >
            <span class="shop-page__gacha-banner-badge font-pixel">老虎機</span>

            <span class="shop-page__gacha-banner-flavor text-caption text-medium-emphasis">
                福利社淘汰的賭博機具，投幣還會匡啷吐裝備
            </span>

            <div class="shop-page__gacha-banner-divider" />

            <div class="shop-page__gacha-banner-costs d-flex align-center">
                <span class="shop-page__gacha-banner-cost d-flex align-center">
                    <GameCommonCurrencyIcon
                        type="GOLD"
                        :size="11"
                    />
                    <span class="font-pixel">{{ GOLD_COST }}</span>
                </span>
                <span class="shop-page__gacha-banner-cost-divider" />
                <span class="shop-page__gacha-banner-cost d-flex align-center">
                    <GameCommonCurrencyIcon
                        type="GEMS"
                        :size="11"
                    />
                    <span class="font-pixel">{{ GEMS_COST }}</span>
                </span>
                <v-icon
                    icon="mdi-chevron-right"
                    size="16"
                    class="shop-page__gacha-banner-arrow ml-auto"
                />
            </div>
        </button>

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
            v-else-if="error"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ error }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none flex-grow-0"
                prepend-icon="mdi-refresh"
                @click="loadShop"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 商品分層：裝備（兩個補給櫃）/ 道具 -->
        <div v-else>
            <div class="shop-page__tier">
                <div class="shop-page__tier-label font-pixel text-caption">
                    裝備
                </div>

                <!-- 機密授權補給櫃：寶石裝備，鎖具形同虛設，權限早就沒人管了 -->
                <div class="shop-page__cabinet shop-page__cabinet--gems mb-3">
                    <span class="shop-page__cabinet-badge font-pixel">授權</span>
                    <div class="shop-page__cabinet-header d-flex align-center">
                        <span class="shop-page__cabinet-led shop-page__cabinet-led--gems" />
                        <span class="shop-page__cabinet-title font-pixel text-caption">機密授權補給櫃</span>
                        <v-icon
                            icon="mdi-lock-open-variant-outline"
                            size="12"
                            class="shop-page__cabinet-lock ml-auto"
                        />
                    </div>
                    <div class="shop-page__cabinet-flavor text-caption text-medium-emphasis">
                        特殊授權補給艙，鎖是壞的，反正也沒人管
                    </div>
                    <v-row
                        dense
                        class="mt-1"
                    >
                        <v-col
                            v-for="slot in gemsEquipment"
                            :key="slot.slotId"
                            cols="4"
                        >
                            <GameCommonShopItemSlot
                                :shop-slot="slot"
                                @select="openPurchase"
                            />
                        </v-col>
                    </v-row>
                </div>

                <!-- 常規補給櫃：金幣裝備，邏輯錯亂但照樣運作的日常補給機 -->
                <div class="shop-page__cabinet shop-page__cabinet--gold">
                    <div class="shop-page__cabinet-header d-flex align-center">
                        <span class="shop-page__cabinet-led shop-page__cabinet-led--gold" />
                        <span class="shop-page__cabinet-title font-pixel text-caption">常規補給櫃</span>
                    </div>
                    <div class="shop-page__cabinet-flavor text-caption text-medium-emphasis">
                        還在正常運作的一般補給艙，邏輯亂了但照樣吐貨
                    </div>
                    <v-row
                        dense
                        class="mt-1"
                    >
                        <v-col
                            v-for="slot in goldEquipment"
                            :key="slot.slotId"
                            cols="4"
                        >
                            <GameCommonShopItemSlot
                                :shop-slot="slot"
                                @select="openPurchase"
                            />
                        </v-col>
                    </v-row>
                </div>
            </div>

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
                        <GameCommonShopItemSlot
                            :shop-slot="slot"
                            @select="openPurchase"
                        />
                    </v-col>
                </v-row>
            </div>

            <!-- 技能碎片商品（character-skills）：簡易卡片，不透過裝備購買 dialog -->
            <div
                v-if="skillFragmentSlots.length > 0"
                class="shop-page__tier"
            >
                <div class="shop-page__tier-label font-pixel text-caption">
                    技能碎片
                </div>
                <v-row dense>
                    <v-col
                        v-for="slot in skillFragmentSlots"
                        :key="slot.slotId"
                        cols="6"
                    >
                        <div
                            class="shop-page__fragment-card d-flex flex-column"
                            :class="{ 'shop-page__fragment-card--sold': slot.sold }"
                        >
                            <div class="d-flex align-center ga-1 mb-1">
                                <GameCommonCurrencyIcon
                                    :type="slot.currency"
                                    :size="14"
                                />
                                <span class="font-pixel text-caption">{{ slot.price }}</span>
                            </div>
                            <div class="text-caption text-medium-emphasis mb-2">
                                技能碎片 x{{ slot.fragmentAmount }}
                            </div>
                            <SystemBtn
                                block
                                variant="outlined"
                                color="primary"
                                size="small"
                                class="text-none"
                                :disabled="slot.sold"
                                :loading="fragmentPurchaseLoadingSlotId === slot.slotId"
                                @click="handlePurchaseFragmentSlot(slot)"
                            >
                                {{ slot.sold ? '已售出' : '購買' }}
                            </SystemBtn>
                        </div>
                    </v-col>
                </v-row>
            </div>
        </div>

        <!-- 購買 dialog -->
        <GameCommonShopPurchaseDialog ref="purchaseDialogRef" />

        <!-- 技能碎片購買結果 dialog -->
        <GameCommonSkillFragmentPurchaseDialog ref="skillFragmentPurchaseDialogRef" />
    </div>
</template>

<script setup lang="ts">
import { GACHA_CONFIG } from '~~/shared/constants/gacha';
import { ItemType } from '../../shared/types/item';
import type { ShopSlot, ShopItemInstance } from '../composables/useShop';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '商店',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 商店頁面' }],
});

const GOLD_COST = GACHA_CONFIG.GOLD_COST;
const GEMS_COST = GACHA_CONFIG.GEMS_COST;
const {
    items, loading, loaded, error, fetchShop, purchase,
    dailySupply, claimDailySupplyLoading, fetchDailySupply, claimDailySupply,
} = useShop();
const { fetchCharacter } = useCharacter();
const { invalidate: invalidateInventory } = useInventory();
const { playSfx } = useAudio();

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type ClaimDialog = { open: (result: { rewardGold: number; item: ShopItemInstance }) => void };
const claimDialogRef = ref<ClaimDialog | null>(null);

const handleClaimDailySupply = async () => {
    if (!dailySupply.value || dailySupply.value.claimed) return;
    const result = await claimDailySupply();
    if (result) {
        claimDialogRef.value?.open(result);
        await fetchCharacter();
        invalidateInventory();
    }
};

// 寶石商品排在前面（價格高到低），金幣商品排在後面（價格高到低）
const sortByCurrencyThenPrice = (slots: ShopSlot[]) => [...slots].sort((a, b) => {
    if (a.currency !== b.currency) return a.currency === 'GEMS' ? -1 : 1;
    return b.price - a.price;
});

const equipmentSlots = computed(() => items.value.filter(slot => slot.item?.type === ItemType.EQUIPMENT));
const gemsEquipment = computed(
    () => sortByCurrencyThenPrice(equipmentSlots.value.filter(slot => slot.currency === 'GEMS')),
);
const goldEquipment = computed(
    () => sortByCurrencyThenPrice(equipmentSlots.value.filter(slot => slot.currency === 'GOLD')),
);

const tiers = computed(() => [
    {
        key: 'POTION',
        label: '道具',
        items: sortByCurrencyThenPrice(items.value.filter(slot => slot.item?.type === ItemType.POTION)),
    },
]);

// 技能碎片商品（character-skills）：不是 ItemInstance，另外用一組簡易卡片呈現，
// 不重用 GameCommonShopItemSlot／購買 dialog（那兩者假設 rarity/stats 等裝備欄位）。
const skillFragmentSlots = computed(
    () => sortByCurrencyThenPrice(items.value.filter(slot => slot.type === 'SKILL_FRAGMENT')),
);

const { fetchSkills, loaded: skillsLoaded } = useCharacterSkills();
const fragmentPurchaseLoadingSlotId = ref<string | null>(null);

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type SkillFragmentPurchaseDialog = { open: (result: { skillId: string; amount: number; name: string; icon: string }) => void };
const skillFragmentPurchaseDialogRef = ref<SkillFragmentPurchaseDialog | null>(null);

const handlePurchaseFragmentSlot = async (slot: ShopSlot) => {
    if (slot.sold || fragmentPurchaseLoadingSlotId.value) return;
    fragmentPurchaseLoadingSlotId.value = slot.slotId;
    const result = await purchase(slot.slotId, 'INVENTORY');
    fragmentPurchaseLoadingSlotId.value = null;
    if (result?.skillFragment) {
        playSfx('equip.wav');
        await fetchCharacter();
        if (skillsLoaded.value) fetchSkills();
        skillFragmentPurchaseDialogRef.value?.open(result.skillFragment);
    }
};

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type PurchaseDialog = { open: (slot: ShopSlot) => void };
const purchaseDialogRef = ref<PurchaseDialog | null>(null);

const openPurchase = (slot: ShopSlot) => {
    if (slot.sold) return;
    purchaseDialogRef.value?.open(slot);
};

const loadShop = () => {
    if (!loaded.value) fetchShop();
};

onMounted(() => {
    loadShop();
    fetchDailySupply();
});
</script>

<style scoped lang="scss">
.shop-page {
    width: 100%;
    overflow-y: auto;

    &__supply {
        position: relative;
        padding: 10px 12px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;
        box-shadow:
            inset 2px 2px 0 rgba(255, 255, 255, 0.06),
            inset -2px -2px 0 rgba(0, 0, 0, 0.55);
    }

    &__supply-badge {
        position: absolute;
        top: -6px;
        left: -6px;
        padding: 0 4px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        background: rgb(var(--v-theme-primary));
        border-radius: 2px;
        white-space: nowrap;
    }

    &__supply-body {
        gap: 10px;
        margin-top: 2px;
    }

    &__supply-slot {
        position: relative;
        flex-shrink: 0;
        width: 52px;
        height: 52px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;
        box-shadow:
            inset 2px 2px 0 rgba(255, 255, 255, 0.06),
            inset -2px -2px 0 rgba(0, 0, 0, 0.55);
        transition: opacity 0.15s ease-out;

        &--claimed {
            opacity: 0.4;
        }
    }

    &__supply-flavor {
        font-size: 10px;
        line-height: 1.4;
    }

    &__gacha-banner {
        position: relative;
        display: block;
        width: 100%;
        margin-bottom: 16px;
        padding: 14px 14px 12px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;
        color: rgb(var(--v-theme-primary));
        text-align: left;
        cursor: pointer;
        box-shadow:
            inset 2px 2px 0 rgba(255, 255, 255, 0.06),
            inset -2px -2px 0 rgba(0, 0, 0, 0.55);
        transition: transform 0.06s ease-out;

        &:hover {
            transform: translateY(-1px);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &__gacha-banner-badge {
        position: absolute;
        top: -6px;
        left: -6px;
        padding: 0 4px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        background: #ab47bc;
        border-radius: 2px;
        white-space: nowrap;
    }

    &__gacha-banner-flavor {
        display: block;
        margin-top: 4px;
    }

    &__gacha-banner-divider {
        width: 100%;
        height: 1px;
        margin: 10px 0 8px;
        background: rgba(196, 203, 219, 0.15);
    }

    &__gacha-banner-costs {
        gap: 6px;
    }

    &__gacha-banner-cost {
        gap: 3px;
        font-size: 11px;
        color: rgb(var(--v-theme-secondary));
    }

    &__gacha-banner-cost-divider {
        width: 1px;
        height: 10px;
        background: rgba(196, 203, 219, 0.2);
    }

    &__gacha-banner-arrow {
        color: rgb(var(--v-theme-primary));
        opacity: 0.5;
    }

    &__tier {
        margin-bottom: 16px;
    }

    &__tier-label {
        margin-bottom: 6px;
        font-size: 11px;
        color: rgb(var(--v-theme-secondary));
        opacity: 0.85;
    }

    &__fragment-card {
        padding: 8px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;

        &--sold {
            opacity: 0.5;
        }
    }

    &__cabinet {
        position: relative;
        padding: 8px 8px 10px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;
        box-shadow:
            inset 2px 2px 0 rgba(255, 255, 255, 0.06),
            inset -2px -2px 0 rgba(0, 0, 0, 0.55);

        &--gems::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            height: 4px;
            background: repeating-linear-gradient(45deg, #ab47bc 0 6px, #14171c 6px 12px);
            border-radius: 3px 3px 0 0;
        }
    }

    &__cabinet-badge {
        position: absolute;
        top: -6px;
        right: 8px;
        padding: 0 4px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        background: #ab47bc;
        border-radius: 2px;
        white-space: nowrap;
    }

    &__cabinet-header {
        gap: 5px;
        margin-top: 2px;
    }

    &__cabinet-led {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #81b29a;
        box-shadow: 0 0 4px #81b29a;

        &--gems {
            background: #ab47bc;
            box-shadow: 0 0 4px #ab47bc;
            animation: shop-page-led-blink 1.6s ease-in-out infinite;
        }
    }

    &__cabinet-title {
        color: rgb(var(--v-theme-secondary));
    }

    &__cabinet-lock {
        color: #ab47bc;
        opacity: 0.75;
    }

    &__cabinet-flavor {
        display: block;
        margin: 3px 0 2px;
        font-size: 10px;
    }
}

@keyframes shop-page-led-blink {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.35;
    }
}

@media (prefers-reduced-motion: reduce) {
    .shop-page__cabinet-led--gems {
        animation: none;
    }
}
</style>
