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
    archetypeId: string;
    className: string;
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
    spriteUrl: string;
    stats: CharacterStats;
}

interface CharacterSummary {
    characterId: string;
    nickname: string;
    level: number;
    gold: number;
    gems: number;
    archetypeId: string;
    className: string;
    spriteUrl: string;
}

interface Archetype {
    archetypeId: string;
    className: string;
    attributes: { STR: number; AGI: number; CON: number; LUCK: number };
    spriteUrl: string;
}

interface GetCharacterResponse {
    success: boolean;
    data: CharacterData;
}

interface GetRosterResponse {
    success: boolean;
    data: { characters: CharacterSummary[]; archetypes: Archetype[] };
}

const CHARACTER_ROSTER_MAX = 3;

// Roster state
const roster = ref<CharacterSummary[]>([]);
const archetypes = ref<Archetype[]>([]);
const rosterLoading = ref(false);
const rosterError = ref<string | null>(null);
const rosterLoaded = ref(false);

// Selected character state
const selectedCharacterId = ref<string | null>(null);
const character = ref<CharacterData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const storageKey = (accountId: string) => `gkbot:selectedCharacterId:${accountId}`;

/**
 * Character Roster Composable
 * 管理帳號的角色清單（roster）、可選範本，以及目前選定角色的完整資料
 */
export const useCharacter = () => {
    const api = useApi();
    const { user } = useAuth();

    /**
     * 取得角色清單與可選範本；若本地曾記住選定角色且仍存在於清單中，自動載入它
     */
    const fetchRoster = async () => {
        rosterLoading.value = true;
        rosterError.value = null;

        try {
            const response = await api.get<GetRosterResponse>('/api/character/roster');
            roster.value = response.data.characters;
            archetypes.value = response.data.archetypes;
            rosterLoaded.value = true;

            const accountId = user.value?.uid;
            const remembered = accountId ? localStorage.getItem(storageKey(accountId)) : null;
            const stillExists = remembered && roster.value.some(c => c.characterId === remembered);

            if (stillExists && remembered) {
                await selectCharacter(remembered);
            } else if (remembered) {
                // Remembered character no longer exists (e.g. deleted account data elsewhere)
                selectedCharacterId.value = null;
                if (accountId) localStorage.removeItem(storageKey(accountId));
            }
        } catch (err: any) {
            console.error('[useCharacter] Failed to fetch roster:', err);
            rosterError.value = err.message || '無法取得角色列表';
        } finally {
            rosterLoading.value = false;
        }
    };

    /**
     * 選定一個角色，記住選擇並載入其完整資料
     */
    const selectCharacter = async (characterId: string) => {
        selectedCharacterId.value = characterId;
        const accountId = user.value?.uid;
        if (accountId) localStorage.setItem(storageKey(accountId), characterId);
        await fetchCharacter();
    };

    /**
     * 取得目前選定角色的完整資料（含 server 即時計算的 stats）
     */
    const fetchCharacter = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetCharacterResponse>(`/api/character/${selectedCharacterId.value}`);
            character.value = response.data;
        } catch (err: any) {
            console.error('[useCharacter] Failed to fetch character:', err);
            error.value = err.message || '無法取得角色資料';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 以指定範本建立新角色，成功後自動選定它
     */
    const createCharacter = async (archetypeId: string) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<GetCharacterResponse>('/api/character', { archetypeId });
            const created = response.data;

            roster.value = [...roster.value, {
                characterId: created.characterId,
                nickname: created.nickname,
                level: created.level,
                gold: created.gold,
                gems: created.gems,
                archetypeId: created.archetypeId,
                className: created.className,
                spriteUrl: archetypes.value.find(a => a.archetypeId === created.archetypeId)?.spriteUrl || '',
            }];

            await selectCharacter(created.characterId);
        } catch (err: any) {
            console.error('[useCharacter] Failed to create character:', err);
            error.value = err.message || '無法建立角色';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 清空選定角色，回到角色列表畫面
     */
    const clearSelection = () => {
        selectedCharacterId.value = null;
        character.value = null;
    };

    /**
     * 重置本地快取（登出時使用）
     */
    const reset = () => {
        roster.value = [];
        archetypes.value = [];
        rosterLoaded.value = false;
        selectedCharacterId.value = null;
        character.value = null;
        error.value = null;
        rosterError.value = null;
        loading.value = false;
        rosterLoading.value = false;
    };

    return {
        // Roster
        roster: computed(() => roster.value),
        archetypes: computed(() => archetypes.value),
        rosterLoading: computed(() => rosterLoading.value),
        rosterLoaded: computed(() => rosterLoaded.value),
        rosterError: computed(() => rosterError.value),
        rosterFull: computed(() => roster.value.length >= CHARACTER_ROSTER_MAX),
        fetchRoster,

        // Selected character
        selectedCharacterId: computed(() => selectedCharacterId.value),
        character: computed(() => character.value),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        selectCharacter,
        fetchCharacter,
        createCharacter,
        clearSelection,

        reset,
    };
};
