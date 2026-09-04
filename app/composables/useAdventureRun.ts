import type {
    AdventureStateType, AdventureEndReason, NodeType, CombatSummary, CombatLogEntry, EnemyPreview,
    FacilitySeverity, EnemyFaction, BlessingEntry, RunModifier,
} from '../../shared/types/adventure';
import type { BlessingRarity } from '../../shared/constants/blessings';
import type { Rarity } from '../../shared/types/common';
import type { ItemInstance } from '../../shared/types/item';

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
    chapterIndex: number;
    stageNodeIndex: number;
    stageNodeCount: number;
    severityTier: FacilitySeverity;
    factionType: EnemyFaction;
    currentNodeType?: NodeType;
    currentNodeData?: unknown;
    playerHp: number;
    playerHpMax: number;
    blessingPoints: number;
    blessings: BlessingEntry[];
    curses: string[];
    runInventory: AdventureRunItem[];
    expEarned: number;
    goldEarned: number;
    gemsEarned: number;
};

// Settlement summary — run ended (any reason), see single-stage-run-settlement.
export type SettlementView = {
    endReason: AdventureEndReason;
    goldEarned: number;
    gemsEarned: number;
    items: ItemInstance[];
    untransferredItemIds: string[];
    expGained: number;
    leveledUp: boolean;
    newLevel: number;
    unspentAttributePointsGained: number;
    forfeitedGold: number;
    forfeitedGems: number;
    forfeitedItems: ItemInstance[];
};

// Shape of `currentNodeData` while state=COMBAT (set by advanceFromExploring).
export type CombatNodeData = {
    enemyLevel: number;
    tier: NodeType;
    waveCount: number;
    enemyCountPerWave: number;
    firstWaveEnemies: EnemyPreview[];
};

type GetCurrentResponse = {
    success: boolean;
    data: AdventureRunView | null;
    settlement?: SettlementView;
};

type AbandonResponse = {
    success: boolean;
    data: { settlement: SettlementView };
};

type AdvanceResponse = {
    success: boolean;
    data: {
        state: AdventureStateType;
        step: number;
        nodeType?: NodeType;
        settlement?: SettlementView;
    };
};

type HealResponse = {
    success: boolean;
    data: { hpHealed: number; hpCurrent: number };
};

// Response shape of POST /api/adventure/combat/start — combatLog + the
// persisted CombatSummary (both shared/types/adventure.ts types, re-exported
// above rather than redefined here to avoid an auto-import name collision).
export type CombatApiResult = {
    combatLog: CombatLogEntry[];
    summary: CombatSummary;
    settlement?: SettlementView;
};

type StartCombatResponse = {
    success: boolean;
    data: CombatApiResult;
};

// Shape of `currentNodeData` while state=REST (set by advanceFromExploring).
export type RestNodeData = {
    autoHealAmount: number;
};

// Shape of `currentNodeData` while state=EVENT (set by advanceFromExploring).
export type EventNodeData = {
    eventTemplateId: string;
    eventType: string;
    description: string;
    choices?: { label: string }[];
};

// Shape of `currentNodeData` while state=BLESSING_SELECT — each candidate
// already carries the rarity + level it would grant/upgrade to if picked
// (blessing-leveling/design.md Decision 3).
export type BlessingCandidate = Pick<RunModifier, 'statModifiers' | 'dropRateMultiplier'> & {
    modifierId: string;
    name: string;
    description: string;
    rarity: BlessingRarity;
    level: number;
};
export type BlessingNodeData = {
    candidates: BlessingCandidate[];
};

export type EventOutcome = {
    eventId: string;
    eventType: string;
    description: string;
    hpHealed?: number;
    blessingGranted?: BlessingEntry;
    curseApplied?: string;
    goldGained?: number;
    gemsGained?: number;
    itemsGained?: unknown[];
};

type ResolveEventResponse = {
    success: boolean;
    data: EventOutcome;
};

type SelectBlessingResponse = {
    success: boolean;
    data: { blessing: BlessingCandidate };
};

// 冒險記事本：本次 run 期間累積的所有 log（戰鬥、事件、休息用藥、祝福選擇），
// 依發生順序（正序）排列，供 GameAdventureLogDialog 顯示。純前端記憶，
// 換一場新 run（或目前沒有 run）時清空，重新整理頁面後也會歸零 —
// 沒有對應的伺服端持久化需求（見 CLAUDE.md 冒險 run 狀態機說明）。
export type RunLogEntry =
    | { kind: 'COMBAT'; seq: number; data: CombatApiResult }
    | { kind: 'EVENT'; seq: number; data: EventOutcome }
    | { kind: 'HEAL'; seq: number; hpHealed: number }
    | { kind: 'BLESSING'; seq: number; name: string; description: string };

