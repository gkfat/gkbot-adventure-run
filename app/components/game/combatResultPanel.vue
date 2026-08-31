<template>
    <div class="combat-result-panel">
        <!-- 戰場：敵人單排橫向卡片（不換行，過多時橫向捲動）+ 玩家卡片，
             各自獨立的攻速充能條，跟著 combatLog 即時播放進度走。 -->
        <div class="combat-result-panel__arena mb-3">
            <div
                v-if="waveBanner"
                class="combat-result-panel__wave-banner"
                :class="{ 'combat-result-panel__wave-banner--exit': waveBanner.containerExiting }"
            >
                <div
                    v-if="waveBanner.showText"
                    :key="waveBanner.textKey"
                    class="combat-result-panel__wave-banner-text"
                    :class="{ 'combat-result-panel__wave-banner-text--exit': waveBanner.textExiting }"
                >
                    <span class="font-pixel combat-result-panel__wave-banner-title">{{ waveBanner.label }}</span>
                    <span
                        v-if="waveBanner.showCount"
                        class="font-pixel combat-result-panel__wave-banner-count"
                    >
                        {{ waveBanner.waveNumber }}/{{ waveBanner.totalWaves }} 波次
                    </span>
                </div>
            </div>
            <div class="combat-result-panel__enemy-row">
                <div
                    v-for="enemy in enemyCards"
                    :key="enemy.enemyId"
                    class="combat-result-panel__unit"
                    :class="{ 'combat-result-panel__unit--dead': !enemy.alive }"
                >
                    <div
                        :key="enemy.cardFx?.key ?? -1"
                        class="combat-result-panel__unit-inner"
                        :class="enemy.cardFx ? `combat-result-panel__unit-inner--${enemy.cardFx.kind}` : ''"
                    >
                        <div class="combat-result-panel__unit-head">
                            <span
                                v-if="enemy.tierLabel"
                                class="combat-result-panel__tier"
                                :class="`combat-result-panel__tier--${enemy.isBoss ? 'boss' : 'minion'}`"
                            >
                                {{ enemy.tierLabel }}
                            </span>
                            <span class="text-caption combat-result-panel__unit-name">{{ enemy.name }}</span>
                        </div>
                        <div class="text-caption text-medium-emphasis combat-result-panel__unit-hp-text">
                            {{ enemy.alive ? `${enemy.hpCurrent} / ${enemy.hpMax}` : '已擊敗' }}
                        </div>
                        <div class="combat-result-panel__hp-bar">
                            <div
                                class="combat-result-panel__hp-bar-fill"
                                :style="{ width: `${enemy.hpPercent}%` }"
                            />
                        </div>
                        <div
                            v-if="enemy.alive"
                            class="combat-result-panel__gauge"
                        >
                            <div
                                v-if="enemy.gauge.percent !== null"
                                class="combat-result-panel__gauge-fill"
                                :class="{ 'combat-result-panel__gauge-fill--paused': enemy.gauge.paused }"
                                :style="{ width: `${enemy.gauge.percent}%` }"
                            />
                        </div>
                        <img
                            v-if="enemy.spark"
                            :key="enemy.spark.key"
                            :src="sparkSrc(enemy.spark.kind)"
                            class="combat-result-panel__spark"
                            :class="`combat-result-panel__spark--${enemy.spark.kind}`"
                            alt=""
                        >
                    </div>
                </div>
            </div>

            <div class="combat-result-panel__player-row">
                <div
                    class="combat-result-panel__unit combat-result-panel__unit--player"
                    :class="{ 'combat-result-panel__unit--dead': !playerAlive }"
                >
                    <div
                        :key="playerCardFx?.key ?? -1"
                        class="combat-result-panel__unit-inner"
                        :class="playerCardFx ? `combat-result-panel__unit-inner--${playerCardFx.kind}` : ''"
                    >
                        <div class="text-caption combat-result-panel__unit-name">你</div>
                        <div class="text-caption text-medium-emphasis combat-result-panel__unit-hp-text">
                            {{ playerAlive ? `${playerStatus.hpCurrent} / ${playerStatus.hpMax}` : '已陣亡' }}
                        </div>
                        <div class="combat-result-panel__hp-bar">
                            <div
                                class="combat-result-panel__hp-bar-fill"
                                :style="{ width: `${playerStatus.hpPercent}%` }"
                            />
                        </div>
                        <div
                            v-if="playerAlive"
                            class="combat-result-panel__gauge"
                        >
                            <div
                                v-if="playerGauge.percent !== null"
                                class="combat-result-panel__gauge-fill"
                                :class="{ 'combat-result-panel__gauge-fill--paused': playerGauge.paused }"
                                :style="{ width: `${playerGauge.percent}%` }"
                            />
                        </div>
                        <img
                            v-if="playerSpark"
                            :key="playerSpark.key"
                            :src="sparkSrc(playerSpark.kind)"
                            class="combat-result-panel__spark"
                            :class="`combat-result-panel__spark--${playerSpark.kind}`"
                            alt=""
                        >
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="playbackDone"
            class="font-pixel text-subtitle-2 mb-2"
            :style="{ color: result.summary.victory ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
        >
            {{ result.summary.victory ? '戰鬥勝利' : '戰鬥失敗' }}
        </div>

        <div
            v-if="playbackDone"
            class="d-flex ga-4 text-caption text-medium-emphasis mb-2"
        >
            <span>回合 {{ result.summary.roundCount }}</span>
            <span v-if="result.summary.expGained">EXP +{{ result.summary.expGained }}</span>
            <span v-if="result.summary.goldDropped">金幣 +{{ result.summary.goldDropped }}</span>
            <span v-if="result.summary.gemsDropped">寶石 +{{ result.summary.gemsDropped }}</span>
        </div>
        <div
            v-if="playbackDone && result.summary.itemsDropped.length > 0"
            class="text-caption text-medium-emphasis mb-2"
        >
            掉落物品：{{ droppedItemNames.join('、') }}
        </div>
    </div>
