export type QuestProgress = {
    questId: string;
    templateId: string;
    characterId: string;
    date?: string; // present on daily quests only
    name: string;
    description: string;
    currentCount: number;
    targetCount: number;
    completed: boolean;
    rewardGold: number;
    rewardGems: number;
    claimed: boolean;
    claimedAt?: number;
};

interface GetQuestsResponse {
    success: boolean;
    data: { quests: QuestProgress[] };
}

interface ClaimQuestResponse {
    success: boolean;
    data: { goldEarned: number; gemsEarned: number };
}

const dailyQuests = ref<QuestProgress[]>([]);
const persistentQuests = ref<QuestProgress[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const claimLoading = ref(false);
const claimError = ref<string | null>(null);

/**
 * Quests Composable
 * 管理目前選定角色的每日任務（GET .../quests/daily）與常駐任務
 * （GET .../quests/persistent），以及各自的領取流程。
 */
export const useQuests = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const fetchDaily = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetQuestsResponse>(
                `/api/character/${selectedCharacterId.value}/quests/daily`,
            );
            dailyQuests.value = response.data.quests;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useQuests] Failed to fetch daily quests:', err);
            error.value = err.message || '無法取得每日任務';
        } finally {
            loading.value = false;
        }
    };

    const fetchPersistent = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetQuestsResponse>(
                `/api/character/${selectedCharacterId.value}/quests/persistent`,
            );
            persistentQuests.value = response.data.quests;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useQuests] Failed to fetch persistent quests:', err);
            error.value = err.message || '無法取得常駐任務';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 領取一個每日或常駐任務的獎勵；成功後在本地樂觀更新該任務為已領取，
     * 並重新整理角色資料（gold/gems 已變動）。
     */
    const claim = async (questId: string, kind: 'daily' | 'persistent'): Promise<boolean> => {
        if (!selectedCharacterId.value) return false;

        claimLoading.value = true;
        claimError.value = null;

        try {
            await api.post<ClaimQuestResponse>(
                `/api/character/${selectedCharacterId.value}/quests/${kind}/claim/${questId}`,
            );

            const list = kind === 'daily' ? dailyQuests.value : persistentQuests.value;
            const target = list.find(quest => quest.questId === questId);
            if (target) target.claimed = true;

            await useCharacter().fetchCharacter();
            return true;
        } catch (err: any) {
            console.error('[useQuests] Failed to claim quest:', err);
            claimError.value = err.message || '領取失敗';
            return false;
        } finally {
            claimLoading.value = false;
        }
    };

    const reset = () => {
        dailyQuests.value = [];
        persistentQuests.value = [];
        loaded.value = false;
        error.value = null;
        loading.value = false;
        claimError.value = null;
        claimLoading.value = false;
    };

    return {
        dailyQuests: computed(() => dailyQuests.value),
        persistentQuests: computed(() => persistentQuests.value),
        loading: computed(() => loading.value),
        loaded: computed(() => loaded.value),
        error: computed(() => error.value),
        claimLoading: computed(() => claimLoading.value),
        claimError: computed(() => claimError.value),
        hasClaimable: computed(() => [...dailyQuests.value, ...persistentQuests.value].some(q => q.completed && !q.claimed)),
        fetchDaily,
        fetchPersistent,
        claim,
        reset,
    };
};
