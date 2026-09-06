export type AchievementProgressView = {
    achievementId: string;
    templateId: string;
    characterId: string;
    name: string;
    description: string;
    currentCount: number;
    targetCount: number;
    completed: boolean;
    rewardGems: number;
    claimed: boolean;
    claimedAt?: number;
};

interface GetAchievementsResponse {
    success: boolean;
    data: { achievements: AchievementProgressView[] };
}

interface ClaimAchievementResponse {
    success: boolean;
    data: { gemsEarned: number };
}

const achievements = ref<AchievementProgressView[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const claimLoading = ref(false);
const claimError = ref<string | null>(null);

/**
 * Achievements Composable
 * 管理目前選定角色的成就清單（GET .../achievements）與領取流程
 * （該角色終身限領一次，見 openspec/changes/quests-and-achievements）
 */
export const useAchievements = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const fetchAchievements = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetAchievementsResponse>(
                `/api/character/${selectedCharacterId.value}/achievements`,
            );
            achievements.value = response.data.achievements;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useAchievements] Failed to fetch achievements:', err);
            error.value = err.message || '無法取得成就';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 領取一個成就的獎勵；成功後在本地樂觀更新該成就為已領取，
     * 並重新整理角色資料（gems 已變動）。
     */
    const claim = async (achievementId: string): Promise<boolean> => {
        if (!selectedCharacterId.value) return false;

        claimLoading.value = true;
        claimError.value = null;

        try {
            await api.post<ClaimAchievementResponse>(
                `/api/character/${selectedCharacterId.value}/achievements/claim/${achievementId}`,
            );

            const target = achievements.value.find(a => a.achievementId === achievementId);
            if (target) target.claimed = true;

            await useCharacter().fetchCharacter();
            return true;
        } catch (err: any) {
            console.error('[useAchievements] Failed to claim achievement:', err);
            claimError.value = err.message || '領取失敗';
            return false;
        } finally {
            claimLoading.value = false;
        }
    };

    const reset = () => {
        achievements.value = [];
        loaded.value = false;
        error.value = null;
        loading.value = false;
        claimError.value = null;
        claimLoading.value = false;
    };

    return {
        achievements: computed(() => achievements.value),
        loading: computed(() => loading.value),
        loaded: computed(() => loaded.value),
        error: computed(() => error.value),
        claimLoading: computed(() => claimLoading.value),
        claimError: computed(() => claimError.value),
        hasClaimable: computed(() => achievements.value.some(a => a.completed && !a.claimed)),
        fetchAchievements,
        claim,
        reset,
    };
};
