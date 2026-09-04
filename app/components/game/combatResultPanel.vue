<template>
    <div class="combat-result-panel">
        <!-- 戰場：敵人單排橫向卡片（不換行，過多時橫向捲動）。玩家不再是這裡的一張小卡，
             改由 adventure.vue 的持久化「大角色 stage」承接（見該檔案），這裡只負責
             banner + 敵方卡片 + 結算文字。 -->
        <div class="combat-result-panel__arena">
            <div
                v-if="displayedBanner"
                class="combat-result-panel__wave-banner"
                :class="{ 'combat-result-panel__wave-banner--exit': displayedBanner.containerExiting }"
            >
                <div
                    v-if="displayedBanner.showText"
                    :key="displayedBanner.textKey"
                    class="combat-result-panel__wave-banner-text"
                    :class="{ 'combat-result-panel__wave-banner-text--exit': displayedBanner.textExiting }"
                >
                    <span class="font-pixel combat-result-panel__wave-banner-title">{{ displayedBanner.label }}</span>
                    <span
                        v-if="displayedBanner.showCount"
                        class="font-pixel combat-result-panel__wave-banner-count"
                    >
                        {{ displayedBanner.waveNumber }}/{{ displayedBanner.totalWaves }} 波次
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
                    <div class="combat-result-panel__fx-anchor">
                        <div
                            :key="enemy.cardFx?.key ?? -1"
                            class="combat-result-panel__unit-inner"
                            :class="enemy.cardFx ? `combat-result-panel__unit-inner--${enemy.cardFx.kind}` : ''"
                        >
                            <img
                                :src="enemyAvatarSrc(enemy.isBoss, enemy.archetypeSlug)"
                                alt=""
                                class="combat-result-panel__avatar"
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
                                {{ enemy.alive ? `${Math.round(enemy.hpCurrent)} / ${enemy.hpMax}` : '已擊敗' }}
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
                        </div>
                        <GameSparkFx
                            v-if="enemy.spark"
                            :key="enemy.spark.key"
                            :kind="enemy.spark.kind"
                            class="combat-result-panel__spark"
                            :class="`combat-result-panel__spark--${enemy.spark.kind}`"
                        />
                        <span
                            v-if="enemy.damageText"
                            :key="enemy.damageText.key"
                            class="combat-result-panel__damage-text"
                            :class="`combat-result-panel__damage-text--${enemy.damageText.kind}`"
                        >
                            <span
                                v-if="enemy.damageText.kind === 'crit'"
                                class="combat-result-panel__damage-text-crit-label"
                            >爆擊</span>
                            <span>{{ enemy.damageText.kind === 'dodge' ? '閃避' : enemy.damageText.value }}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { WaveBanner, EnemyCardView } from '../../composables/useCombat';
import { getEnemyAvatarTier, getEnemyPortraitUrl } from '../../utils/enemyAvatar';
import type { EnemyFaction, NodeType } from '../../../shared/types/adventure';

const props = defineProps<{
    displayedBanner: WaveBanner | null;
    enemyCards: EnemyCardView[];
    factionType: EnemyFaction;
    currentNodeType?: NodeType;
}>();

const enemyAvatarSrc = (isBoss: boolean, archetypeSlug?: string) => (
    getEnemyPortraitUrl(archetypeSlug, props.factionType, getEnemyAvatarTier(isBoss, props.currentNodeType))
);
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
        justify-content: center;
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

    &__unit {
        flex-shrink: 0;
        width: 72px;
        transition: opacity 0.2s ease;

        &--dead {
            opacity: 0.45;
        }
    }

    // fx-anchor：spark／傷害飄字獨立掛在這一層（跟 unit-inner 是兄弟節點，不是
    // 子節點），避免 unit-inner 因為自己的 :key（cardFx 出手/閃避動畫）重新掛載時
    // 把還在播放中的 spark／飄字一併拆掉重建，導致同一個效果在原本的動畫還沒播完
    // 時被重新掛載、看起來像是重播了一次（見使用者回報：首次受擊 effect 跳兩/三次）。
    &__fx-anchor {
        position: relative;
    }

    // 整張卡片（背景/邊框/padding 都在這一層，不是外層 &__unit）才是出手/受擊
    // 演出實際位移的對象，這樣動畫動的是整塊卡片，不是只有裡面的文字內容。
    // 跟外層 &__unit 分開，是為了靠 :key 重新掛載這一層來重播動畫時，外層卡片
    // 的存活/透明度狀態（&--dead 的 opacity transition）不會被打斷。
    &__unit-inner {
        padding: 6px 8px;

        &--attack {
            animation: combat-result-panel-lunge 0.3s ease-out;
        }

        &--dodge {
            animation: combat-result-panel-dodge 0.38s ease-out;
        }
    }

    // 受擊像素風特效：疊在卡片正中央，命中/爆擊共用同一個 pop-in→停留→
    // 淡出的容器動畫，實際揮砍影格演繹由 GameSparkFx 自己播放（見
    // useCombat.ts sparkFrameUrls）。全程 0.45s，落在「500ms 內演繹完畢」的要求內。
    &__spark {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 48px;
        height: 48px;
        transform: translate(-50%, -50%) scale(0.3);
        image-rendering: pixelated;
        pointer-events: none;
        animation: combat-result-panel-spark-pop 0.45s ease-out forwards;

        &--crit {
            width: 68px;
            height: 68px;
            filter: drop-shadow(0 0 4px rgba(255, 140, 0, 0.7));
        }
    }

    // 傷害數字／閃避文字飄字：疊在卡片正上方，由下往上飄並淡出，跟 &__spark
    // 一樣是一次性特效、靠 :key 重新掛載重播（見 script useCombat 的
    // damageTextFx）。一般命中用中性色、爆擊用警示色放大、閃避用純文字。
    &__damage-text {
        position: absolute;
        top: -4px;
        left: 50%;
        transform: translate(-50%, 0);
        font-weight: 700;
        font-size: 13px;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        pointer-events: none;
        white-space: nowrap;
        animation: combat-result-panel-damage-text-float 0.7s ease-out forwards;

        &--crit {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 1px;
            font-size: 18px;
            color: rgb(var(--v-theme-warning));
        }

        &--dodge {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.75);
        }
    }

    &__damage-text-crit-label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.05em;
    }

    // 敵人 panel 的 avatar：依 faction+tier 共用圖（見 utils/enemyAvatar.ts），
    // 24x24 網格放大的像素圖，維持一致銳利邊緣。
    &__avatar {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        margin-bottom: 3px;
        image-rendering: pixelated;
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
        white-space: normal;
        word-break: break-word;
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

// 出手：向敵方（--fx-dir，見 &__enemy-row）撲出去再彈回來。
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

// 傷害飄字：由下往上飄並淡出，全程落在 0.7s 內演繹完畢。
@keyframes combat-result-panel-damage-text-float {
    0% {
        opacity: 0;
        transform: translate(-50%, 0);
    }
    20% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -22px);
    }
}
</style>
