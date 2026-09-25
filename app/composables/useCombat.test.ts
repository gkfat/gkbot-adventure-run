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

    it('被 FREEZE 命中時，充能條要暫停完整的 statusDurationSec，不能只暫停固定的 STUN_MS', () => {
        // enemy1 對 player 施放凍結 3 秒（statusDurationSec: 3），player 自己
        // 下一次出手（結束這個充能週期）排在 6000ms。修復前：暫停窗口固定用
        // 800ms 的 STUN_MS，凍結期間絕大部分時間充能條仍會正常往上跑，不會
        // 出現一段跟 statusDurationSec 對得上、真正停滯的區間。
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'SKILL', skillId: 'enemy_freeze', skillName: '凍結', statusEffectKind: 'FREEZE', statusDurationSec: 3,
            }, {
                timestamp: 6000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 10, targetHpRemaining: 90,
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(() => result, () => 100, () => 100);

        const samples: (number | null)[] = [];
        let revealed = false;
        for (let i = 0; i < 3000 && !revealed; i += 1) {
            advanceFrame(16);
            samples.push(combat.playerGauge.value.percent);
            revealed = combat.enemyCards.value.some(enemy => enemy.hpCurrent === 90);
        }

        expect(revealed).toBe(true);

        // 找出樣本中最長的一段「連續相同百分比」區間，換算回毫秒——這段代表
        // 充能條真正被暫停不動的時長，應該貼近 statusDurationSec（3000ms），
        // 而不是舊版固定的 STUN_MS（800ms）。只看嚴格介於 0%~100% 之間的值：
        // 排除開戰 banner 播放期間（percent 固定是 0，本身就有超過 2.7 秒的
        // 合法停滯，跟 FREEZE 暫停無關）與充能滿後等待揭露的 100% 停滯。
        let longestRun = 0;
        let currentRun = 0;
        for (let i = 1; i < samples.length; i += 1) {
            const isChargingValue = samples[i] !== null && samples[i]! > 0 && samples[i]! < 100;
            if (isChargingValue && samples[i] === samples[i - 1]) {
                currentRun += 1;
                longestRun = Math.max(longestRun, currentRun);
            } else {
                currentRun = 0;
            }
        }
        const longestPauseMs = longestRun * 16;

        expect(longestPauseMs).toBeGreaterThanOrEqual(2500);
    });

    it('行動條開始暫停的那一刻要對齊敵人受創/凍結狀態真正揭露的那一刻，不能提早 SKILL_WINDUP_MS', () => {
        // 同一筆 FREEZE log：schedule（驅動 playerStatusBadge 揭露）跟
        // gaugeSchedule（驅動 playerGauge 的暫停窗口）過去對「這一批技能觸發
        // 事件的 actAt/displayAt」算法不一致——schedule 把 SKILL_WINDUP_MS
        // 算進這一批自己的 displayAt，gaugeSchedule 卻只把它累加給「後面」的
        // 批次，導致充能條提早 SKILL_WINDUP_MS（800ms）開始暫停，跟畫面上
        // 凍結狀態實際出現的時間點對不上（見使用者回報：freeze 後行動條充能
        // 與敵人受創時間戳斷開）。
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'SKILL', skillId: 'enemy_freeze', skillName: '凍結', statusEffectKind: 'FREEZE', statusDurationSec: 3,
            }, {
                timestamp: 6000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 10, targetHpRemaining: 90,
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(() => result, () => 100, () => 100);

        let badgeRevealedAtFrame = -1;
        let plateauStartFrame = -1;
        let prevPercent: number | null = null;
        for (let i = 0; i < 3000 && (badgeRevealedAtFrame === -1 || plateauStartFrame === -1); i += 1) {
            advanceFrame(16);
            const { percent } = combat.playerGauge.value;
            if (badgeRevealedAtFrame === -1 && combat.playerStatusBadge.value?.kind === 'FREEZE') {
                badgeRevealedAtFrame = i;
            }
            if (plateauStartFrame === -1 && percent !== null && percent > 0 && percent < 100 && percent === prevPercent) {
                plateauStartFrame = i;
            }
            prevPercent = percent;
        }

        expect(badgeRevealedAtFrame).toBeGreaterThan(0);
        expect(plateauStartFrame).toBeGreaterThan(0);
        // 允許一幀（16ms）的取樣誤差，但不能相差到 SKILL_WINDUP_MS 那個量級。
        expect(Math.abs(plateauStartFrame - badgeRevealedAtFrame)).toBeLessThanOrEqual(1);
    });

    it('凍結發生在前一個 wave 時，下一個 wave 的行動條暫停仍要對齊敵人狀態揭露，不能疊加上一個 wave 殘留的暫停量（known-issue.md #1）', () => {
        // wave 0：enemy1 先對 player 施放一次凍結（觸發 gaugeSchedule 內部
        // 用來做「全場暫停」的 pauseOffset 累加 SKILL_WINDUP_MS），player 隨後
        // 攻擊擊敗 enemy1，wave 0 結束。修復前：pauseOffset 這個變數是整個
        // computed 只宣告一次、從未在換 wave 時歸零，所以即使 wave 1 的
        // waveStartAt 已經正確承接了 wave 0 的暫停時間，wave 1 每一批事件的
        // actAt 仍會被再疊加一次 wave 0 遺留的 pauseOffset，跟 schedule（沒有
        // 這個變數，天生不會有殘留）的時間軸產生落差，且會逐 wave 越差越多。
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 500, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'SKILL', skillId: 'enemy_freeze', skillName: '凍結', statusEffectKind: 'FREEZE', statusDurationSec: 1,
            },
            {
                timestamp: 4000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 100, targetHpRemaining: 0,
            },
            // wave 1：重現跟上一個測試一樣的「凍結 → 行動條暫停對齊狀態揭露」
            // 情境，差別只在於這是戰鬥的第二個 wave。
            {
                timestamp: 1000, wave: 1, actorId: 'enemy2', targetId: 'player', action: 'SKILL', skillId: 'enemy_freeze', skillName: '凍結', statusEffectKind: 'FREEZE', statusDurationSec: 3,
            },
            {
                timestamp: 6000, wave: 1, actorId: 'player', targetId: 'enemy2', action: 'ATTACK', damage: 10, targetHpRemaining: 90,
            },
        ];
        // buildResult() 只放了一隻敵人（enemy1），這裡橫跨兩個 wave、wave 1
        // 換了一隻新敵人（enemy2），enemyCards 是照 summary.enemies 這份完整
        // 名冊建的，兩隻都要列進去才能正確追蹤各自的 hpCurrent。
        const result: CombatApiResult = {
            ...buildResult(combatLog),
            summary: {
                ...buildResult(combatLog).summary,
                enemies: [
                    {
                        enemyId: 'enemy1', name: '測試敵人1', level: 1, hpMax: 100, isBoss: false,
                    }, {
                        enemyId: 'enemy2', name: '測試敵人2', level: 1, hpMax: 100, isBoss: false,
                    },
                ],
            },
        };
        const combat = useCombat(() => result, () => 100, () => 100);

        let wave0Cleared = false;
        let badgeRevealedAtFrame = -1;
        let plateauStartFrame = -1;
        let prevPercent: number | null = null;
        for (let i = 0; i < 6000 && (badgeRevealedAtFrame === -1 || plateauStartFrame === -1); i += 1) {
            advanceFrame(16);
            const { percent } = combat.playerGauge.value;
            // wave 1 開始後 enemyCards 只會列出 enemy2（各自獨立的 hp 顯示），
            // enemy1 死亡那一刻的 hpCurrent === 0 只會出現一瞬間，所以用 latch
            // 記住「wave 0 已結束」，不能每一幀都重新判斷。
            if (!wave0Cleared && combat.enemyCards.value.some(enemy => enemy.hpCurrent === 0)) {
                wave0Cleared = true;
            }
            if (badgeRevealedAtFrame === -1 && wave0Cleared && combat.playerStatusBadge.value?.kind === 'FREEZE') {
                badgeRevealedAtFrame = i;
            }
            if (plateauStartFrame === -1 && badgeRevealedAtFrame !== -1
                && percent !== null && percent > 0 && percent < 100 && percent === prevPercent) {
                plateauStartFrame = i;
            }
            prevPercent = percent;
        }

        expect(badgeRevealedAtFrame).toBeGreaterThan(0);
        expect(plateauStartFrame).toBeGreaterThan(0);
        expect(Math.abs(plateauStartFrame - badgeRevealedAtFrame)).toBeLessThanOrEqual(1);
    });
});