</template>

<script setup lang="ts">
import type { CombatApiResult } from '../../composables/useAdventureRun';
import type { CombatLogEntry } from '../../../shared/types/adventure';
import { describeItem } from '../../utils/equipmentDisplay';

const props = defineProps<{ result: CombatApiResult; playerHpMax: number }>();
const emit = defineEmits<{ 'playback-done': [] }>();

const droppedItemNames = computed(() => props.result.summary.itemsDropped.map(item => describeItem(item).name));

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
const groups = computed<LogGroup[]>(() => {
    const result: LogGroup[] = [];
    for (const entry of props.result.combatLog) {
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
type ScheduledGroup = { group: LogGroup; displayAt: number; waveStartAt: number };
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

const visibleGroupCount = ref(0);
const playbackDone = computed(() => visibleGroupCount.value >= groups.value.length && groups.value.length > 0);
watch(playbackDone, (done) => {
    if (done) emit('playback-done');
});
const visibleEntries = computed(() => groups.value.slice(0, visibleGroupCount.value).flatMap(group => group.entries));

// 出手/受擊演出：每次有新的一批 log 被播出，就替涉及的單位各觸發一次一次性
// 特效，跟充能條的百分比計算完全分開（充能條講的是「下一次出手還要多久」，
// 這裡講的是「這一刻正在發生什麼」）。用遞增的 key 讓 DOM 重新掛載來重播
// CSS animation，setTimeout 到期後從 map 移除即可讓 v-if 自然收掉。
// - cardFx：卡片本身的位移演出——出手方（attacker）一律向敵方 transition
//   再彈回來；被攻擊方若閃避成功，則是橫向 transition 再彈回來。
// - sparkFx：受擊方（真的被打中時）疊加的像素風特效圖，一般命中/爆擊各一張，
//   全部在 500ms 內演出完畢。
type CardFx = { kind: 'attack' | 'dodge'; key: number };
type SparkFx = { kind: 'hit' | 'crit'; key: number };
const CARD_FX_MS = 320;
const SPARK_FX_MS = 450;
const cardFx = reactive(new Map<string, CardFx>());
const sparkFx = reactive(new Map<string, SparkFx>());
const cardFxTimers = new Map<string, ReturnType<typeof setTimeout>>();
const sparkFxTimers = new Map<string, ReturnType<typeof setTimeout>>();
let fxKeySeq = 0;

const triggerCardFx = (unitId: string, kind: CardFx['kind']) => {
    cardFx.set(unitId, { kind, key: fxKeySeq++ });
    const existing = cardFxTimers.get(unitId);
    if (existing) clearTimeout(existing);
    cardFxTimers.set(unitId, setTimeout(() => cardFx.delete(unitId), CARD_FX_MS));
};
const triggerSparkFx = (unitId: string, kind: SparkFx['kind']) => {
    sparkFx.set(unitId, { kind, key: fxKeySeq++ });
    const existing = sparkFxTimers.get(unitId);
    if (existing) clearTimeout(existing);
    sparkFxTimers.set(unitId, setTimeout(() => sparkFx.delete(unitId), SPARK_FX_MS));
};
const clearFxTimers = () => {
    cardFxTimers.forEach(timer => clearTimeout(timer));
    sparkFxTimers.forEach(timer => clearTimeout(timer));
    cardFxTimers.clear();
    sparkFxTimers.clear();
    cardFx.clear();
    sparkFx.clear();
};

const sparkSrc = (kind: SparkFx['kind']) => (
    kind === 'crit' ? '/images/combat-fx/crit-spark.png' : '/images/combat-fx/hit-spark.png'
);

watch(visibleGroupCount, (count) => {
    if (count === 0) return;
    const group = groups.value[count - 1];
    if (!group) return;
    for (const entry of group.entries) {
        // DEATH 跟同一批的 ATTACK/CRIT 共用 actorId/targetId，特效已經由
        // 那筆 sibling entry觸發過，這裡跳過避免重複播放。
        if (entry.action === 'DEATH') continue;
        triggerCardFx(entry.actorId, 'attack');
        if (entry.action === 'DODGE') {
            triggerCardFx(entry.targetId, 'dodge');
        } else {
            triggerSparkFx(entry.targetId, entry.action === 'CRIT' ? 'crit' : 'hit');
        }
    }
});

// enemyId -> 所屬 wave：每隻敵人的 id 都是 crypto.randomUUID() 產生、只會在
// 牠出生的那個 wave 出現在 combatLog 裡（見 combat.service.ts spawnWave），
// 用第一筆提到這個 id 的 log entry 的 wave 反推回來。
type EnemyWaveMap = Map<string, number>;
const enemyWaveById = computed<EnemyWaveMap>(() => {
    const map: EnemyWaveMap = new Map();
    for (const entry of props.result.combatLog) {
        if (entry.actorId !== 'player' && !map.has(entry.actorId)) map.set(entry.actorId, entry.wave);
        if (entry.targetId !== 'player' && !map.has(entry.targetId)) map.set(entry.targetId, entry.wave);
    }
    return map;
});

// 每個 wave 實際開始播放的時間點（沿用 schedule 算好的 waveStartAt，即行動
// 條開始充能的時間點）。
type WaveStart = { wave: number; startAt: number };
const waveStarts = computed<WaveStart[]>(() => {
    const result: WaveStart[] = [];
    let prevWave = -1;
    for (const { group, waveStartAt } of schedule.value) {
        if (group.wave !== prevWave) {
            result.push({ wave: group.wave, startAt: waveStartAt });
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
const waveBannerTimings = computed<WaveBannerTiming[]>(() => waveStarts.value.map(({ wave, startAt }, index) => {
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
type WaveBanner = {
    label: '戰鬥結束' | '敵方增援來襲' | '戰鬥開始';
    textKey: string;
    showText: boolean;
    textExiting: boolean;
    containerExiting: boolean;
    waveNumber: number;
    totalWaves: number;
    showCount: boolean;
};
const waveBanner = computed<WaveBanner | null>(() => {
    const timing = waveBannerTimings.value.find(({ bannerAt, goneAt }) => nowMs.value >= bannerAt && nowMs.value < goneAt);
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

// 判斷「目前播放進度落在哪個 wave 已經揭露」——用 banner 消失的時間點
// （goneAt）而非充能開始的時間點（startAt）：增援/下一波敵人要在 banner
// 播完、退場的當下就站上場（給玩家時間看清楚新一波敵人），而不是要等到
// BANNER_POST_DELAY_MS 停頓結束、真正開始出手攻擊的那一刻才出現在畫面上
// （見使用者回報：敵人會在被攻擊到時才出現）。
const revealedWave = computed(() => {
    let wave = waveBannerTimings.value[0]?.wave ?? 0;
    for (const { wave: candidateWave, goneAt } of waveBannerTimings.value) {
        if (goneAt > nowMs.value) break;
        wave = candidateWave;
    }
    return wave;
});

// 敵人狀態：以目前已播放的 log 批次逐步套用 targetHpRemaining/DEATH，還原
// 每隻敵人「播放進度當下」的 HP 與存活狀態；只有 Boss 戰（有任一 isBoss）
// 才顯示頭目/小兵的階級標籤，一般戰鬥沒有這個區分，不硬套標籤。尚未輪到的
// wave（見 revealedWave）其敵人先過濾掉，不提前出現在場上。
const hasBossComposition = computed(() => props.result.summary.enemies.some(enemy => enemy.isBoss));
const enemyStatus = computed(() => {
    const status = new Map(props.result.summary.enemies
        .filter(enemy => (enemyWaveById.value.get(enemy.enemyId) ?? 0) <= revealedWave.value)
        .map(enemy => [enemy.enemyId, {
            enemyId: enemy.enemyId,
            name: enemy.name,
            hpMax: enemy.hpMax,
            hpCurrent: enemy.hpMax,
            isBoss: enemy.isBoss,
            alive: true,
        }]));

    for (const entry of visibleEntries.value) {
        const unit = status.get(entry.targetId);
        if (!unit) continue;
        if (entry.targetHpRemaining !== undefined) unit.hpCurrent = entry.targetHpRemaining;
        if (entry.action === 'DEATH') unit.alive = false;
    }

    return Array.from(status.values()).map(unit => ({
        ...unit,
        hpPercent: unit.hpMax > 0 ? Math.max(0, Math.min(100, (unit.hpCurrent / unit.hpMax) * 100)) : 0,
        tierLabel: hasBossComposition.value ? (unit.isBoss ? '頭目' : '小兵') : '',
    }));
});

const playerAlive = computed(() => (
    !visibleEntries.value.some(entry => entry.action === 'DEATH' && entry.targetId === 'player')
));

// 玩家目前 HP：與 enemyStatus 同樣的邏輯，以已播放的 log 逐步套用 targetHpRemaining。
const playerStatus = computed(() => {
    let hpCurrent = props.playerHpMax;
    for (const entry of visibleEntries.value) {
        if (entry.targetId !== 'player' || entry.targetHpRemaining === undefined) continue;
        hpCurrent = entry.targetHpRemaining;
    }
    return {
        hpCurrent,
        hpMax: props.playerHpMax,
        hpPercent: props.playerHpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / props.playerHpMax) * 100)) : 0,
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
type GaugeScheduleEntry = { group: LogGroup; actAt: number; waveStartAt: number };
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

        result.push({ group, actAt, waveStartAt });
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
type UnitCycle = { start: number; end: number | null; hitDisplayTimes: number[]; endsWave: boolean };
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
    for (const { group, actAt, waveStartAt } of gaugeSchedule.value) {
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

type UnitGauge = { percent: number | null; paused: boolean };

// 找出某個時間點 nowMs 落在哪個充能週期，並算出目前的百分比：
// - 週期內每一段命中時間窗（[hitAt, hitAt+STUN_MS)，裁切到週期範圍內、合併重疊
//   區間）都會讓百分比原地暫停，時間窗結束後才繼續累加。
// - 分母固定用整個週期的實際長度（total，已經包含 stun 造成的延後），不會在
//   暫停之後把分母縮小、逼百分比在 end 那一刻精準補回 100%——那樣做等於是
//   暫停結束後「加速趕上原本進度」。停頓時間就應該算進總長度裡，充能速度全程
//   維持同一個節奏，不因為中途被打斷而變快。
const gaugeAt = (unitId: string, atMs: number): UnitGauge => {
    const list = unitCycles.value.get(unitId);
    if (!list || list.length === 0) return { percent: null, paused: false };

    let cycle = list[0]!;
    for (const candidate of list) {
        if (candidate.start > atMs) break;
        cycle = candidate;
    }
    if (cycle.end === null) return { percent: null, paused: false };
    // atMs 還沒到這個週期的起點：候選迴圈一找到「start > atMs」的週期就會直接
    // break、保留迴圈開始前預設的 list[0]，不代表 atMs 真的落在 list[0] 的區間
    // 內。這在週期長度剛好是 0（單位在這個 wave 一開戰就瞬間出手，見下面
    // total <= 0 的情況）時特別明顯：若不擋在這裡，還沒輪到這個週期就會被
    // total <= 0 那支分支誤判成「已經 100%」，導致 banner 播放期間（充能根本
    // 還沒開始）行動條就直接顯示滿條（見使用者回報：第一波次 banner 消失時
    // 行動條已經是滿的）。
    if (atMs < cycle.start) return { percent: 0, paused: false };
    // endsWave 的週期一旦被追過 end，代表舊 wave 已經結束、新 wave 的 banner／
    // 停頓還在播、真正的充能還沒開始，顯示 0% 而不是沿用舊 wave 打完那一刻的
    // 滿條狀態（見上面 unitCycles 的說明）。
    if (cycle.endsWave && atMs >= cycle.end) return { percent: 0, paused: false };

    const { start, end, hitDisplayTimes } = cycle;
    const total = end - start;
    if (total <= 0) return { percent: 100, paused: false };

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

    return { percent, paused };
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

const enemyCards = computed(() => enemyStatus.value.map(enemy => ({
    ...enemy,
    gauge: gaugeAt(enemy.enemyId, nowMs.value),
    cardFx: cardFx.get(enemy.enemyId),
    spark: sparkFx.get(enemy.enemyId),
})));
const playerGauge = computed(() => gaugeAt('player', nowMs.value));
const playerCardFx = computed(() => cardFx.get('player'));
const playerSpark = computed(() => sparkFx.get('player'));

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
    if (schedule.value.length === 0) return;

    playbackStartedAt = performance.now();
    schedule.value.forEach(({ displayAt }, index) => {
        timers.push(setTimeout(() => {
            visibleGroupCount.value = index + 1;
        }, displayAt));
    });
    rafHandle = requestAnimationFrame(tickGaugeClock);
};

watch(() => props.result, schedulePlayback, { immediate: true });
onUnmounted(() => {
    clearTimers();
    stopGaugeClock();
    clearFxTimers();
});
</script>

<style scoped lang="scss">
.combat-result-panel {
    &__arena {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    // 換 wave 的 banner：橫越戰場的全寬條，底色先淡入撐開、全程維持到最後才
    // 淡出消失（containerExiting），中途可能依序播三段文字——換 wave 時先
    // 「戰鬥結束」、再「敵方增援來襲」、最後「戰鬥開始」，第一個 wave 只有
    // 「戰鬥開始」一段——文字換場
    // 靠 template 上的 :key 重新掛載觸發進場動畫，textExiting 則各自觸發自己
    // 的離場動畫，兩者跟底色的 containerExiting 分開判斷（見 script
    // waveBanner）。
    &__wave-banner {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.72);
        border-block: 1px solid rgba(var(--v-theme-warning), 0.6);
        opacity: 0;
        animation: combat-result-panel-banner-bg-in 0.2s ease-out forwards;

        &--exit {
            animation: combat-result-panel-banner-bg-out 0.2s ease-in forwards;
        }
    }

    &__wave-banner-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        opacity: 0;
        animation: combat-result-panel-banner-text-in 0.2s ease-out forwards;

        &--exit {
            animation: combat-result-panel-banner-text-out 0.2s ease-in forwards;
        }
    }

    &__wave-banner-title {
        font-size: 20px;
        letter-spacing: 4px;
        color: rgb(var(--v-theme-warning));
    }

    &__wave-banner-count {
        font-size: 12px;
        letter-spacing: 2px;
        color: rgba(255, 255, 255, 0.7);
    }

    &__enemy-row {
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        // overflow-x/overflow-y 只要有一軸不是 visible，另一軸宣告成 visible
        // 會被瀏覽器強制轉成 auto（CSS Overflow 規格），所以這裡兩軸都明確宣告
        // 非 visible，改用 padding-block 預留 lunge/spark 特效的位移空間，
        // 靠 margin-block 抵消 padding 造成的版面位移，避免多出垂直捲軸。
        overflow-x: auto;
        overflow-y: hidden;
        gap: 6px;
        padding: 16px 0 18px;
        margin: -16px 0 -18px;
        // 出手方向：敵人向下（朝玩家）撲出去再彈回來。
        --fx-dir: 1;
    }

    &__player-row {
        display: flex;
        justify-content: center;
        // 出手方向：玩家向上（朝敵人）撲出去再彈回來。
        --fx-dir: -1;
    }

    &__unit {
        flex-shrink: 0;
        width: 92px;
        transition: opacity 0.2s ease;

        &--dead {
            opacity: 0.45;
        }

        &--player {
            width: 96px;
        }
    }

    // 整張卡片（背景/邊框/padding 都在這一層，不是外層 &__unit）才是出手/受擊
    // 演出實際位移的對象，這樣動畫動的是整塊卡片，不是只有裡面的文字內容。
    // 跟外層 &__unit 分開，是為了靠 :key 重新掛載這一層來重播動畫時，外層卡片
    // 的存活/透明度狀態（&--dead 的 opacity transition）不會被打斷。
    &__unit-inner {
        position: relative;
        padding: 6px 8px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;

        &--attack {
            animation: combat-result-panel-lunge 0.3s ease-out;
        }

        &--dodge {
            animation: combat-result-panel-dodge 0.38s ease-out;
        }
    }

    // 受擊像素風特效：疊在卡片正中央，命中/爆擊共用同一個 pop-in→停留→
    // 淡出的動畫，靠圖片本身的尺寸/顏色（見 script sparkSrc）區分強弱。
    // 全程 0.45s，落在「500ms 內演繹完畢」的要求內。
    &__spark {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 28px;
        height: 28px;
        transform: translate(-50%, -50%) scale(0.3);
        image-rendering: pixelated;
        pointer-events: none;
        animation: combat-result-panel-spark-pop 0.45s ease-out forwards;

        &--crit {
            width: 40px;
            height: 40px;
            filter: drop-shadow(0 0 4px rgba(255, 140, 0, 0.7));
        }
    }

    &__unit-head {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        min-width: 0;
    }

    &__unit-name {
        display: block;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    &__unit-hp-text {
        margin-top: 1px;
    }

    &__tier {
        font-size: 10px;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;
        flex-shrink: 0;

        &--boss {
            background: rgba(var(--v-theme-warning), 0.2);
            color: rgb(var(--v-theme-warning));
        }

        &--minion {
            background: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.7);
        }
    }

    &__hp-bar {
        margin-top: 3px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.12);
        overflow: hidden;
    }

    &__hp-bar-fill {
        height: 100%;
        background: rgb(var(--v-theme-warning));
        transition: width 0.3s ease;
    }

    // 攻速充能條：底色用等分的格線做出「電池格」的機械感，寬度由 script 的
    // gaugeAt() 直接算好寫入（見下方 &__gauge-fill）。
    &__gauge {
        width: 100%;
        margin-top: 4px;
        height: 4px;
        border-radius: 2px;
        overflow: hidden;
        background-color: rgba(255, 255, 255, 0.08);
        background-image: repeating-linear-gradient(
            to right,
            transparent 0,
            transparent calc(10% - 1px),
            rgba(0, 0, 0, 0.4) calc(10% - 1px),
            rgba(0, 0, 0, 0.4) 10%
        );
    }

    // 寬度由 JS（gaugeAt，每個 requestAnimationFrame 幀）直接算好寫入，不用
    // CSS animation：百分比本身已經把「被打斷暫停」的效果算進去了，這裡的
    // transition 只是讓每幀之間的寬度變化不要跳幀、視覺更平滑。
    &__gauge-fill {
        height: 100%;
        background-color: #fff;
        transition: width 0.1s linear;

        &--paused {
            background-color: rgba(255, 255, 255, 0.4);
        }
    }
}

// 「戰鬥開始」banner 底色：橫向撐開進場／收合退場，做出橫越畫面的感覺。
@keyframes combat-result-panel-banner-bg-in {
    0% {
        opacity: 0;
        transform: scaleX(0);
    }
    100% {
        opacity: 1;
        transform: scaleX(1);
    }
}

@keyframes combat-result-panel-banner-bg-out {
    0% {
        opacity: 1;
        transform: scaleX(1);
    }
    100% {
        opacity: 0;
        transform: scaleX(0);
    }
}

// 「戰鬥開始」文字：由下往上淡入／淡出離場。
@keyframes combat-result-panel-banner-text-in {
    0% {
        opacity: 0;
        transform: translateY(6px);
    }
    100% {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes combat-result-panel-banner-text-out {
    0% {
        opacity: 1;
        transform: translateY(0);
    }
    100% {
        opacity: 0;
        transform: translateY(-6px);
    }
}

// 出手：向敵方（--fx-dir，見 &__enemy-row / &__player-row）撲出去再彈回來。
@keyframes combat-result-panel-lunge {
    0% {
        transform: translateY(0);
    }
    45% {
        transform: translateY(calc(var(--fx-dir, 1) * 14px));
    }
    100% {
        transform: translateY(0);
    }
}

// 閃避：橫向 transition 再彈回來。
@keyframes combat-result-panel-dodge {
    0% {
        transform: translateX(0);
    }
    30% {
        transform: translateX(12px);
    }
    65% {
        transform: translateX(-4px);
    }
    100% {
        transform: translateX(0);
    }
}

@keyframes combat-result-panel-spark-pop {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.3);
    }
    25% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.15);
    }
    45% {
        transform: translate(-50%, -50%) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1);
    }
}
</style>
