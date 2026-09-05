import type {
    EquipmentSlot, Rarity, WeaponWeightClass,
} from '../../shared/types/common';
import type { ShopType as GachaCurrency } from './useShop';

interface GachaItemStats {
    ATK?: number;
    DEF?: number;
    HP?: number;
    actionSpeedMod?: number;
    dodgeChanceMod?: number;
    healPercent?: number;
}

export interface GachaItemInstance {
    itemId: string;
    templateId: string;
    type: 'EQUIPMENT' | 'POTION';
    equipSlot?: EquipmentSlot;
    weaponWeightClass?: WeaponWeightClass;
    rarity: Rarity;
    stats: GachaItemStats;
    name: string;
    description: string;
    source: string;
    characterId: string;
    createdAt: number;
}

export interface GachaPullResponseData {
    item: GachaItemInstance;
    currency: GachaCurrency;
    amountSpent: number;
    remainingBalance: number;
}

interface PullResponse {
    success: boolean;
    data: GachaPullResponseData;
}

const loading = ref(false);
const error = ref<string | null>(null);
const lastResult = ref<GachaPullResponseData | null>(null);

/**
 * Gacha Composable
 * 管理目前選定角色的裝備老虎機抽取（POST .../gacha/pull）
 */
export const useGacha = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const pull = async (currency: GachaCurrency): Promise<GachaPullResponseData | null> => {
        if (!selectedCharacterId.value) return null;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<PullResponse>(
                `/api/character/${selectedCharacterId.value}/gacha/pull`,
                { currency },
            );
            lastResult.value = response.data;
            return response.data;
        } catch (err: any) {
            console.error('[useGacha] Failed to pull:', err);
            error.value = err.message || '抽取失敗';
            return null;
        } finally {
            loading.value = false;
        }
    };

    const reset = () => {
        loading.value = false;
        error.value = null;
        lastResult.value = null;
    };

    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        lastResult: computed(() => lastResult.value),
        pull,
        reset,
    };
};
