import type {
    AdventureStateType, NodeType,
} from '../../shared/types/adventure';
import type { Rarity } from '../../shared/types/common';

export type {
    AdventureStateType, NodeType, 
};

function extractErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
        return (err as { message: string }).message;
    }
    return fallback;
}

function extractStatusCode(err: unknown): number | undefined {
    if (!err || typeof err !== 'object') return undefined;
    const obj = err as { statusCode?: number; response?: { status?: number } };
    return obj.statusCode ?? obj.response?.status;
}

type AdventureRunItem = {
    itemId: string;
    templateId: string;
    type: string;
    rarity: Rarity;
    stats: { healPercent?: number };
};

export type AdventureRunView = {
    runId: string;
    characterId: string;
    state: AdventureStateType;
    step: number;
    currentNodeType?: NodeType;
    currentNodeData?: unknown;
    playerHp: number;
    playerHpMax: number;
    blessingPoints: number;
    runInventory: AdventureRunItem[];
    score: number;
    goldEarned: number;
    gemsEarned: number;
};

type GetCurrentResponse = {
    success: boolean;
    data: AdventureRunView | null;
};

type AdvanceResponse = {
    success: boolean;
    data: { state: AdventureStateType; step: number; nodeType?: NodeType };
};

export type EndRunResult = {
    finalScore: number;
    goldEarned: number;
    gemsEarned: number;
    itemsEarned: number;
    expGained: number;
    leveledUp: boolean;
    untransferredItemIds: string[];
};

type EndRunResponse = {
    success: boolean;
    data: EndRunResult;
};

type HealResponse = {
    success: boolean;
    data: { hpHealed: number; hpCurrent: number };
};

// Shared module-level state — same singleton-composable pattern as useCharacter.ts
const currentRun = ref<AdventureRunView | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const checked = ref(false); // whether fetchCurrent has resolved at least once

/**
 * Adventure Run Composable
 * 管理目前角色的冒險 run 狀態（開始/繼續/推進/結束/休息用藥），供首頁 CTA 與
 * 冒險頁面共用同一份狀態。
 */
export const useAdventureRun = () => {
    const api = useApi();

    /**
     * 取得目前角色進行中的 run（沒有的話為 null）。
     */
    const fetchCurrent = async (characterId: string) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetCurrentResponse>('/api/adventure/current', { query: { characterId } });
            currentRun.value = response.data;
            return response.data;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to fetch current run:', err);
            error.value = extractErrorMessage(err, '無法取得冒險狀態');
            return null;
        } finally {
            loading.value = false;
            checked.value = true;
        }
    };

    /**
     * 開始新的冒險。若角色已有進行中的 run（409），視同成功並直接改抓現有 run。
     */
    const start = async (characterId: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;

        try {
            await api.post('/api/adventure/start', { characterId });
        } catch (err: unknown) {
            if (extractStatusCode(err) !== 409) {
                console.error('[useAdventureRun] Failed to start adventure:', err);
                error.value = extractErrorMessage(err, '無法開始冒險');
                loading.value = false;
                return false;
            }
        }

        await fetchCurrent(characterId);
        return true;
    };

    /**
     * 推進 run 的狀態機一步（EXPLORING 決定下一節點、REST 結束休息...）。
     */
    const advance = async (characterId: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;

        try {
            await api.post<AdvanceResponse>('/api/adventure/advance', { characterId });
            await fetchCurrent(characterId);
            return true;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to advance adventure:', err);
            error.value = extractErrorMessage(err, '無法推進冒險');
            loading.value = false;
            return false;
        }
    };

    /**
     * 結束目前的冒險並取得結算結果。
     */
    const end = async (characterId: string): Promise<EndRunResult | null> => {
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<EndRunResponse>('/api/adventure/end', { characterId });
            currentRun.value = null;
            return response.data;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to end adventure:', err);
            error.value = extractErrorMessage(err, '無法結束冒險');
            return null;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 在休息節點使用藥水（永久背包或本次冒險掉落皆可）。
     */
    const useHealingItem = async (characterId: string, itemId: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;

        try {
            await api.post<HealResponse>('/api/adventure/rest/heal', {
                characterId, itemId, 
            });
            await fetchCurrent(characterId);
            return true;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to use healing item:', err);
            error.value = extractErrorMessage(err, '使用藥水失敗');
            loading.value = false;
            return false;
        }
    };

    return {
        currentRun: computed(() => currentRun.value),
        hasActiveRun: computed(() => currentRun.value !== null),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        checked: computed(() => checked.value),
        fetchCurrent,
        start,
        advance,
        end,
        useHealingItem,
    };
};