describe('useCombat — 技能充能條與觸發演出（character-skills）', () => {
    beforeEach(setupClocks);
    afterEach(() => vi.useRealTimers());

    it('技能充能百分比隨時間單調遞增，觸發後立即歸零重新開始下一輪', () => {
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 8000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'SKILL', damage: 20, targetHpRemaining: 80, skillId: 'skill_a', skillName: '測試技能',
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(
            () => result, () => 100, () => 100, undefined, undefined,
            () => [
                {
                    skillId: 'skill_a', name: '測試技能', icon: 'sword', chargeSec: 8,
                },
            ],
        );

        const samples: number[] = [];
        for (let i = 0; i < 400; i += 1) {
            advanceFrame(16);
            const gauge = combat.playerSkillGauges.value.find(skill => skill.skillId === 'skill_a')!.gauge;
            if (gauge.percent !== null && gauge.percent < 100) samples.push(gauge.percent);
        }

        expect(samples.length).toBeGreaterThan(1);
        for (let i = 1; i < samples.length; i += 1) {
            expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]!);
        }
    });

    it('技能觸發當下顯示技能名稱與共用的技能特效，跟一般攻擊區分開來', async () => {
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 3000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'SKILL', damage: 20, targetHpRemaining: 80, skillId: 'skill_a', skillName: '測試技能',
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(
            () => result, () => 100, () => 100, undefined, undefined,
            () => [
                {
                    skillId: 'skill_a', name: '測試技能', icon: 'sword', chargeSec: 8,
                },
            ],
        );

        let castName: string | undefined;
        let enemySparkKind: string | undefined;
        // 技能名稱在 windupStartAt 就會顯示（充能滿、暫停開始的那一刻），但共用
        // 的技能特效要等 SKILL_WINDUP_MS（800ms）暫停演繹完才會揭曉（見
        // useCombat.ts schedule 的 windupStartAt/displayAt），兩者时間點不同，
        // 這裡持續推進到兩者都出現才停止，而不是一看到 castName 就提早結束。
        for (let i = 0; i < 500 && enemySparkKind === undefined; i += 1) {
            advanceFrame(16);
            // watch() 的 side effect（fireEntry）走 Vue 預設的 pre-flush（microtask
            // 排程），測試環境沒有元件渲染循環幫忙推進，需要主動讓出一次微任務
            // 佇列排定的 callback 才會真的執行（其餘既有測試只斷言 computed 衍生
            // 值，不涉及這個 watcher 的 side effect，因此不需要這一步）。
            await Promise.resolve();
            castName ??= combat.playerSkillCastFx.value?.name;
            enemySparkKind = combat.enemyCards.value.find(enemy => enemy.enemyId === 'enemy1')?.spark?.kind;
        }

        expect(castName).toBe('測試技能');
        expect(enemySparkKind).toBe('skill');
    });

    it('技能整場戰鬥都沒有觸發過（chargeSec 較長）時，充能條仍然要用 chargeSec 顯示持續進度，不能整場都是 null', () => {
        // 戰鬥很快就結束（player 一擊必殺），技能 chargeSec 長達 60 秒，遠比
        // 這場戰鬥的時長長，全程都不會真的觸發——修復前：skillCycles 只有
        // 「實際觸發事件」才會收尾一個充能週期，沒觸發過的技能整場都回傳
        // percent: null（充能條完全不會動），見使用者回報。
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 100, targetHpRemaining: 0,
            }, {
                timestamp: 1000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'DEATH',
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(
            () => result, () => 100, () => 100, undefined, undefined,
            () => [
                {
                    skillId: 'skill_slow', name: '慢速技能', icon: 'sword', chargeSec: 60,
                },
            ],
        );

        let sawNonNullProgress = false;
        for (let i = 0; i < 400; i += 1) {
            advanceFrame(16);
            const gauge = combat.playerSkillGauges.value.find(skill => skill.skillId === 'skill_slow')!.gauge;
            if (gauge.percent !== null && gauge.percent > 0) sawNonNullProgress = true;
        }

        expect(sawNonNullProgress).toBe(true);
    });

    it('技能觸發時，緊接在後的其他行動（不分敵我）都會被 windup 暫停往後推遲', async () => {
        // 原始 combatLog 時間軸上，enemy1 的反擊只比技能觸發晚 100ms——沒有
        // windup 暫停的話兩者幾乎會前後腳揭曉；有暫停的話，enemy1 的反擊揭曉
        // 時間點必須至少比技能效果揭曉時間點晚 SKILL_WINDUP_MS（800ms）。
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 3000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'SKILL', damage: 20, targetHpRemaining: 80, skillId: 'skill_a', skillName: '測試技能',
            }, {
                timestamp: 3100, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'ATTACK', damage: 5, targetHpRemaining: 95,
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(
            () => result, () => 100, () => 100, undefined, undefined,
            () => [
                {
                    skillId: 'skill_a', name: '測試技能', icon: 'sword', chargeSec: 8,
                },
            ],
        );

        let skillRevealedAt = -1;
        let nextActionRevealedAt = -1;
        for (let i = 0; i < 500 && nextActionRevealedAt === -1; i += 1) {
            advanceFrame(16);
            await Promise.resolve();
            const now = (i + 1) * 16;
            if (skillRevealedAt === -1 && combat.enemyCards.value.some(enemy => enemy.hpCurrent === 80)) skillRevealedAt = now;
            if (combat.playerStatus.value.hpCurrent === 95) nextActionRevealedAt = now;
        }

        expect(skillRevealedAt).toBeGreaterThan(0);
        expect(nextActionRevealedAt).toBeGreaterThan(0);
        expect(nextActionRevealedAt - skillRevealedAt).toBeGreaterThanOrEqual(750);
    });

    it('未佩戴任何技能時不建立充能週期', () => {
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 10, targetHpRemaining: 90,
            },
        ];
        const result = buildResult(combatLog);
        const combat = useCombat(() => result, () => 100, () => 100);

        expect(combat.playerSkillGauges.value).toEqual([]);
    });
});

