export type LeaderboardEntryView = {
    seasonId: string;
    accountId: string;
    characterId: string;
    nickname: string;
    score: number;
    runId: string;
    achievedAt: number;
    step?: number;
    killCount?: number;
};

interface GetLeaderboardResponse {
    success: boolean;
    data: {
        entries: LeaderboardEntryView[];
        total: number;
        seasonEndsAt: number;
        myRank?: number;
        myEntry?: LeaderboardEntryView;
    };
}

const entries = ref<LeaderboardEntryView[]>([]);
const total = ref(0);
const seasonEndsAt = ref<number | null>(null);
const myRank = ref<number | undefined>(undefined);
const myEntry = ref<LeaderboardEntryView | undefined>(undefined);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const now = ref(Date.now());

/**
 * Leaderboard Composable
 * 取得本賽季排行榜（GET /api/leaderboard）與自己的名次，並提供賽季倒數
 * （見 openspec/changes/leaderboard-season）。倒數一律以伺服器回傳的
 * seasonEndsAt 為準，前端只做「目前時間到 seasonEndsAt 的差值」顯示，
 * 不自行重算週邊界規則。
 */
export const useLeaderboard = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const fetchLeaderboard = async (limit = 50) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetLeaderboardResponse>('/api/leaderboard', {
                query: {
                    limit,
                    ...(selectedCharacterId.value ? { characterId: selectedCharacterId.value } : {}),
                },
            });
            entries.value = response.data.entries;
            total.value = response.data.total;
            seasonEndsAt.value = response.data.seasonEndsAt;
            myRank.value = response.data.myRank;
            myEntry.value = response.data.myEntry;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useLeaderboard] Failed to fetch leaderboard:', err);
            error.value = err.message || '無法取得排行榜';
        } finally {
            loading.value = false;
        }
    };

    let timer: ReturnType<typeof setInterval> | null = null;

    const stopCountdown = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    };

    const startCountdown = () => {
        stopCountdown();
        now.value = Date.now();
        timer = setInterval(() => {
            now.value = Date.now();
        }, 1000);
    };

    onUnmounted(stopCountdown);

    const remainingMs = computed(() => (
        seasonEndsAt.value ? Math.max(0, seasonEndsAt.value - now.value) : 0
    ));

    const countdownText = computed(() => {
        const totalSec = Math.floor(remainingMs.value / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        return days > 0
            ? `${days} 天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
            : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    });

    return {
        entries: computed(() => entries.value),
        total: computed(() => total.value),
        seasonEndsAt: computed(() => seasonEndsAt.value),
        myRank: computed(() => myRank.value),
        myEntry: computed(() => myEntry.value),
        loading: computed(() => loading.value),
        loaded: computed(() => loaded.value),
        error: computed(() => error.value),
        countdownText,
        fetchLeaderboard,
        startCountdown,
        stopCountdown,
    };
};
