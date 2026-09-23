import type { MeResponse } from '../../shared/schemas/api/auth.schema';
import type {
    UpdateAccountSettingsRequest, UpdateAccountSettingsResponse,
} from '../../shared/schemas/api/account.schema';

const bgmEnabled = ref(true);
const sfxEnabled = ref(true);
const error = ref<string | null>(null);

let currentBgm: HTMLAudioElement | null = null;
// 記住最後一次要求播放的曲目，讓關閉後重新打開 BGM 開關、或分頁恢復可見時能從
// 原本的曲目繼續播放（開關/可見度本身不記得「播到哪首」）。
let lastBgmTrack: string | null = null;
// 分頁不可見（切到背景分頁）或視窗失焦時暫停播放，恢復時只重播「因為這個原因
// 而暫停」的 BGM——使用者自己按開關關閉的不會被這裡誤重播（見 stopBgm）。
let pageAudible = true;
let bgmPausedByVisibility = false;

/**
 * 依目前 bgmEnabled 讓實際播放狀態與之同步：開啟且有記住曲目時（重新）播放，
 * 否則停止——playBgm 內部本來就會先 stopBgm() 再播，所以直接呼叫即可。
 */
function syncBgmPlayback(): void {
    if (bgmEnabled.value && lastBgmTrack) {
        playBgm(lastBgmTrack);
    } else {
        stopBgm();
    }
}

/**
 * 播放背景音樂（迴圈播放）。開關關閉、分頁不可見，或音檔載入/播放失敗時
 * 靜默失敗（分頁不可見時只記住曲目，不在背景嘗試播放，等恢復可見再播）。
 */
function playBgm(track: string): void {
    lastBgmTrack = track;
    if (!bgmEnabled.value || !pageAudible) return;

    try {
        stopBgm();
        const audio = new Audio(`/audio/bgm/${track}`);
        audio.loop = true;
        currentBgm = audio;
        audio.play().catch((err) => {
            console.warn('[useAudio] Failed to play BGM:', track, err);
        });
    } catch (err) {
        console.warn('[useAudio] Failed to load BGM:', track, err);
    }
}

function stopBgm(): void {
    if (currentBgm) {
        currentBgm.pause();
        currentBgm = null;
    }
    bgmPausedByVisibility = false;
}

/**
 * 播放單次音效。開關關閉、分頁不可見，或音檔載入/播放失敗時靜默失敗。
 */
function playSfx(sound: string): void {
    if (!sfxEnabled.value || !pageAudible) return;

    try {
        const audio = new Audio(`/audio/sfx/${sound}`);
        audio.play().catch((err) => {
            console.warn('[useAudio] Failed to play SFX:', sound, err);
        });
    } catch (err) {
        console.warn('[useAudio] Failed to load SFX:', sound, err);
    }
}

/**
 * 分頁可見度／視窗焦點變化時同步播放狀態：不可見/失焦就暫停目前的 BGM（保留
 * 播放進度，不清空 currentBgm），恢復可見/取得焦點時只重播「因此而暫停」的
 * 那次，不會覆蓋使用者自己手動關閉 BGM 的選擇。
 */
function handleAudibilityChange(): void {
    if (typeof document === 'undefined') return;
    const audible = !document.hidden && document.hasFocus();
    if (audible === pageAudible) return;
    pageAudible = audible;

    if (!audible) {
        if (currentBgm && !currentBgm.paused) {
            currentBgm.pause();
            bgmPausedByVisibility = true;
        }
        return;
    }

    if (!bgmEnabled.value || !lastBgmTrack) return;

    // 兩種情況都要恢復播放：(a) 我們自己暫停的，直接在原本的 Audio 上續播；
    // (b) 分頁一開始就不可見／沒有焦點，BGM 根本還沒開始播過（currentBgm 為
    // null），這時候直接重新開始播放 lastBgmTrack。
    if (bgmPausedByVisibility && currentBgm) {
        currentBgm.play().catch((err) => {
            console.warn('[useAudio] Failed to resume BGM:', err);
        });
    } else if (!currentBgm) {
        playBgm(lastBgmTrack);
    }
    bgmPausedByVisibility = false;
}

if (typeof document !== 'undefined') {
    pageAudible = !document.hidden && document.hasFocus();
    document.addEventListener('visibilitychange', handleAudibilityChange);
    window.addEventListener('blur', handleAudibilityChange);
    window.addEventListener('focus', handleAudibilityChange);
}

/**
 * Audio Settings & Playback Composable
 * 管理帳號層級的 BGM/SFX 開關（與 server 同步）並提供播放 API。
 * 音檔尚未就位時 play* 方法靜默失敗，不影響呼叫端流程。
 */
export const useAudio = () => {
    const api = useApi();

    /**
     * 登入後（或已登入狀態下重新整理頁面後）取得目前帳號的音效設定
     */
    const fetchSettings = async (): Promise<void> => {
        try {
            const response = await api.get<MeResponse>('/api/auth/me');
            bgmEnabled.value = response.data.bgmEnabled;
            sfxEnabled.value = response.data.sfxEnabled;
        } catch (err: any) {
            console.error('[useAudio] Failed to fetch audio settings:', err);
            error.value = err.message || '無法取得音效設定';
        }
    };

    /**
     * 樂觀更新後呼叫 API 持久化；失敗時回滾並記錄錯誤訊息
     */
    const persistSettings = async (patch: UpdateAccountSettingsRequest): Promise<boolean> => {
        try {
            await api.put<UpdateAccountSettingsResponse>('/api/account/settings', patch);
            error.value = null;
            return true;
        } catch (err: any) {
            console.error('[useAudio] Failed to update audio settings:', err);
            error.value = err.message || '音效設定更新失敗';
            return false;
        }
    };

    const toggleBgm = async (): Promise<void> => {
        const previous = bgmEnabled.value;
        bgmEnabled.value = !previous;
        syncBgmPlayback();

        const success = await persistSettings({ bgmEnabled: bgmEnabled.value });
        if (!success) {
            bgmEnabled.value = previous;
            syncBgmPlayback();
        }
    };

    const toggleSfx = async (): Promise<void> => {
        const previous = sfxEnabled.value;
        sfxEnabled.value = !previous;

        const success = await persistSettings({ sfxEnabled: sfxEnabled.value });
        if (!success) {
            sfxEnabled.value = previous;
        }
    };

    /**
     * 清除錯誤訊息（例如錯誤提示關閉時呼叫）
     */
    const clearError = (): void => {
        error.value = null;
    };

    /**
     * 登出時重置為預設值，避免殘留前一個帳號的設定
     */
    const reset = (): void => {
        stopBgm();
        lastBgmTrack = null;
        bgmEnabled.value = true;
        sfxEnabled.value = true;
        error.value = null;
    };

    return {
        bgmEnabled: computed(() => bgmEnabled.value),
        sfxEnabled: computed(() => sfxEnabled.value),
        error: computed(() => error.value),

        fetchSettings,
        toggleBgm,
        toggleSfx,
        playBgm,
        stopBgm,
        playSfx,
        clearError,
        reset,
    };
};