// 死亡音效：GKBOT 陣營敵人死亡播機械爆破聲，玩家與人類陣營敵人死亡（含玩家
// 自己戰敗）共用慘叫聲——比照既有 hurtSfxFor 的陣營判斷邏輯（見 useCombat.ts）。
describe('useCombat — 死亡音效', () => {
    beforeEach(setupClocks);
    afterEach(() => vi.useRealTimers());

    const runUntilPlaySfxCalled = async (playSfxMock: ReturnType<typeof vi.fn>) => {
        for (let i = 0; i < 500 && playSfxMock.mock.calls.length === 0; i += 1) {
            advanceFrame(16);
            await Promise.resolve();
        }
    };

    it('GKBOT 陣營敵人死亡時播放機械死亡音效', async () => {
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 100, targetHpRemaining: 0,
            }, {
                timestamp: 1000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'DEATH',
            },
        ];
        const result = buildResult(combatLog);
        const playSfxMock = vi.fn();
        useCombat(
            () => result, () => 100, () => 100, undefined, () => 'GKBOT', undefined, playSfxMock,
        );

        await runUntilPlaySfxCalled(playSfxMock);

        expect(playSfxMock).toHaveBeenCalledWith('robotDeath.mp3');
        expect(playSfxMock).not.toHaveBeenCalledWith('humanScream.mp3');
    });

    it('HUMAN 陣營敵人死亡時播放人類慘叫音效', async () => {
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'ATTACK', damage: 100, targetHpRemaining: 0,
            }, {
                timestamp: 1000, wave: 0, actorId: 'player', targetId: 'enemy1', action: 'DEATH',
            },
        ];
        const result = buildResult(combatLog);
        const playSfxMock = vi.fn();
        useCombat(
            () => result, () => 100, () => 100, undefined, () => 'HUMAN', undefined, playSfxMock,
        );

        await runUntilPlaySfxCalled(playSfxMock);

        expect(playSfxMock).toHaveBeenCalledWith('humanScream.mp3');
        expect(playSfxMock).not.toHaveBeenCalledWith('robotDeath.mp3');
    });

    it('玩家戰敗時播放人類慘叫音效，即使敵方陣營是 GKBOT', async () => {
        const combatLog: CombatLogEntry[] = [
            {
                timestamp: 1000, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'ATTACK', damage: 100, targetHpRemaining: 0,
            }, {
                timestamp: 1000, wave: 0, actorId: 'enemy1', targetId: 'player', action: 'DEATH',
            },
        ];
        const result = buildResult(combatLog);
        const playSfxMock = vi.fn();
        useCombat(
            () => result, () => 100, () => 100, undefined, () => 'GKBOT', undefined, playSfxMock,
        );

        await runUntilPlaySfxCalled(playSfxMock);

        expect(playSfxMock).toHaveBeenCalledWith('humanScream.mp3');
        expect(playSfxMock).not.toHaveBeenCalledWith('robotDeath.mp3');
    });
});
