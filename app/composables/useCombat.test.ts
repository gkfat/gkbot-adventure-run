import {
    computed, reactive, ref, watch,
} from 'vue';
import {
    afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { CombatApiResult } from './useAdventureRun';
import type { CombatLogEntry } from '../../shared/types/adventure';

// useCombat.ts 的 ref/computed/watch/reactive/onUnmounted 都是 Nuxt 的
// auto-import（不是檔案自己 import 的），在 Nuxt/Vite 建置流程外用 vitest 直接
// 載入這個檔案時這些名字並不存在，所以測試自己把它們 stub 成全域變數。
// onUnmounted 用不到（測試不會卸載元件），stub 成 no-op 避免「no active
// component instance」的警告。
vi.stubGlobal('ref', ref);
vi.stubGlobal('computed', computed);
vi.stubGlobal('reactive', reactive);
vi.stubGlobal('watch', watch);
vi.stubGlobal('onUnmounted', () => {});

const { useCombat } = await import('./useCombat');

const buildResult = (combatLog: CombatLogEntry[]): CombatApiResult => ({
    combatLog,
    summary: {
        victory: true,
        roundCount: combatLog.length,
        playerHpRemaining: 100,
        expGained: 0,
        goldDropped: 0,
        gemsDropped: 0,
        itemsDropped: [],
        blessingPointsGained: 0,
        enemies: [
            {
                enemyId: 'enemy1', name: '測試敵人', level: 1, hpMax: 100, isBoss: false,
            },
        ],
        // completedAt 是 Firestore Timestamp，播放邏輯本身不會讀它，測試不需要真值。
    } as CombatApiResult['summary'],
});

// node 測試環境本來就沒有 requestAnimationFrame，這裡自己接管：不自動幫它排程
// 執行，而是把 callback 存起來，讓測試自己決定「畫面下一幀」什麼時候真的發生
// （pumpGaugeFrame）。這樣才能重現真正的 bug 場景——setTimeout（wall-clock，
// 驅動舊版 visibleGroupCount）已經到期，但 rAF（驅動充能條 nowMs）那一幀還沒
// 被瀏覽器排上——如果兩者共用同一顆假時鐘（例如都用 setTimeout 模擬），這個
// 時序差就會被時鐘本身抹平，測試也就測不出這個 bug（先前版本的測試就是這樣
// 誤判通過，見這次修復時的討論）。
let rafCallback: (() => void) | null = null;

const setupClocks = () => {
    vi.useFakeTimers({
        toFake: [
            'setTimeout',
            'clearTimeout',
            'performance',
        ], 
    });
    rafCallback = null;
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
        rafCallback = cb;
        return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => { rafCallback = null; });
};

// 推進「wall-clock」：setTimeout 到期（觸發 fx 相關計時器），但不動充能條的
// nowMs——模擬 rAF 那一幀還沒被排上的狀態。
const advanceWallClock = (ms: number) => vi.advanceTimersByTime(ms);

// 真的跑一次畫面幀：呼叫目前排隊的 rAF callback（會更新 nowMs，並在內部再排
// 下一幀，覆寫 rafCallback，讓下一次呼叫繼續往前推）。
const pumpGaugeFrame = () => {
    const cb = rafCallback;
    if (!cb) return;
    cb();
};

// 逐幀推進：wall-clock 與畫面幀同時前進 ms，模擬正常播放（rAF 沒有落後）。
const advanceFrame = (ms: number) => {
    advanceWallClock(ms);
    pumpGaugeFrame();
};

