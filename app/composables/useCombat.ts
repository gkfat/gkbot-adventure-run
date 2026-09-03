import type { CombatApiResult } from './useAdventureRun';
import type { CombatLogEntry } from '../../shared/types/adventure';

// 每個 wave 開戰前都先播一段橫越戰場的 banner，一段文字的進出節奏都是
// 「過 BANNER_TEXT_ENTER_DELAY_MS 後文字進入 → 停留 BANNER_TEXT_HOLD_MS →
// 文字離開（花 BANNER_TEXT_EXIT_MS）」：
// - 第一個 wave：banner 只播一段文字「戰鬥開始」+ 波次計數，播完（消失）後
//   再等 BANNER_POST_DELAY_MS 才開始演繹行動條充能（見 FIRST_WAVE_DELAY_MS）。
// - 換 wave（第二個 wave 以後）：上一個 wave 結束後先等
//   WAVE_END_DELAY_MS，banner 才出現，依序播三段文字——先「戰鬥結束」，
//   再「敵方增援來襲」，最後「戰鬥開始」+ 波次計數——播完後同樣再等
//   BANNER_POST_DELAY_MS 才開始充能（見 WAVE_TRANSITION_DELAY_MS）。
const BANNER_TEXT_ENTER_DELAY_MS = 300;
const BANNER_TEXT_HOLD_MS = 800;
const BANNER_TEXT_EXIT_MS = 300;
const BANNER_POST_DELAY_MS = 1000;
const WAVE_END_DELAY_MS = 1000;
const BANNER_TEXT_CYCLE_MS = BANNER_TEXT_ENTER_DELAY_MS + BANNER_TEXT_HOLD_MS + BANNER_TEXT_EXIT_MS;
const FIRST_WAVE_DELAY_MS = BANNER_TEXT_CYCLE_MS + BANNER_POST_DELAY_MS;
const WAVE_TRANSITION_DELAY_MS = WAVE_END_DELAY_MS + (BANNER_TEXT_CYCLE_MS * 3) + BANNER_POST_DELAY_MS;
// 被打中會讓「這個單位自己的下一次出手」延後最多 STUN_MS，模擬視覺上的頓挫感
// （伺服器排程本身不會因為受擊延後 nextAttackAt，見 combat.service.ts；這純粹
// 是演出）。
const STUN_MS = 800;

// 依 (wave, timestamp) 分批：同一個 wave 內、同一個 timestamp 的多筆事件視為
// 同一批一起顯示；換 wave 一定另起一批，即使雙方 timestamp 剛好都是 0。
type LogGroup = { wave: number; timestamp: number; entries: CombatLogEntry[] };

type ScheduledGroup = { group: LogGroup; displayAt: number; waveStartAt: number };

type CardFx = { kind: 'attack' | 'dodge'; key: number };
type SparkFx = { kind: 'hit' | 'crit'; key: number };
export type DamageTextFx = { kind: 'damage' | 'crit' | 'dodge'; value?: number; key: number };
const CARD_FX_MS = 320;
const SPARK_FX_MS = 450;
const DAMAGE_TEXT_FX_MS = 700;
// 同一批（同 wave、同 timestamp）合併的多筆 log entry 之間的錯開間隔——多見於每個
// wave 開戰的第一輪：所有單位的 nextAttackAt 都從 0 起算，玩家的第一次出手跟緊接著
// 的敵方第一次出手因此會落在同一個 timestamp、被 groups 合併成同一批。若在同一個
// tick 內對同一個單位（例如玩家自己）連續 trigger 兩次 cardFx／damageTextFx（一次
// 因為自己出手、一次因為緊接著被反擊命中），reactive Map 只會保留最後一次的值，
// 前一個效果等於被跳過未顯示、觀感上像是「跳兩次」。錯開觸發讓同一批內的每筆
// entry 都能各自完整播放一次。
const INTRA_GROUP_STAGGER_MS = 150;

type EnemyWaveMap = Map<string, number>;

type WaveStart = { wave: number; startAt: number };

type WaveBannerTiming = {
    wave: number;
    bannerAt: number;
    endTextEnterAt?: number;
    endTextExitAt?: number;
    endGoneAt?: number;
    reinforceTextEnterAt?: number;
    reinforceTextExitAt?: number;
    reinforceGoneAt?: number;
    startTextEnterAt: number;
    startTextExitAt: number;
    goneAt: number;
};

export type WaveBanner = {
    label: '戰鬥結束' | '敵方增援來襲' | '戰鬥開始';
    textKey: string;
    showText: boolean;
    textExiting: boolean;
    containerExiting: boolean;
    waveNumber: number;
    totalWaves: number;
    showCount: boolean;
};

