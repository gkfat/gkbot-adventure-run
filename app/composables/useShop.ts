import type {
    EquipmentSlot, Rarity, 
} from '../../shared/types/common';

interface ShopItemStats {
    ATK?: number;
    DEF?: number;
    HP?: number;
    actionSpeedMod?: number;
    dodgeChanceMod?: number;
    healPercent?: number;
}

interface ShopItemInstance {
    itemId: string;
    templateId: string;
    type: 'EQUIPMENT' | 'POTION';
    equipSlot?: EquipmentSlot;
    rarity: Rarity;
    stats: ShopItemStats;
    name: string;
    description: string;
    source: string;
    characterId: string;
    createdAt: number;
}

export interface ShopSlot {
    slotId: string;
    item: ShopItemInstance;
    priceGold?: number;
    priceGems?: number;
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

export type ShopType = 'GOLD' | 'GEMS';
export type PurchaseDestination = 'INVENTORY' | 'EQUIP';

const goldItems = ref<ShopSlot[]>([]);
const gemsItems = ref<ShopSlot[]>([]);
const goldLoading = ref(false);
const gemsLoading = ref(false);
const goldLoaded = ref(false);
const gemsLoaded = ref(false);
const goldError = ref<string | null>(null);
const gemsError = ref<string | null>(null);
const purchaseLoading = ref(false);
const purchaseError = ref<string | null>(null);

/**
 * Shop Composable
 * 管理目前選定角色的每日金幣/紅寶石商店（GET .../shop/{gold,gems}）與購買流程（POST .../shop/purchase）
 */
export const useShop = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const fetchGoldShop = async () => {
        if (!selectedCharacterId.value) return;

        goldLoading.value = true;
        goldError.value = null;

        try {
            const response = await api.get<GetShopResponse>(
                `/api/character/${selectedCharacterId.value}/shop/gold`,
            );
            goldItems.value = response.data.items;
            goldLoaded.value = true;
        } catch (err: any) {
            console.error('[useShop] Failed to fetch gold shop:', err);
            goldError.value = err.message || '無法取得金幣商店';
        } finally {
            goldLoading.value = false;
        }
    };

    const fetchGemsShop = async () => {
        if (!selectedCharacterId.value) return;

        gemsLoading.value = true;
        gemsError.value = null;

        try {
            const response = await api.get<GetShopResponse>(
                `/api/character/${selectedCharacterId.value}/shop/gems`,
            );
            gemsItems.value = response.data.items;
            gemsLoaded.value = true;
        } catch (err: any) {
            console.error('[useShop] Failed to fetch gems shop:', err);
            gemsError.value = err.message || '無法取得紅寶石商店';
        } finally {
            gemsLoading.value = false;
        }
    };

    /**
     * 購買一個商店格位；成功後將該格位標記為已售出（本地樂觀更新，不需要重新整理整個商店列表）。
     */
    const purchase = async (
        shopType: ShopType,
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
                    shopType, slotId, destination, replaceSlot,
                },
            );

            const list = shopType === 'GOLD' ? goldItems : gemsItems;
            const target = list.value.find(slot => slot.slotId === slotId);
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

    const reset = () => {
        goldItems.value = [];
        gemsItems.value = [];
        goldLoaded.value = false;
        gemsLoaded.value = false;
        goldError.value = null;
        gemsError.value = null;
        goldLoading.value = false;
        gemsLoading.value = false;
        purchaseError.value = null;
        purchaseLoading.value = false;
    };

    return {
        goldItems: computed(() => goldItems.value),
        gemsItems: computed(() => gemsItems.value),
        goldLoading: computed(() => goldLoading.value),
        gemsLoading: computed(() => gemsLoading.value),
        goldLoaded: computed(() => goldLoaded.value),
        gemsLoaded: computed(() => gemsLoaded.value),
        goldError: computed(() => goldError.value),
        gemsError: computed(() => gemsError.value),
        purchaseLoading: computed(() => purchaseLoading.value),
        purchaseError: computed(() => purchaseError.value),
        fetchGoldShop,
        fetchGemsShop,
        purchase,
        reset,
    };
};
