import {
    PRELOAD_AUDIO_PATHS, PRELOAD_IMAGE_PATHS, 
} from '../constants/preloadAssets';

// 同時下載數上限，避免一次發出 200+ 個請求塞爆行動網路連線。
const MAX_CONCURRENT_LOADS = 8;

const loadedCount = ref(0);
const totalCount = ref(0);

/**
 * 預先建立 Image 物件觸發下載，成功/失敗皆 resolve（單一素材下載失敗不應卡住
 * 整個 loading 流程）。
 */
function loadImage(path: string): Promise<void> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = path;
    });
}

/**
 * 呼叫 load()（不 play）觸發音檔下載並讓瀏覽器準備好播放緩衝，
 * 成功/失敗皆 resolve，理由同 loadImage。
 */
function loadAudio(path: string): Promise<void> {
    return new Promise((resolve) => {
        const audio = new Audio();
        const finish = () => resolve();
        audio.addEventListener('canplaythrough', finish, { once: true });
        audio.addEventListener('error', finish, { once: true });
        audio.src = path;
        audio.load();
    });
}

async function runWithConcurrency(tasks: (() => Promise<void>)[], limit: number): Promise<void> {
    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (nextIndex < tasks.length) {
            const current = nextIndex++;
            await tasks[current]();
            loadedCount.value++;
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

/**
 * Asset Preloader Composable
 * 在進入主畫面前預先下載遊戲圖片與音效素材（見 PRELOAD_IMAGE_PATHS /
 * PRELOAD_AUDIO_PATHS），並提供進度供 loading 畫面顯示 progress bar。
 */
export const useAssetPreloader = () => {
    const progress = computed(() => (
        totalCount.value === 0 ? 0 : Math.round((loadedCount.value / totalCount.value) * 100)
    ));

    const preloadAssets = async (): Promise<void> => {
        loadedCount.value = 0;
        totalCount.value = PRELOAD_IMAGE_PATHS.length + PRELOAD_AUDIO_PATHS.length;

        const tasks: (() => Promise<void>)[] = [...PRELOAD_IMAGE_PATHS.map((path) => () => loadImage(path)), ...PRELOAD_AUDIO_PATHS.map((path) => () => loadAudio(path))];

        await runWithConcurrency(tasks, MAX_CONCURRENT_LOADS);
    };

    return {
        progress,
        loadedCount: computed(() => loadedCount.value),
        totalCount: computed(() => totalCount.value),
        preloadAssets,
    };
};