type GaugeScheduleEntry = { group: LogGroup; actAt: number; waveStartAt: number };
type UnitCycle = { start: number; end: number | null; hitDisplayTimes: number[]; endsWave: boolean };
export type UnitGauge = { percent: number | null; paused: boolean };
export type UnitStatus = { hpCurrent: number; hpMax: number; hpPercent: number };
export type EnemyCardView = {
    enemyId: string;
    name: string;
    hpMax: number;
    hpCurrent: number;
    isBoss: boolean;
    alive: boolean;
    hpPercent: number;
    tierLabel: string;
    gauge: UnitGauge;
    cardFx?: CardFx;
    spark?: SparkFx;
    damageText?: DamageTextFx;
};

// 受擊特效改用揮砍(從右上到左下的刀痕)影格序列演繹路徑，而非單張靜態圖：一般
// 命中 4 格、爆擊(紅色、粒子更多更強烈) 5 格，圖檔見 GameSparkFx。
export const SPARK_FRAME_MS = 90;
const HIT_SPARK_FRAME_COUNT = 4;
const CRIT_SPARK_FRAME_COUNT = 5;
export const sparkFrameUrls = (kind: SparkFx['kind']) => {
    const count = kind === 'crit' ? CRIT_SPARK_FRAME_COUNT : HIT_SPARK_FRAME_COUNT;
    const prefix = kind === 'crit' ? 'crit-slash' : 'hit-slash';
    return Array.from({ length: count }, (_, i) => `/images/combat-fx/${prefix}-${i + 1}.png`);
};

/**
 * 戰鬥演出的 timeline 排程與特效狀態（banner／充能條／出手位移／受擊 spark／傷害飄字）。
 * 純渲染邏輯抽離自 combatResultPanel.vue，元件只負責把這裡回傳的狀態綁到畫面上。
 */
