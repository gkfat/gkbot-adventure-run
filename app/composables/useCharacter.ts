interface CharacterStats {
    ATK: number;
    DEF: number;
    HP_MAX: number;
    HP_CURRENT: number;
    actionIntervalSec: number;
    critChance: number;
    critMultiplier: number;
    dodgeChance: number;
}

interface CharacterData {
    characterId: string;
    level: number;
    exp: number;
    gold: number;
    gems: number;
    attributes: {
        STR: number;
        AGI: number;
        CON: number;
        LUCK: number;
    };
    unspentAttributePoints: number;
    nickname: string;
    stats: CharacterStats;
}

interface GetCharacterResponse {
    success: boolean;
    data: CharacterData;
}

const character = ref<CharacterData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

/**
 * Character Composable
 * 首次登入時 server 會自動建立角色，這裡負責拉取並快取角色資料
 */
export const useCharacter = () => {
    const api = useApi();

    /**
     * 取得目前角色資料（含 server 即時計算的 stats）
     */
    const fetchCharacter = async () => {
        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetCharacterResponse>('/api/character');
            character.value = response.data;
        } catch (err: any) {
            console.error('[useCharacter] Failed to fetch character:', err);
            error.value = err.message || '無法取得角色資料';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 重置本地快取（登出時使用）
     */
    const reset = () => {
        character.value = null;
        error.value = null;
        loading.value = false;
    };

    return {
        character: computed(() => character.value),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        fetchCharacter,
        reset,
    };
};
