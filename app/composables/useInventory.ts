import type {
    EquipmentSlot, Rarity,
} from '../../shared/types/common';

interface ItemStats {
    ATK?: number;
    DEF?: number;
    HP?: number;
    actionSpeedMod?: number;
    healPercent?: number;
}

interface InventoryItem {
    itemId: string;
    templateId: string;
    type: 'EQUIPMENT' | 'POTION';
    equipSlot?: EquipmentSlot;
    rarity: Rarity;
    stats: ItemStats;
    source: 'DROP' | 'SHOP' | 'EVENT';
    characterId: string;
    createdAt: number;
    sellPriceGold: number;
}

interface GetInventoryResponse {
    success: boolean;
    data: {
        items: InventoryItem[];
        count: number;
        maxCount: number;
    };
}

const items = ref<InventoryItem[]>([]);
const count = ref(0);
const maxCount = ref(500);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const sellLoading = ref(false);
const sellError = ref<string | null>(null);

/**
 * Permanent Inventory Composable
 * 管理永久背包內容（GET /api/character/{characterId}/inventory），供主畫面裝備欄位與背包頁面共用同一份資料
 */
export const useInventory = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    /**
     * 取得目前選定角色的永久背包內容
     */
    const fetchInventory = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetInventoryResponse>(
                `/api/character/${selectedCharacterId.value}/inventory`,
            );
            items.value = response.data.items;
            count.value = response.data.count;
            maxCount.value = response.data.maxCount;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useInventory] Failed to fetch inventory:', err);
            error.value = err.message || '無法取得背包資料';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 依 itemId 查找背包內物品（用於將角色裝備欄位的 itemId 對照到完整物品資料）
     */
    const itemById = (itemId?: string): InventoryItem | undefined => {
        if (!itemId) return undefined;
        return items.value.find(item => item.itemId === itemId);
    };

    /**
     * 販售背包內一件物品換取金幣；成功後從本地清單移除該物品、重新整理角色資料
     * （更新金幣顯示），回傳實際獲得的金幣數（失敗回傳 null）。裝備中的物品無法販售。
     */
    const sellItem = async (itemId: string): Promise<number | null> => {
        if (!selectedCharacterId.value) return null;

        sellLoading.value = true;
        sellError.value = null;

        try {
            const response = await api.post<{ success: boolean; data: { goldEarned: number } }>(
                `/api/character/${selectedCharacterId.value}/inventory/${itemId}/sell`,
            );
            items.value = items.value.filter(item => item.itemId !== itemId);
            count.value = Math.max(0, count.value - 1);

            const { fetchCharacter } = useCharacter();
            await fetchCharacter();

            return response.data.goldEarned;
        } catch (err: any) {
            console.error('[useInventory] Failed to sell item:', err);
            sellError.value = err.message || '販售失敗';
            return null;
        } finally {
            sellLoading.value = false;
        }
    };

    /**
     * 標記本地快取為過期（保留現有 items 供畫面繼續顯示，不清空），下次
     * `onMounted` 檢查 `loaded` 時就會重新 fetch。用於背包內容可能已在背景
     * 被更動之後（例如冒險結算把掉落道具寫入永久背包），確保下次進入背包頁
     * 會拿到最新資料，而不是沿用進冒險前的舊快照。
     */
    const invalidate = () => {
        loaded.value = false;
    };

    /**
     * 重置本地快取（登出時使用）
     */
    const reset = () => {
        items.value = [];
        count.value = 0;
        maxCount.value = 500;
        loaded.value = false;
        error.value = null;
        loading.value = false;
        sellLoading.value = false;
        sellError.value = null;
    };

    return {
        items: computed(() => items.value),
        count: computed(() => count.value),
        maxCount: computed(() => maxCount.value),
        loading: computed(() => loading.value),
        loaded: computed(() => loaded.value),
        error: computed(() => error.value),
        sellLoading: computed(() => sellLoading.value),
        sellError: computed(() => sellError.value),
        fetchInventory,
        itemById,
        sellItem,
        invalidate,
        reset,
    };
};
