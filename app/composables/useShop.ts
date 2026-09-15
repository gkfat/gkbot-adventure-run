import type {
    EquipmentSlot, Rarity, WeaponType,
} from '../../shared/types/common';

interface ShopItemStats {
    ATK?: number;
    DEF?: number;
    HP?: number;
    actionSpeedMod?: number;
    dodgeChanceMod?: number;
    healPercent?: number;
}

export interface ShopItemInstance {
    itemId: string;
    templateId: string;
    type: 'EQUIPMENT' | 'POTION';
    equipSlot?: EquipmentSlot;
    weight?: number;
    weaponType?: WeaponType;
    aoeChance?: number;
    splashChance?: number;
    rarity: Rarity;
    stats: ShopItemStats;
    name: string;
    description: string;
    source: string;
    characterId: string;
    createdAt: number;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
        return (err as { message: string }).message;
    }
    return fallback;
}

export type ShopType = 'GOLD' | 'GEMS';

export interface ShopSlot {
    slotId: string;
    item: ShopItemInstance;
    currency: ShopType;
    price: number;
    sold: boolean;
    purchasedAt?: number;
}

interface GetShopResponse {
    success: boolean;
    data: { date: string; items: ShopSlot[] };
}

interface PurchaseResponse {
    success: boolean;
    data: {
        item: { itemId: string; templateId: string; rarity: string };
        goldSpent?: number;
        gemsSpent?: number;
    };
}

export type PurchaseDestination = 'INVENTORY' | 'EQUIP';

export interface DailySupply {
    date: string;
    rewardGold: number;
    item: ShopItemInstance;
    claimed: boolean;
}

interface GetDailySupplyResponse {
    success: boolean;
    data: DailySupply;
}

interface ClaimDailySupplyResponse {
    success: boolean;
    data: { rewardGold: number; item: ShopItemInstance };
}

const items = ref<ShopSlot[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const purchaseLoading = ref(false);
const purchaseError = ref<string | null>(null);

const dailySupply = ref<DailySupply | null>(null);
const dailySupplyLoading = ref(false);
const dailySupplyError = ref<string | null>(null);
const claimDailySupplyLoading = ref(false);
const claimDailySupplyError = ref<string | null>(null);

/**
 * Shop Composable
 * 管理目前選定角色的每日商店（金幣/寶石商品合併為單一清單，GET .../shop）與購買流程（POST .../shop/purchase）
 */
export const useShop = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const fetchShop = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetShopResponse>(
                `/api/character/${selectedCharacterId.value}/shop`,
            );
            items.value = response.data.items;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useShop] Failed to fetch shop:', err);
            error.value = err.message || '無法取得商店';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 購買一個商店格位；成功後將該格位標記為已售出（本地樂觀更新，不需要重新整理整個商店列表）。
     */
    const purchase = async (
        slotId: string,
        destination: PurchaseDestination,
        replaceSlot?: EquipmentSlot,
    ): Promise<boolean> => {
        if (!selectedCharacterId.value) return false;

        purchaseLoading.value = true;
        purchaseError.value = null;

        try {
            await api.post<PurchaseResponse>(
                `/api/character/${selectedCharacterId.value}/shop/purchase`,
                {
                    slotId, destination, replaceSlot,
                },
            );

            const target = items.value.find(slot => slot.slotId === slotId);
            if (target) target.sold = true;

            return true;
        } catch (err: any) {
            console.error('[useShop] Failed to purchase item:', err);
            purchaseError.value = err.message || '購買失敗';
            return false;
        } finally {
            purchaseLoading.value = false;
        }
    };

    /**
     * 取得今日每日補給箱狀態（100 金幣 + 一件 N 級裝備，每日限領一次），若尚未生成則後端會自動生成。
     */
    const fetchDailySupply = async () => {
        if (!selectedCharacterId.value) return;

        dailySupplyLoading.value = true;
        dailySupplyError.value = null;

        try {
            const response = await api.get<GetDailySupplyResponse>(
                `/api/character/${selectedCharacterId.value}/shop/daily-supply`,
            );
            dailySupply.value = response.data;
        } catch (err: unknown) {
            console.error('[useShop] Failed to fetch daily supply:', err);
            dailySupplyError.value = extractErrorMessage(err, '無法取得每日補給');
        } finally {
            dailySupplyLoading.value = false;
        }
    };

    /**
     * 領取今日每日補給箱；成功後本地樂觀更新為已領取（不需要重新整理），並回傳這次
     * 領取到的內容（金幣 + 裝備），供呼叫端彈出 dialog 揭曉——領取前這份內容不會顯示在畫面上。
     */
    const claimDailySupply = async (): Promise<{ rewardGold: number; item: ShopItemInstance } | null> => {
        if (!selectedCharacterId.value) return null;

        claimDailySupplyLoading.value = true;
        claimDailySupplyError.value = null;

        try {
            const response = await api.post<ClaimDailySupplyResponse>(
                `/api/character/${selectedCharacterId.value}/shop/daily-supply/claim`,
                {},
            );

            if (dailySupply.value) dailySupply.value.claimed = true;

            return response.data;
        } catch (err: unknown) {
            console.error('[useShop] Failed to claim daily supply:', err);
            claimDailySupplyError.value = extractErrorMessage(err, '領取失敗');
            return null;
        } finally {
            claimDailySupplyLoading.value = false;
        }
    };

    const reset = () => {
        items.value = [];
        loaded.value = false;
        error.value = null;
        loading.value = false;
        purchaseError.value = null;
        purchaseLoading.value = false;
        dailySupply.value = null;
        dailySupplyError.value = null;
        dailySupplyLoading.value = false;
        claimDailySupplyError.value = null;
        claimDailySupplyLoading.value = false;
    };

    return {
        items: computed(() => items.value),
        loading: computed(() => loading.value),
        loaded: computed(() => loaded.value),
        error: computed(() => error.value),
        purchaseLoading: computed(() => purchaseLoading.value),
        purchaseError: computed(() => purchaseError.value),
        fetchShop,
        purchase,
        dailySupply: computed(() => dailySupply.value),
        dailySupplyLoading: computed(() => dailySupplyLoading.value),
        dailySupplyError: computed(() => dailySupplyError.value),
        claimDailySupplyLoading: computed(() => claimDailySupplyLoading.value),
        claimDailySupplyError: computed(() => claimDailySupplyError.value),
        fetchDailySupply,
        claimDailySupply,
        reset,
    };
};