// Shared module-level state — same singleton-composable pattern as useCharacter.ts
const currentRun = ref<AdventureRunView | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const checked = ref(false); // whether fetchCurrent has resolved at least once
const lastCombatResult = ref<CombatApiResult | null>(null);
const lastEventResult = ref<EventOutcome | null>(null);
const lastSettlement = ref<SettlementView | null>(null);
// A settlement delivered by startCombat() on a loss, held back from
// lastSettlement until the caller confirms GameAdventureCombatResultPanel finished
// playing back the combat log — see startCombat/commitPendingSettlement.
const pendingSettlement = ref<SettlementView | null>(null);
let pendingSettlementCharacterId: string | null = null;
const runLog = ref<RunLogEntry[]>([]);
const runLogRunId = ref<string | null>(null);
let runLogSeq = 0;

const appendRunLog = (entry: Omit<RunLogEntry, 'seq'>) => {
    runLog.value.push({
        ...entry, seq: runLogSeq++, 
    } as RunLogEntry);
};

// runId 改變（新 run 開始）或目前沒有 run 時，清空記事本。
const syncRunLogLifecycle = (run: AdventureRunView | null) => {
    const runId = run?.runId ?? null;
    if (runId === runLogRunId.value) return;
    runLogRunId.value = runId;
    runLog.value = [];
    runLogSeq = 0;
};

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
            syncRunLogLifecycle(response.data);
            if (response.settlement) {
                lastSettlement.value = response.settlement;
            }
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
        if (loading.value) return false;
        loading.value = true;
        error.value = null;
        // Starting a new run makes any previously shown settlement (e.g.
        // from a just-abandoned run) stale — clear it so /adventure doesn't
        // render the old summary instead of the fresh run.
        lastSettlement.value = null;
        pendingSettlement.value = null;
        pendingSettlementCharacterId = null;

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
        if (loading.value) return false;
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<AdvanceResponse>('/api/adventure/advance', { characterId });
            if (response.data.settlement) {
                lastSettlement.value = response.data.settlement;
            }
            await fetchCurrent(characterId);
            // RESOLUTION is the only state that should display a previous
            // node's result — clear both once we've left it, so a later
            // RESOLUTION (e.g. after a REST node) doesn't show stale data
            // from an earlier, unrelated COMBAT/EVENT.
            if (currentRun.value?.state !== 'RESOLUTION') {
                lastCombatResult.value = null;
                lastEventResult.value = null;
            }
            return true;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to advance adventure:', err);
            error.value = extractErrorMessage(err, '無法推進冒險');
            loading.value = false;
            return false;
        }
    };

    /**
     * 在休息節點使用藥水（永久背包或本次冒險掉落皆可）。
     */
    const useHealingItem = async (characterId: string, itemId: string): Promise<boolean> => {
        if (loading.value) return false;
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<HealResponse>('/api/adventure/rest/heal', {
                characterId, itemId,
            });
            appendRunLog({
                kind: 'HEAL', hpHealed: response.data.hpHealed, 
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

    /**
     * 觸發目前 COMBAT 節點的戰鬥，取得 combatLog 與結算摘要。
     */
    const startCombat = async (characterId: string): Promise<boolean> => {
        if (loading.value) return false;
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<StartCombatResponse>('/api/adventure/combat/start', { characterId });
            lastCombatResult.value = response.data;
            // Not appended to runLog here — GameAdventureCombatResultPanel plays the
            // combatLog back sequentially, so writing the full result now
            // would let the 記事本 spoil an in-progress fight. The caller
            // (adventure.vue) calls commitCombatLog() once the panel's
            // `playback-done` event fires.
            if (response.data.settlement) {
                // A loss ends the run right away (server marks it ENDED), so
                // fetchCurrent() below would flip currentRun to null before the
                // player has even seen the fight play out — the page would
                // bounce straight to the "no active run" empty state instead
                // of GameAdventureCombatResultPanel (see known-issue.md). Hold the
                // settlement and skip refetching until playback finishes;
                // the caller applies it via commitPendingSettlement().
                pendingSettlement.value = response.data.settlement;
                pendingSettlementCharacterId = characterId;
                loading.value = false;
                return true;
            }
            await fetchCurrent(characterId);
            return true;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to start combat:', err);
            error.value = extractErrorMessage(err, '戰鬥失敗');
            loading.value = false;
            return false;
        }
    };

    /**
     * 解決目前 EVENT 節點（若有 choices 需帶 choiceIndex）。
     */
    const resolveEvent = async (characterId: string, choiceIndex?: number): Promise<boolean> => {
        if (loading.value) return false;
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<ResolveEventResponse>('/api/adventure/event/resolve', {
                characterId, choiceIndex,
            });
            lastEventResult.value = response.data;
            appendRunLog({
                kind: 'EVENT', data: response.data, 
            });
            await fetchCurrent(characterId);
            return true;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to resolve event:', err);
            error.value = extractErrorMessage(err, '事件處理失敗');
            loading.value = false;
            return false;
        }
    };

    /**
     * 從目前 BLESSING_SELECT 候選中選擇一個。
     */
    const selectBlessing = async (characterId: string, blessingId: string): Promise<boolean> => {
        if (loading.value) return false;
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<SelectBlessingResponse>('/api/adventure/blessing/select', {
                characterId, blessingId,
            });
            appendRunLog({
                kind: 'BLESSING', name: response.data.blessing.name, description: response.data.blessing.description,
            });
            await fetchCurrent(characterId);
            return true;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to select blessing:', err);
            error.value = extractErrorMessage(err, '選擇祝福失敗');
            loading.value = false;
            return false;
        }
    };

    /**
     * 玩家在結算頁按下「返回首頁」後呼叫，清空本地暫存的結算摘要。
     */
    const clearSettlement = () => {
        lastSettlement.value = null;
    };

    /**
     * 把目前的 `lastCombatResult` 寫進記事本（runLog）。呼叫時機是
     * GameAdventureCombatResultPanel 的 `playback-done` 事件觸發後，而不是戰鬥
     * API 一回來就寫——避免玩家還沒看完戰鬥演繹，記事本就先暴雷結果。
     */
    const commitCombatLog = () => {
        if (!lastCombatResult.value) return;
        appendRunLog({
            kind: 'COMBAT', data: lastCombatResult.value,
        });
    };

    /**
     * 套用 startCombat() 因為戰敗而暫扣住的結算摘要，並重新抓一次 run（此時
     * 才會真的變成 null）。呼叫時機跟 commitCombatLog() 一樣，是
     * GameAdventureCombatResultPanel 的 `playback-done` 事件觸發後——見 startCombat
     * 裡的說明，戰敗結算不能在玩家看完戰鬥演繹前就套用。
     */
    const commitPendingSettlement = async () => {
        if (!pendingSettlement.value) return;
        const characterId = pendingSettlementCharacterId;
        lastSettlement.value = pendingSettlement.value;
        pendingSettlement.value = null;
        pendingSettlementCharacterId = null;
        if (characterId) {
            await fetchCurrent(characterId);
        }
    };

    /**
     * 立即放棄目前進行中的 run，強制以 DISCONNECT 結算（只取回 exp）。
     * 用於 main 頁「放棄本次冒險」按鈕，以及 /adventure 頁偵測到冷啟動
     * （直接載入/重新整理瀏覽器）時的自動放棄（known-issue.md #8）。
     */
    const abandon = async (characterId: string): Promise<boolean> => {
        if (loading.value) return false;
        loading.value = true;
        error.value = null;

        try {
            const response = await api.post<AbandonResponse>('/api/adventure/abandon', { characterId });
            currentRun.value = null;
            syncRunLogLifecycle(null);
            lastSettlement.value = response.data.settlement;
            return true;
        } catch (err: unknown) {
            console.error('[useAdventureRun] Failed to abandon adventure:', err);
            error.value = extractErrorMessage(err, '放棄冒險失敗');
            return false;
        } finally {
            loading.value = false;
            checked.value = true;
        }
    };

    return {
        currentRun: computed(() => currentRun.value),
        hasActiveRun: computed(() => currentRun.value !== null),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        checked: computed(() => checked.value),
        lastCombatResult: computed(() => lastCombatResult.value),
        lastEventResult: computed(() => lastEventResult.value),
        lastSettlement: computed(() => lastSettlement.value),
        runLog: computed(() => runLog.value),
        fetchCurrent,
        start,
        advance,
        useHealingItem,
        startCombat,
        resolveEvent,
        selectBlessing,
        clearSettlement,
        commitCombatLog,
        commitPendingSettlement,
        abandon,
    };
};