export function useCombat(
    getResult: () => CombatApiResult | null,
    getPlayerHpMax: () => number,
    getPlayerHpStart: () => number,
) {
    // 一次性把「每一批 log 該在播放開始後第幾毫秒顯示」全部算好（絕對時間軸，
    // 不是逐批用 setTimeout 互相串接）。這樣播放排程跟充能條動畫可以共用同一份
    // 時間表，兩者永遠對得上，不會再有充能條演出跟實際出手時機脫鉤的問題。
    //
    // - 同一個 wave 內：displayAt = 這個 wave 開始的時間點 + 這筆事件自己的
    //   timestamp（wave 內 timestamp 本身已經是理想排程，且保證非遞減）。
    // - 換 wave：新 wave 的起點 = 前一筆 displayAt + 對應的 banner 總時長（第一
    //   個 wave 用 FIRST_WAVE_DELAY_MS，第二個 wave 以後用
    //   WAVE_TRANSITION_DELAY_MS，見上面常數註解），所有單位的行動條從這一刻
    //   重新算起（見 waveStartAt）。
    // - 被打中會把該單位「自己下一次出手」那一批的 displayAt 往後推到
    //   stunEnd（= 被打中那一刻 + STUN_MS），若同時有多筆事件排在被打斷區間內，
    //   每一批都不能早於前一批（monotonic 保底）。
    const groups = computed<LogGroup[]>(() => {
        const result: LogGroup[] = [];
        const combatResult = getResult();
        if (!combatResult) return result;
        for (const entry of combatResult.combatLog) {
            const last = result.at(-1);
            if (last && last.wave === entry.wave && last.timestamp === entry.timestamp) {
                last.entries.push(entry);
            } else {
                result.push({
                    wave: entry.wave, timestamp: entry.timestamp, entries: [entry],
                });
            }
        }
        return result;
    });

    const schedule = computed<ScheduledGroup[]>(() => {
        const result: ScheduledGroup[] = [];
        const stunnedUntil = new Map<string, number>();
        let prevWave = -1;
        let waveStartAt = 0;

        groups.value.forEach((group, index) => {
            if (group.wave !== prevWave) {
                waveStartAt = index === 0
                    ? FIRST_WAVE_DELAY_MS
                    : result[index - 1]!.displayAt + WAVE_TRANSITION_DELAY_MS;
                stunnedUntil.clear();
                prevWave = group.wave;
            }

            let displayAt = waveStartAt + group.timestamp;
            const actorId = group.entries[0]!.actorId;
            const stunEnd = stunnedUntil.get(actorId);
            if (stunEnd !== undefined) displayAt = Math.max(displayAt, stunEnd);
            if (index > 0) displayAt = Math.max(displayAt, result[index - 1]!.displayAt);

            result.push({
                group, displayAt, waveStartAt,
            });
            for (const entry of group.entries) {
                stunnedUntil.set(entry.targetId, displayAt + STUN_MS);
            }
        });

        return result;
    });

    // 最後一個 wave 播完後，一律再播一段「戰鬥結束」banner 才揭曉勝敗結果——
    // 涵蓋只有一個 wave 的戰鬥（原本的換 wave 邏輯只在第二個 wave以後才會產生
    // 「戰鬥結束」這段文字，單一 wave 的戰鬥完全沒有機會播到，見使用者回報）。
    // 從最後一批 log 的 displayAt 往後推：先等 WAVE_END_DELAY_MS，再播一段
    // 「戰鬥結束」文字自己的 enter/hold/exit。
    const combatEndBannerTiming = computed(() => {
        const lastDisplayAt = schedule.value.at(-1)?.displayAt ?? 0;
        const bannerAt = lastDisplayAt + WAVE_END_DELAY_MS;
        const textEnterAt = bannerAt + BANNER_TEXT_ENTER_DELAY_MS;
        const textExitAt = textEnterAt + BANNER_TEXT_HOLD_MS;
        const goneAt = textExitAt + BANNER_TEXT_EXIT_MS;
        return {
            bannerAt, textEnterAt, textExitAt, goneAt,
        };
    });
    const visibleGroupCount = ref(0);
    const playbackDone = computed(() => (
        visibleGroupCount.value >= groups.value.length
        && groups.value.length > 0
        && nowMs.value >= combatEndBannerTiming.value.goneAt
    ));
    const visibleEntries = computed(() => groups.value.slice(0, visibleGroupCount.value).flatMap(group => group.entries));

    // 出手/受擊演出：每次有新的一批 log 被播出，就替涉及的單位各觸發一次一次性
    // 特效，跟充能條的百分比計算完全分開（充能條講的是「下一次出手還要多久」，
    // 這裡講的是「這一刻正在發生什麼」）。用遞增的 key 讓 DOM 重新掛載來重播
    // CSS animation，setTimeout 到期後從 map 移除即可讓 v-if 自然收掉。
    // - cardFx：卡片本身的位移演出——出手方（attacker）一律向敵方 transition
    //   再彈回來；被攻擊方若閃避成功，則是橫向 transition 再彈回來。
    // - sparkFx：受擊方（真的被打中時）疊加的像素風特效圖，一般命中/爆擊各一張，
    //   全部在 500ms 內演出完畢。
    // - damageTextFx：受擊方疊加的傷害數字／「閃避」文字飄字，跟 sparkFx 一樣
    //   一次性、同一批 setTimeout 清除 pattern。
    const cardFx = reactive(new Map<string, CardFx>());
    const sparkFx = reactive(new Map<string, SparkFx>());
    const damageTextFx = reactive(new Map<string, DamageTextFx>());
    const cardFxTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const sparkFxTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const damageTextFxTimers = new Map<string, ReturnType<typeof setTimeout>>();
    let fxKeySeq = 0;

    const triggerCardFx = (unitId: string, kind: CardFx['kind']) => {
        cardFx.set(unitId, {
            kind, key: fxKeySeq++, 
        });
        const existing = cardFxTimers.get(unitId);
        if (existing) clearTimeout(existing);
        cardFxTimers.set(unitId, setTimeout(() => cardFx.delete(unitId), CARD_FX_MS));
    };
    const triggerSparkFx = (unitId: string, kind: SparkFx['kind']) => {
        sparkFx.set(unitId, {
            kind, key: fxKeySeq++, 
        });
        const existing = sparkFxTimers.get(unitId);
        if (existing) clearTimeout(existing);
        sparkFxTimers.set(unitId, setTimeout(() => sparkFx.delete(unitId), SPARK_FX_MS));
    };
    const triggerDamageTextFx = (unitId: string, kind: DamageTextFx['kind'], value?: number) => {
        damageTextFx.set(unitId, {
            kind, value, key: fxKeySeq++, 
        });
        const existing = damageTextFxTimers.get(unitId);
        if (existing) clearTimeout(existing);
        damageTextFxTimers.set(unitId, setTimeout(() => damageTextFx.delete(unitId), DAMAGE_TEXT_FX_MS));
    };
    const clearFxTimers = () => {
        cardFxTimers.forEach(timer => clearTimeout(timer));
        sparkFxTimers.forEach(timer => clearTimeout(timer));
        damageTextFxTimers.forEach(timer => clearTimeout(timer));
        cardFxTimers.clear();
        sparkFxTimers.clear();
        damageTextFxTimers.clear();
        cardFx.clear();
        sparkFx.clear();
        damageTextFx.clear();
    };

    watch(visibleGroupCount, (count) => {
        if (count === 0) return;
        const group = groups.value[count - 1];
        if (!group) return;
        const fireEntry = (entry: CombatLogEntry) => {
            triggerCardFx(entry.actorId, 'attack');
            if (entry.action === 'DODGE') {
                triggerCardFx(entry.targetId, 'dodge');
                triggerDamageTextFx(entry.targetId, 'dodge');
            } else {
                triggerSparkFx(entry.targetId, entry.action === 'CRIT' ? 'crit' : 'hit');
                triggerDamageTextFx(entry.targetId, entry.action === 'CRIT' ? 'crit' : 'damage', entry.damage);
            }
        };
        // DEATH 跟同一批的 ATTACK/CRIT 共用 actorId/targetId，特效已經由那筆
        // sibling entry 觸發過，這裡跳過避免重複播放。
        let stagger = 0;
        for (const entry of group.entries) {
            if (entry.action === 'DEATH') continue;
            if (stagger === 0) {
                fireEntry(entry);
            } else {
                timers.push(setTimeout(() => fireEntry(entry), stagger));
            }
            stagger += INTRA_GROUP_STAGGER_MS;
        }
    });

    // enemyId -> 所屬 wave：每隻敵人的 id 都是 crypto.randomUUID() 產生、只會在
    // 牠出生的那個 wave 出現在 combatLog 裡（見 combat.service.ts spawnWave），
    // 用第一筆提到這個 id 的 log entry 的 wave 反推回來。
    const enemyWaveById = computed<EnemyWaveMap>(() => {
        const map: EnemyWaveMap = new Map();
        const combatResult = getResult();
        if (!combatResult) return map;
        for (const entry of combatResult.combatLog) {
            if (entry.actorId !== 'player' && !map.has(entry.actorId)) map.set(entry.actorId, entry.wave);
            if (entry.targetId !== 'player' && !map.has(entry.targetId)) map.set(entry.targetId, entry.wave);
        }
        return map;
    });

    // 每個 wave 實際開始播放的時間點（沿用 schedule 算好的 waveStartAt，即行動
    // 條開始充能的時間點）。
    const waveStarts = computed<WaveStart[]>(() => {
        const result: WaveStart[] = [];
        let prevWave = -1;
        for (const {
            group, waveStartAt, 
        } of schedule.value) {
            if (group.wave !== prevWave) {
                result.push({
                    wave: group.wave, startAt: waveStartAt, 
                });
                prevWave = group.wave;
            }
        }
        return result;
    });

    // 每個 wave 的 banner 時間軸，往回從 waveStarts 的 startAt（即充能真正開始
    // 的時間點）扣掉對應的總時長推回 banner 起點。第一個 wave 只有一段文字
    // （start* 欄位）；第二個 wave 以後在 start* 之前還多兩段文字——「敵方增援
    // 來襲」（reinforce* 欄位）跟更早的「戰鬥結束」（end* 欄位，undefined 代表
    // 這個 wave 沒有這兩段）。goneAt 一律代表 banner 整條（含所有文字段落）最終
    // 消失、行動條開始充能前的那一刻。
    const waveBannerTimings = computed<WaveBannerTiming[]>(() => waveStarts.value.map(({
        wave, startAt, 
    }, index) => {
        // 往回推算：goneAt = startAt - 停頓，接著是「戰鬥開始」這段文字自己的
        // enter/hold/exit，換 wave（index > 0）的話再往前多推「敵方增援來襲」、
        // 「戰鬥結束」兩段文字，以及 banner 出現前的 WAVE_END_DELAY_MS 停頓。
        const goneAt = startAt - BANNER_POST_DELAY_MS;
        const startTextExitAt = goneAt - BANNER_TEXT_EXIT_MS;
        const startTextEnterAt = startTextExitAt - BANNER_TEXT_HOLD_MS;

        if (index === 0) {
            return {
                wave, bannerAt: startTextEnterAt - BANNER_TEXT_ENTER_DELAY_MS, startTextEnterAt, startTextExitAt, goneAt,
            };
        }

        const reinforceGoneAt = startTextEnterAt - BANNER_TEXT_ENTER_DELAY_MS;
        const reinforceTextExitAt = reinforceGoneAt - BANNER_TEXT_EXIT_MS;
        const reinforceTextEnterAt = reinforceTextExitAt - BANNER_TEXT_HOLD_MS;

        const endGoneAt = reinforceTextEnterAt - BANNER_TEXT_ENTER_DELAY_MS;
        const endTextExitAt = endGoneAt - BANNER_TEXT_EXIT_MS;
        const endTextEnterAt = endTextExitAt - BANNER_TEXT_HOLD_MS;
        const bannerAt = endTextEnterAt - BANNER_TEXT_ENTER_DELAY_MS;
        return {
            wave,
            bannerAt,
            endTextEnterAt,
            endTextExitAt,
            endGoneAt,
            reinforceTextEnterAt,
            reinforceTextExitAt,
            reinforceGoneAt,
            startTextEnterAt,
            startTextExitAt,
            goneAt,
        };
    }));

    // wave 在 combatLog 裡是 0-based（見 shared/types/adventure.ts），banner 上
    // 顯示給玩家看的波次計數要轉成 1-based；總波次數就是這場戰鬥出現過的相異
    // wave 數量（waveStarts 每個 wave 只會有一筆）。
    const totalWaveCount = computed(() => waveStarts.value.length);

    // containerExiting：banner 整條底色淡出的時間窗——一律是「戰鬥開始」這段
    // 文字自己的離開時間窗（goneAt 前 BANNER_TEXT_EXIT_MS），跟文字本身的
    // textExiting 分開判斷，這樣「戰鬥結束」文字離開時底色不會跟著淡出（底色
    // 全程都在，只有文字換場）。
    const waveBanner = computed<WaveBanner | null>(() => {
        const timing = waveBannerTimings.value.find(({
            bannerAt, goneAt, 
        }) => nowMs.value >= bannerAt && nowMs.value < goneAt);
        if (!timing) return null;

        const waveNumber = timing.wave + 1;
        const totalWaves = totalWaveCount.value;
        const containerExiting = nowMs.value >= timing.goneAt - BANNER_TEXT_EXIT_MS;

        if (timing.endTextEnterAt !== undefined && timing.endTextExitAt !== undefined && timing.endGoneAt !== undefined
            && nowMs.value < timing.endGoneAt) {
            return {
                label: '戰鬥結束',
                textKey: `${timing.wave}-end`,
                showText: nowMs.value >= timing.endTextEnterAt,
                textExiting: nowMs.value >= timing.endTextExitAt,
                containerExiting,
                waveNumber,
                totalWaves,
                showCount: false,
            };
        }

        if (timing.reinforceTextEnterAt !== undefined && timing.reinforceTextExitAt !== undefined
            && timing.reinforceGoneAt !== undefined && nowMs.value < timing.reinforceGoneAt) {
            return {
                label: '敵方增援來襲',
                textKey: `${timing.wave}-reinforce`,
                showText: nowMs.value >= timing.reinforceTextEnterAt,
                textExiting: nowMs.value >= timing.reinforceTextExitAt,
                containerExiting,
                waveNumber,
                totalWaves,
                showCount: false,
            };
        }

        return {
            label: '戰鬥開始',
            textKey: `${timing.wave}-start`,
            showText: nowMs.value >= timing.startTextEnterAt,
            textExiting: nowMs.value >= timing.startTextExitAt,
            containerExiting,
            waveNumber,
            totalWaves,
            showCount: true,
        };
    });

    // 最後一個 wave 播完後的「戰鬥結束」banner，跟 waveBanner 是分開的獨立時段
    // （waveBanner 只在有下一個 wave 要開始時才會播出對應的 end* 文字，最後一個
    // wave 播完並沒有「下一個 wave」可以掛，見 combatEndBannerTiming 的說明）。
    const combatEndBanner = computed<WaveBanner | null>(() => {
        const timing = combatEndBannerTiming.value;
        if (nowMs.value < timing.bannerAt || nowMs.value >= timing.goneAt) return null;
        return {
            label: '戰鬥結束',
            textKey: 'combat-end',
            showText: nowMs.value >= timing.textEnterAt,
            textExiting: nowMs.value >= timing.textExitAt,
            containerExiting: nowMs.value >= timing.goneAt - BANNER_TEXT_EXIT_MS,
            waveNumber: totalWaveCount.value,
            totalWaves: totalWaveCount.value,
            showCount: false,
        };
    });
    const displayedBanner = computed(() => waveBanner.value ?? combatEndBanner.value);

    // 判斷「目前播放進度落在哪個 wave 已經揭露」——用 banner 消失的時間點
    // （goneAt）而非充能開始的時間點（startAt）：增援/下一波敵人要在 banner
    // 播完、退場的當下就站上場（給玩家時間看清楚新一波敵人），而不是要等到
    // BANNER_POST_DELAY_MS 停頓結束、真正開始出手攻擊的那一刻才出現在畫面上
    // （見使用者回報：敵人會在被攻擊到時才出現）。
    const revealedWave = computed(() => {
        let wave = waveBannerTimings.value[0]?.wave ?? 0;
        for (const {
            wave: candidateWave, goneAt, 
        } of waveBannerTimings.value) {
            if (goneAt > nowMs.value) break;
            wave = candidateWave;
        }
        return wave;
    });

    // 敵人狀態：以目前已播放的 log 批次逐步套用 targetHpRemaining/DEATH，還原
    // 每隻敵人「播放進度當下」的 HP 與存活狀態；只有 Boss 戰（有任一 isBoss）
    // 才顯示頭目/小兵的階級標籤，一般戰鬥沒有這個區分，不硬套標籤。尚未輪到的
    // wave（見 revealedWave）其敵人先過濾掉，不提前出現在場上。
    const hasBossComposition = computed(() => getResult()?.summary.enemies.some(enemy => enemy.isBoss) ?? false);
    const enemyStatus = computed(() => {
        const status = new Map((getResult()?.summary.enemies ?? [])
            .filter(enemy => (enemyWaveById.value.get(enemy.enemyId) ?? 0) <= revealedWave.value)
            .map(enemy => [
                enemy.enemyId, {
                    enemyId: enemy.enemyId,
                    name: enemy.name,
                    hpMax: enemy.hpMax,
                    hpCurrent: enemy.hpMax,
                    isBoss: enemy.isBoss,
                    alive: true,
                },
            ]));

        for (const entry of visibleEntries.value) {
            const unit = status.get(entry.targetId);
            if (!unit) continue;
            if (entry.targetHpRemaining !== undefined) unit.hpCurrent = entry.targetHpRemaining;
            if (entry.action === 'DEATH') unit.alive = false;
        }

        const units = Array.from(status.values()).map(unit => ({
            ...unit,
            hpPercent: unit.hpMax > 0 ? Math.max(0, Math.min(100, (unit.hpCurrent / unit.hpMax) * 100)) : 0,
            tierLabel: hasBossComposition.value ? (unit.isBoss ? '頭目' : '小兵') : '',
        }));

        // Boss 站中間：把 Boss 從原本位置抽出來，塞回陣列正中央的 index，其餘
        // 小兵維持原本相對順序（增援小兵陸續加入時，Boss 仍會被重新置中）。
        const bossIndex = units.findIndex(unit => unit.isBoss);
        if (bossIndex !== -1) {
            const [boss] = units.splice(bossIndex, 1);
            units.splice(Math.floor(units.length / 2), 0, boss!);
        }

        return units;
    });

    const playerAlive = computed(() => (
        !visibleEntries.value.some(entry => entry.action === 'DEATH' && entry.targetId === 'player')
    ));

    // 玩家目前 HP：與 enemyStatus 同樣的邏輯，以已播放的 log 逐步套用 targetHpRemaining，
    // 起始值用「進入這場戰鬥當下」的實際 HP（getPlayerHpStart），而不是 hpMax——玩家
    // 進場時常常不是滿血（休息只回一定比例、或前面事件扣過血），若起始值誤用 hpMax，
    // 戰鬥畫面一開場 HP 條會先跳到滿血、播完第一筆受擊 log 才「掉」回正確數字，看起來
    // 像是進入戰鬥時多補了一次血（見使用者回報）。
    const playerStatus = computed<UnitStatus>(() => {
        const playerHpMax = getPlayerHpMax();
        let hpCurrent = getPlayerHpStart();
        for (const entry of visibleEntries.value) {
            if (entry.targetId !== 'player' || entry.targetHpRemaining === undefined) continue;
            hpCurrent = entry.targetHpRemaining;
        }
        return {
            hpCurrent,
            hpMax: playerHpMax,
            hpPercent: playerHpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / playerHpMax) * 100)) : 0,
        };
    });

    // Gauge 專用排程：跟上面的 schedule（驅動畫面揭露順序，即 visibleGroupCount
    // 的計時器）分開算。schedule 為了保證揭露順序不會倒退，任何單位自己被打斷
    // 延後出手時，都會用 `Math.max(displayAt, 前一批 displayAt)` 把「所有」後續
    // 事件（不論是不是同一個單位）一起往後拖；這個拖延一旦被拿去當某個不相干
    // 單位的充能週期邊界，就會讓那個單位的週期長度混進跟自己戰鬥節奏無關的延遲
    // ——行動條因此有時停很久、有時又像在追趕進度（見使用者回報）。這裡改用同一套
    // 規則重算一份「理想」時間軸，但延後只會套用在「同一個單位自己」的下一次
    // 出手上，不會外溢到別的單位；充能條到 100% 之後、對應行動真正被揭露前，會
    // 維持滿條（呈現「已就緒、等待輪到揭露」的效果），而不是速度忽快忽慢。
    const gaugeSchedule = computed<GaugeScheduleEntry[]>(() => {
        const result: GaugeScheduleEntry[] = [];
        const stunnedUntil = new Map<string, number>();
        let prevWave = -1;
        let waveStartAt = 0;

        groups.value.forEach((group, index) => {
            if (group.wave !== prevWave) {
                waveStartAt = index === 0
                    ? FIRST_WAVE_DELAY_MS
                    : result[index - 1]!.actAt + WAVE_TRANSITION_DELAY_MS;
                stunnedUntil.clear();
                prevWave = group.wave;
            }

            let actAt = waveStartAt + group.timestamp;
            const actorId = group.entries[0]!.actorId;
            const stunEnd = stunnedUntil.get(actorId);
            if (stunEnd !== undefined) actAt = Math.max(actAt, stunEnd);

            result.push({
                group, actAt, waveStartAt, 
            });
            for (const entry of group.entries) {
                stunnedUntil.set(entry.targetId, actAt + STUN_MS);
            }
        });

        return result;
    });

    // 每個單位（玩家/敵人）自己一整場戰鬥的「充能週期」清單，從 gaugeSchedule 一次
    // 性算好：一個週期代表「從上次出手（或這個 wave 開始）到下一次出手」之間的
    // 區間，並記錄這段期間內每一次被打中的顯示時間（hitDisplayTimes），供充能條
    // 畫出「被打斷暫停」的視覺效果。
    // endsWave：這個週期是不是被「換 wave」強制收尾的（而不是單位自己真的出手
    // 結束）。差別在 gaugeAt 要怎麼詮釋「atMs 已經超過 end」——同一個 wave 內
    // 超過 end 代表「已就緒、等待輪到揭露」該維持滿條；但 endsWave 的週期一旦
    // 超過 end，代表舊 wave 已經打完、新 wave 的 banner／停頓還在播，充能條應該
    // 顯示 0%（見 gaugeAt），而不是沿用舊 wave 打完那一刻的滿條狀態。
    const unitCycles = computed<Map<string, UnitCycle[]>>(() => {
        const cycles = new Map<string, UnitCycle[]>();
        const open = new Map<string, UnitCycle>();

        const ensureOpen = (unitId: string, startAt: number) => {
            if (open.has(unitId)) return;
            const cycle: UnitCycle = {
                start: startAt, end: null, hitDisplayTimes: [], endsWave: false,
            };
            if (!cycles.has(unitId)) cycles.set(unitId, []);
            cycles.get(unitId)!.push(cycle);
            open.set(unitId, cycle);
        };

        let prevWave = -1;
        let prevActAt = 0;
        for (const {
            group, actAt, waveStartAt, 
        } of gaugeSchedule.value) {
            if (group.wave !== prevWave) {
                // 換 wave：把所有還開著的週期收尾在「上一個 wave 真正結束」的那一刻
                // （prevActAt，上一個 wave 最後一批動作的時間），而不是這個新 wave
                // 第一批動作的 actAt——後者會把整段 banner／停頓的時間也算進這個舊
                // 週期裡，讓充能條在 banner 播放期間看起來像是逐漸充到滿（見使用者
                // 回報：banner 消失後行動條直接是滿的）。
                open.forEach((cycle) => { cycle.end = prevActAt; cycle.endsWave = true; });
                open.clear();
                prevWave = group.wave;
            }

            for (const entry of group.entries) {
                ensureOpen(entry.actorId, waveStartAt);
                ensureOpen(entry.targetId, waveStartAt);
                open.get(entry.targetId)!.hitDisplayTimes.push(actAt);
            }

            const actedUnitIds = new Set(group.entries.map(entry => entry.actorId));
            for (const unitId of actedUnitIds) {
                open.get(unitId)!.end = actAt;
                const next: UnitCycle = {
                    start: actAt, end: null, hitDisplayTimes: [], endsWave: false,
                };
                cycles.get(unitId)!.push(next);
                open.set(unitId, next);
            }

            prevActAt = actAt;

            // 被打死的單位只是「被攻擊的一方」，不會出現在 actedUnitIds 裡，牠當下
            // 開著的充能週期若不收尾就會永遠是 end === null（gaugeAt 判斷為
            // 「還沒排到下一次出手」而回傳 null，充能條整條消失）。這裡把死亡當下
            // 補記成這個週期的終點，讓充能條能一路演出到被打敗的瞬間才停下，而不是
            // 提早停止充能。
            for (const entry of group.entries) {
                if (entry.action !== 'DEATH') continue;
                const cycle = open.get(entry.targetId);
                if (cycle && cycle.end === null) cycle.end = actAt;
                open.delete(entry.targetId);
            }
        }

        return cycles;
    });

    // 找出某個時間點 nowMs 落在哪個充能週期，並算出目前的百分比：
    // - 週期內每一段命中時間窗（[hitAt, hitAt+STUN_MS)，裁切到週期範圍內、合併重疊
    //   區間）都會讓百分比原地暫停，時間窗結束後才繼續累加。
    // - 分母固定用整個週期的實際長度（total，已經包含 stun 造成的延後），不會在
    //   暫停之後把分母縮小、逼百分比在 end 那一刻精準補回 100%——那樣做等於是
    //   暫停結束後「加速趕上原本進度」。停頓時間就應該算進總長度裡，充能速度全程
    //   維持同一個節奏，不因為中途被打斷而變快。
    const gaugeAt = (unitId: string, atMs: number): UnitGauge => {
        const list = unitCycles.value.get(unitId);
        if (!list || list.length === 0) return {
            percent: null, paused: false, 
        };

        let cycle = list[0]!;
        for (const candidate of list) {
            if (candidate.start > atMs) break;
            cycle = candidate;
        }
        if (cycle.end === null) return {
            percent: null, paused: false, 
        };
        // atMs 還沒到這個週期的起點：候選迴圈一找到「start > atMs」的週期就會直接
        // break、保留迴圈開始前預設的 list[0]，不代表 atMs 真的落在 list[0] 的區間
        // 內。這在週期長度剛好是 0（單位在這個 wave 一開戰就瞬間出手，見下面
        // total <= 0 的情況）時特別明顯：若不擋在這裡，還沒輪到這個週期就會被
        // total <= 0 那支分支誤判成「已經 100%」，導致 banner 播放期間（充能根本
        // 還沒開始）行動條就直接顯示滿條（見使用者回報：第一波次 banner 消失時
        // 行動條已經是滿的）。
        if (atMs < cycle.start) return {
            percent: 0, paused: false, 
        };
        // endsWave 的週期一旦被追過 end，代表舊 wave 已經結束、新 wave 的 banner／
        // 停頓還在播、真正的充能還沒開始，顯示 0% 而不是沿用舊 wave 打完那一刻的
        // 滿條狀態（見上面 unitCycles 的說明）。
        if (cycle.endsWave && atMs >= cycle.end) return {
            percent: 0, paused: false, 
        };

        const {
            start, end, hitDisplayTimes, 
        } = cycle;
        const total = end - start;
        if (total <= 0) return {
            percent: 100, paused: false, 
        };

        const windows: [number, number][] = hitDisplayTimes
            .map((hitAt): [number, number] => [Math.max(hitAt, start), Math.min(hitAt + STUN_MS, end)])
            .filter(([from, to]) => to > from)
            .sort((a, b) => a[0] - b[0]);
        const merged: [number, number][] = [];
        for (const window of windows) {
            const last = merged.at(-1);
            if (last && window[0] <= last[1]) last[1] = Math.max(last[1], window[1]);
            else merged.push(window);
        }

        let pausedSoFar = 0;
        let paused = false;
        for (const [from, to] of merged) {
            if (atMs >= to) pausedSoFar += to - from;
            else if (atMs >= from) {
                pausedSoFar += atMs - from;
                paused = true;
            }
        }

        const effectiveElapsed = Math.max(0, (atMs - start) - pausedSoFar);
        const percent = Math.min(100, (effectiveElapsed / total) * 100);

        return {
            percent, paused, 
        };
    };

    // nowMs：從播放開始算起的毫秒數，用 requestAnimationFrame 每一幀更新，驅動
    // 充能條平滑地畫出來；跟 schedule/unitCycles 共用同一份「絕對時間」定義。
    const nowMs = ref(0);
    let rafHandle: number | null = null;
    let playbackStartedAt = 0;
    const stopGaugeClock = () => {
        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
        rafHandle = null;
    };
    const tickGaugeClock = () => {
        nowMs.value = performance.now() - playbackStartedAt;
        if (playbackDone.value) {
            stopGaugeClock();
            return;
        }
        rafHandle = requestAnimationFrame(tickGaugeClock);
    };

    const enemyCards = computed<EnemyCardView[]>(() => enemyStatus.value.map(enemy => ({
        ...enemy,
        gauge: gaugeAt(enemy.enemyId, nowMs.value),
        cardFx: cardFx.get(enemy.enemyId),
        spark: sparkFx.get(enemy.enemyId),
        damageText: damageTextFx.get(enemy.enemyId),
    })));
    const playerGauge = computed(() => gaugeAt('player', nowMs.value));
    const playerCardFx = computed(() => cardFx.get('player'));
    const playerSpark = computed(() => sparkFx.get('player'));
    const playerDamageText = computed(() => damageTextFx.get('player'));

    let timers: ReturnType<typeof setTimeout>[] = [];
    const clearTimers = () => {
        timers.forEach(timer => clearTimeout(timer));
        timers = [];
    };

    const schedulePlayback = () => {
        clearTimers();
        stopGaugeClock();
        clearFxTimers();
        visibleGroupCount.value = 0;
        nowMs.value = 0;
        if (!getResult() || schedule.value.length === 0) return;

        playbackStartedAt = performance.now();
        schedule.value.forEach(({ displayAt }, index) => {
            timers.push(setTimeout(() => {
                visibleGroupCount.value = index + 1;
            }, displayAt));
        });
        rafHandle = requestAnimationFrame(tickGaugeClock);
    };

    watch(getResult, schedulePlayback, { immediate: true });
    onUnmounted(() => {
        clearTimers();
        stopGaugeClock();
        clearFxTimers();
    });

    return {
        displayedBanner,
        enemyCards,
        playerAlive,
        playerStatus,
        playerGauge,
        playerCardFx,
        playerSpark,
        playerDamageText,
        playbackDone,
    };
}