describe('useCombat — 行動條充能與攻擊動畫揭露同步', () => {
    beforeEach(setupClocks);
    afterEach(() => vi.useRealTimers());

    it('rAF 那一幀還沒追上時，揭露動作(visibleGroupCount)不能搶在充能條前面', () => {
        const entry: CombatLogEntry = {
            timestamp: 5000,
            wave: 0,
            actorId: 'player',
            targetId: 'enemy1',
            action: 'ATTACK',
            damage: 10,
            targetHpRemaining: 90,
        };
        const result = buildResult([entry]);
        const combat = useCombat(() => result, () => 100, () => 100);

        // 只推進 wall-clock（setTimeout）到遠超過這筆行動應該顯示的時間，但
        // 完全不呼叫 rAF callback——模擬「setTimeout 到期了，但這一幀畫面還
        // 沒真的被瀏覽器排上」。修復前：visibleGroupCount 由獨立的 setTimeout
        // 直接寫入，這裡就會被錯誤地揭露；修復後：visibleGroupCount 改成從
        // nowMs 反算，nowMs 沒被 rAF 更新就永遠停在 0，動作不會被揭露。
        advanceWallClock(20000);

        expect(combat.enemyCards.value.some(enemy => enemy.hpCurrent === 90)).toBe(false);
        expect(combat.playerGauge.value.percent).toBe(0);

        // 補跑一次畫面幀，nowMs 追上之後，動作才應該被揭露，且揭露當下充能
        // 條必須已經到 100%（不會停在兩者之間的中間值）。
        pumpGaugeFrame();
        expect(combat.enemyCards.value.some(enemy => enemy.hpCurrent === 90)).toBe(true);
        const { percent } = combat.playerGauge.value;
        expect(percent === 100 || percent === null).toBe(true);
    });

    it('充能百分比在行動觸發前隨時間單調遞增，不會提早跳到 100%', () => {
        const entry: CombatLogEntry = {
            timestamp: 5000,
            wave: 0,
            actorId: 'player',
            targetId: 'enemy1',
            action: 'ATTACK',
            damage: 10,
            targetHpRemaining: 90,
        };
        const result = buildResult([entry]);
        const combat = useCombat(() => result, () => 100, () => 100);

        const samples: number[] = [];
        for (let i = 0; i < 100; i += 1) {
            advanceFrame(16);
            const { percent } = combat.playerGauge.value;
            if (percent !== null && percent < 100) samples.push(percent);
        }

        expect(samples.length).toBeGreaterThan(1);
        for (let i = 1; i < samples.length; i += 1) {
            expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]!);
        }
    });

    it('多批 log 依序揭露，且不會早於各自排定的時間點', () => {
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 3000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 10, targetHpRemaining: 90,
            }, {
                timestamp: 6000, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'ATTACK', damage: 5, targetHpRemaining: 95,
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(() => result, () => 100, () => 100);

        let firstRevealSeenAt = -1;
        let secondRevealSeenAt = -1;
        for (let i = 0; i < 3000 && secondRevealSeenAt === -1; i += 1) {
            advanceFrame(16);
            const now = (i + 1) * 16;
            const enemyHit = combat.enemyCards.value.some(enemy => enemy.hpCurrent === 90);
            const playerHit = combat.playerStatus.value.hpCurrent === 95;
            if (enemyHit && firstRevealSeenAt === -1) firstRevealSeenAt = now;
            if (playerHit && secondRevealSeenAt === -1) secondRevealSeenAt = now;
        }

        expect(firstRevealSeenAt).toBeGreaterThan(0);
        expect(secondRevealSeenAt).toBeGreaterThan(firstRevealSeenAt);
    });

    it('週期中途被打中(凍結)過，行動觸發的那一刻充能條仍然要滿 100%，不能被暫停時間吃掉', () => {
        // 第一筆：player 在自己這個充能週期中途被打中一次（凍結 800ms 的視覺
        // 暫停）。第二筆：player 自己下一次出手，結束這個充能週期。
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'ATTACK', damage: 5, targetHpRemaining: 95,
            }, {
                timestamp: 5000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 10, targetHpRemaining: 90,
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(() => result, () => 100, () => 100);

        // 讀「揭露前最後一幀」而不是揭露那一幀本身：player 這裡是最後一次出手
        // （之後沒有排定的下一個週期），揭露當下 gaugeAt 可能已經切到「下一個
        // 還沒結束的週期」而回傳 null（跟這次要驗證的 stun 扣分 bug 無關，是
        // 另一個獨立、已知的邊界情況）。用揭露前最後一幀的百分比可以乾淨地只
        // 驗證「暫停時間有沒有正確從分母扣掉」這件事。
        let revealed = false;
        let percentJustBeforeReveal: number | null = null;
        for (let i = 0; i < 3000 && !revealed; i += 1) {
            const { percent } = combat.playerGauge.value;
            advanceFrame(16);
            revealed = combat.enemyCards.value.some(enemy => enemy.hpCurrent === 90);
            if (revealed) percentJustBeforeReveal = percent;
        }

        expect(revealed).toBe(true);
        expect(percentJustBeforeReveal).not.toBeNull();
        expect(percentJustBeforeReveal!).toBeGreaterThanOrEqual(99);
    });
});
