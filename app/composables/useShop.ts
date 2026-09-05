import type {
    EquipmentSlot, Rarity, WeaponWeightClass,
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
    weaponWeightClass?: WeaponWeightClass;
    rarity: Rarity;
    stats: ShopItemStats;
    name: string;
    description: string;
    source: string;
    characterId: string;
    createdAt: number;
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

const items = ref<ShopSlot[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const purchaseLoading = ref(false);
const purchaseError = ref<string | null>(null);

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

    const reset = () => {
        items.value = [];
        loaded.value = false;
        error.value = null;
        loading.value = false;
        purchaseError.value = null;
        purchaseLoading.value = false;
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
        reset,
    };
};
