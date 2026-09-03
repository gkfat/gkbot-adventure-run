<template>
    <div
        class="fill-height adventure-page pa-3 d-flex flex-column"
        :class="{ 'adventure-page--walking': walkFrame.isWalking.value }"
        :style="pageBackgroundStyle"
    >
        <!-- 讀取中 -->
        <div
            v-if="characterLoading || (runLoading && !checked)"
            class="d-flex flex-column align-center justify-center fill-height"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="56"
                :width="5"
                class="mb-4"
            />
            <div class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary)); opacity: 0.8;">
                載入冒險中
            </div>
        </div>

        <!-- 結算頁：run 已結束（COMPLETED/DEAD/DISCONNECT），顯示這次遠征的結算摘要 -->
        <div
            v-else-if="lastSettlement"
            class="d-flex flex-column align-center fill-height px-4 py-6 adventure-page__settlement"
        >
            <div
                class="font-pixel text-subtitle-1 mb-4"
                :style="{ color: settlementIsSuccess ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
            >
                {{ settlementIsSuccess ? '遠征成功' : '冒險失敗' }}
            </div>

            <div
                v-if="lastSettlement.leveledUp"
                class="adventure-page__levelup mb-4 text-center"
            >
                <div class="font-pixel text-h6" style="color: rgb(var(--v-theme-warning));">
                    LEVEL UP!
                </div>
                <div class="text-body-2 text-medium-emphasis">
                    LV {{ lastSettlement.newLevel }}
                </div>
            </div>

            <div class="adventure-page__box mb-3" style="width: 100%;">
                <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption text-medium-emphasis">EXP</span>
                    <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                        +{{ lastSettlement.expGained }}
                    </span>
                </div>
                <v-progress-linear
                    :model-value="expDisplayPercent"
                    color="primary"
                    bg-color="dark"
                    height="8"
                    rounded
                />
            </div>

            <div class="adventure-page__box mb-3" style="width: 100%;">
                <div class="d-flex ga-4 text-caption text-medium-emphasis mb-2">
                    <span>金幣 +{{ lastSettlement.goldEarned }}</span>
                    <span>寶石 +{{ lastSettlement.gemsEarned }}</span>
                </div>
                <div
                    v-if="lastSettlement.items.length"
                    class="d-flex flex-wrap ga-2"
                >
                    <div
                        v-for="item in lastSettlement.items"
                        :key="item.itemId"
                        class="adventure-page__item-chip"
                        :style="{ borderColor: RARITY_COLOR[item.rarity] }"
                    >
                        <span
                            class="adventure-page__item-chip-rarity font-pixel"
                            :style="{ background: RARITY_COLOR[item.rarity] }"
                        >
                            {{ item.rarity }}
                        </span>
                        <GamePixelIcon
                            :name="resolvePixelIcon(item)"
                            :size="20"
                        />
                        {{ describeItem(item).name }}
                    </div>
                </div>
                <div
                    v-else
                    class="text-caption text-medium-emphasis"
                >
                    沒有取得物品
                </div>
            </div>

            <div
                v-if="!settlementIsSuccess"
                class="adventure-page__box adventure-page__box--forfeited mb-3"
                style="width: 100%;"
            >
                <div class="text-caption mb-2" style="color: rgb(var(--v-theme-warning));">
                    因戰敗作廢
                </div>
                <div class="d-flex ga-4 text-caption text-medium-emphasis mb-2">
                    <span>金幣 {{ lastSettlement.forfeitedGold }}</span>
                    <span>寶石 {{ lastSettlement.forfeitedGems }}</span>
                </div>
                <div
                    v-if="lastSettlement.forfeitedItems.length"
                    class="d-flex flex-wrap ga-2"
                >
                    <div
                        v-for="item in lastSettlement.forfeitedItems"
                        :key="item.itemId"
                        class="adventure-page__item-chip adventure-page__item-chip--forfeited"
                    >
                        <span
                            class="adventure-page__item-chip-rarity font-pixel"
                            :style="{ background: RARITY_COLOR[item.rarity] }"
                        >
                            {{ item.rarity }}
                        </span>
                        <GamePixelIcon
                            :name="resolvePixelIcon(item)"
                            :size="20"
                        />
                        {{ describeItem(item).name }}
                    </div>
                </div>
            </div>

            <div
                v-if="lastSettlement.unspentAttributePointsGained > 0"
                class="text-caption text-medium-emphasis mb-4 text-center"
            >
                獲得 {{ lastSettlement.unspentAttributePointsGained }} 點可分配屬性點，回到角色畫面分配吧
            </div>

            <SystemBtn
                variant="flat"
                color="primary"
                class="text-none"
                @click="handleReturnHome"
            >
                回到營地
            </SystemBtn>
        </div>

        <!-- 沒有進行中的冒險 -->
        <div
            v-else-if="!currentRun"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <div class="text-body-2 text-medium-emphasis mb-4">
                目前沒有進行中的冒險
            </div>
            <SystemBtn
                variant="flat"
                color="primary"
                class="text-none"
                @click="navigateTo('/main')"
            >
                回到首頁
            </SystemBtn>
        </div>

        <!-- 開頭畫面：run 剛建立、尚未正式進入關卡，先給玩家一段主觀印象與去留選擇 -->
        <div
            v-else-if="currentRun.state === AdventureStateType.INIT"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center adventure-page__intro"
        >
            <div class="font-pixel text-subtitle-1 mb-3" style="color: rgb(var(--v-theme-green));">
                {{ stageDisplayName }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-3">
                {{ introNarrative }}
            </div>
            <div
                v-if="severityFactionHint"
                class="text-caption mb-6"
                :style="{ color: severityFactionHint.color }"
            >
                {{ severityFactionHint.text }}
            </div>
            <div class="d-flex flex-column ga-2 adventure-page__intro-actions">
                <SystemBtn
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    :loading="runLoading || enteringRun"
                    @click="handleStartExploring"
                >
                    進入關卡
                </SystemBtn>
                <SystemBtn
                    block
                    variant="outlined"
                    color="error"
                    class="text-none"
                    :loading="runLoading"
                    @click="handleRetreat"
                >
                    撤退
                </SystemBtn>
            </div>
        </div>

        <!-- 進場走路動畫：點擊「進入關卡」後先演繹一段走路，動畫播完才切換到下方
             「冒險進行中」畫面顯示第一個節點的內容（見 handleStartExploring）。
             版面刻意比照下方「冒險進行中」的 scroll／stage／actions 三段式結構
             （actions 用等高但隱藏的按鈕佔位），讓角色 sprite 落在跟戰鬥開始畫面
             完全相同的位置，避免動畫播完切換時角色位置跳動。scroll 區塊改成跟下方
             同一份 summary panel（currentRun 這時已經是 INIT 狀態、有初始值可顯示），
             不再整段留白，讓玩家一進關卡走路時就先看到關卡進度/累積獎勵（見使用者
             回報）。 -->
        <div
            v-else-if="enteringRun"
            class="d-flex flex-column fill-height"
        >
            <div class="adventure-page__scroll">
                <div
                    v-if="currentRun"
                    class="adventure-page__box mb-3"
                >
                    <div class="d-flex align-center justify-space-between">
                        <span class="font-pixel text-subtitle-1" style="color: rgb(var(--v-theme-green));">
                            {{ stageHeaderLabel }}
                        </span>
                        <div class="d-flex align-center ga-2">
                            <span class="text-caption text-medium-emphasis">{{ stateLabel }}</span>
                            <v-icon
                                icon="mdi-notebook-outline"
                                size="20"
                                color="primary"
                                class="pixel-press"
                                aria-label="開啟冒險記事本"
                                @click="showLogDialog = true"
                            />
                        </div>
                    </div>

                    <v-divider class="my-2" />
                    <div class="d-flex flex-wrap ga-4">
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">EXP</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-primary));">
                                {{ currentRun.expEarned }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">金幣</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: #e0c063;">
                                +{{ currentRun.goldEarned }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">寶石</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-primary));">
                                +{{ currentRun.gemsEarned }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">道具</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-green));">
                                x{{ currentRun.runInventory.length }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">祝福</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-green));">
                                x{{ currentRun.blessings.length }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">詛咒</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-warning));">
                                x{{ currentRun.curses.length }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                v-if="character"
                class="adventure-page__stage"
            >
                <div class="adventure-page__stage-fx-anchor">
                    <div class="adventure-page__stage-sprite-wrap">
                        <img
                            :src="characterSpriteSrc"
                            alt="角色"
                            class="adventure-page__stage-sprite"
                        >
                    </div>
                </div>
                <div class="adventure-page__stage-hp">
                    <div class="d-flex align-center justify-space-between">
                        <span class="text-caption text-medium-emphasis">HP</span>
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-warning));">
                            {{ Math.round(stageHp.current) }} / {{ stageHp.max }}<span
                                v-if="hpMaxBonus"
                                class="text-caption"
                                :style="{ color: hpMaxBonus > 0 ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
                            >({{ hpMaxBonus > 0 ? '+' : '' }}{{ hpMaxBonus }})</span>
                        </span>
                    </div>
                    <div class="adventure-page__stage-hp-bar">
                        <div
                            class="adventure-page__stage-hp-bar-fill"
                            :style="{ width: `${stageHp.percent}%` }"
                        />
                    </div>
                </div>
            </div>

            <div
                class="adventure-page__actions d-flex flex-column ga-2"
                style="visibility: hidden;"
            >
                <SystemBtn
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                >
                    開始戰鬥
                </SystemBtn>
            </div>
        </div>

        <!-- 冒險進行中 -->
        <template v-else>
            <div class="adventure-page__scroll adventure-page__banner-anchor">
                <!-- 獲得祝福/遭受詛咒：疊在目前節點內容上的 banner，取代原本的
                     v-dialog（確認用的「關閉」按鈕在下方 __actions 區塊，見
                     GameModifierAcquiredBanner）。 -->
                <GameModifierAcquiredBanner
                    v-if="acquiredModifierDialog"
                    :modifier="acquiredModifierDialog"
                    :effect-text="acquiredModifierDialog ? describeModifierEffect(acquiredModifierDialog) : ''"
                />

                <!-- 轉盤事件開獎結果：同一套 banner-anchor 疊加慣例，「關閉」按鈕
                     在下方 __actions（見 wheelResultPending）。 -->
                <GameWheelResultBanner
                    v-if="wheelResultPending"
                    :result="lastEventResult"
                />

                <div class="adventure-page__box mb-3">
                    <div class="d-flex align-center justify-space-between">
                        <span class="font-pixel text-subtitle-1" style="color: rgb(var(--v-theme-green));">
                            {{ stageHeaderLabel }}
                        </span>
                        <div class="d-flex align-center ga-2">
                            <span class="text-caption text-medium-emphasis">{{ stateLabel }}</span>
                            <v-icon
                                icon="mdi-notebook-outline"
                                size="20"
                                color="primary"
                                class="pixel-press"
                                aria-label="開啟冒險記事本"
                                @click="showLogDialog = true"
                            />
                        </div>
                    </div>

                    <!-- 累積獲得：從冒險一開始就顯示（初始為 0），不用等第一筆獎勵入帳 -->
                    <v-divider class="my-2" />
                    <div class="d-flex flex-wrap ga-4">
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">EXP</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-primary));">
                                {{ currentRun.expEarned }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">金幣</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: #e0c063;">
                                +{{ currentRun.goldEarned }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">寶石</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-primary));">
                                +{{ currentRun.gemsEarned }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">道具</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-green));">
                                x{{ currentRun.runInventory.length }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">祝福</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-green));">
                                x{{ currentRun.blessings.length }}
                            </div>
                        </div>
                        <div class="adventure-page__loot-stat">
                            <div class="text-caption text-medium-emphasis">詛咒</div>
                            <div class="font-pixel adventure-page__loot-value" style="color: rgb(var(--v-theme-warning));">
                                x{{ currentRun.curses.length }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- COMBAT：觸發戰鬥；戰鬥結果在 COMBAT/RESOLUTION 都顯示，直到玩家繼續前進。
                     玩家本身的顯示（背影/HP/行動條/spark/傷害飄字）已移到頁面下方持久化的
                     「角色 stage」（見 adventure-page__stage）；戰鬥結算文字改用
                     GameCombatSummaryBanner 疊在 arena 上呈現（確認用的「關閉」按鈕在下方
                     __actions 區塊），這裡只放敵方 arena，且進行中戰鬥不需要中間 panel 的
                     邊框（此時畫面就是戰鬥本身）。 -->
                <template v-if="currentRun.state === AdventureStateType.COMBAT || (currentRun.state === AdventureStateType.RESOLUTION && lastCombatResult)">
                    <!-- 戰鬥結束、玩家關掉結算 banner 後會自動推進並播放走路動畫（見下方
                         RESOLUTION/EXPLORING 的 auto-advance watch），這段期間 lastCombatResult
                         還沒被下一個節點的回應取代，敵方 panel（此時只剩下已擊敗的敵人）
                         應隨走路動畫隱藏，不要停留在畫面上（known-issue.md #2）。 -->
                    <div
                        v-if="lastCombatResult && !walkFrame.isWalking.value"
                        class="adventure-page__banner-anchor"
                    >
                        <GameCombatResultPanel
                            :displayed-banner="displayedBanner"
                            :enemy-cards="enemyCards"
                            :faction-type="currentRun.factionType"
                            :current-node-type="currentRun.currentNodeType"
                        />
                        <GameCombatSummaryBanner
                            v-if="combatSummaryDialogOpen"
                            :victory="combatVictory"
                            :round-count="combatRoundCount"
                            :exp-gained="combatExpGained"
                            :gold-dropped="combatGoldDropped"
                            :gems-dropped="combatGemsDropped"
                            :dropped-item-names="combatDroppedItemNames"
                        />
                    </div>
                    <!-- lastCombatResult 為空才是「還沒開打」的預備畫面；lastCombatResult
                         存在但正在播走路動畫（上面 v-if 為 false）代表戰鬥已經結束、正要
                         離開，不能落到這個 v-else 誤顯示「遭遇敵人，準備戰鬥」。 -->
                    <div
                        v-else-if="!lastCombatResult"
                        class="adventure-page__box mb-3"
                    >
                        <div
                            v-if="currentRun.currentNodeType === NodeType.BOSS"
                            class="font-pixel text-subtitle-2 mb-2"
                            style="color: rgb(var(--v-theme-warning));"
                        >
                            ⚠ BOSS 戰
                        </div>
                        <div class="text-body-2 text-medium-emphasis text-center mb-2">
                            {{ currentRun.currentNodeType === NodeType.BOSS ? '關卡頭目現身，準備迎戰' : '遭遇敵人，準備戰鬥' }}
                        </div>
                        <div
                            v-if="combatNodeData"
                            class="d-flex flex-column ga-2"
                        >
                            <div
                                v-for="(enemy, index) in combatNodeData.firstWaveEnemies"
                                :key="index"
                                class="adventure-page__enemy-row d-flex align-center ga-2"
                            >
                                <img
                                    :src="enemyPreviewAvatarSrc(combatNodeData.tier, enemy.isBoss, enemy.archetypeSlug)"
                                    alt=""
                                    class="adventure-page__enemy-preview-avatar"
                                >
                                <div class="flex-grow-1">
                                    <div class="d-flex align-center justify-space-between">
                                        <span class="text-body-2">
                                            <span
                                                class="font-pixel text-caption adventure-page__enemy-tier"
                                                :style="{ color: enemyTierColor(combatNodeData.tier, enemy.isBoss) }"
                                            >
                                                {{ enemyTierLabel(combatNodeData.tier, enemy.isBoss) }}
                                            </span>
                                            {{ enemy.name }}
                                        </span>
                                        <span class="text-caption text-medium-emphasis">HP {{ enemy.hp }}</span>
                                    </div>
                                    <div class="text-caption text-medium-emphasis">
                                        {{ enemy.description }}
                                    </div>
                                </div>
                            </div>
                            <div
                                v-if="combatNodeData.waveCount > 1"
                                class="text-caption text-medium-emphasis text-center mt-1"
                            >
                                偵測到後續增援，數量不明
                            </div>
                        </div>
                    </div>
                </template>

                <!-- EVENT：顯示事件描述；有 choices 顯示選項（留在這裡，因為要對應多個選項按鈕），
                     沒有 choices 時「繼續」改到下方固定的 __actions 區塊，跟角色 stage 對齊
                     （見下方 actions 的對應分支）。結果在 EVENT/RESOLUTION 都顯示，直到玩家繼續前進 -->
                <div
                    v-else-if="currentRun.state === AdventureStateType.EVENT || (currentRun.state === AdventureStateType.RESOLUTION && lastEventResult)"
                    class="adventure-page__box mb-3"
                >
                    <template v-if="lastEventResult">
                        <div class="text-body-2 mb-2">
                            {{ lastEventResult.description }}
                        </div>
                        <div class="d-flex flex-wrap ga-4 text-caption text-medium-emphasis">
                            <span v-if="lastEventResult.hpHealed">HP +{{ lastEventResult.hpHealed }}</span>
                            <span v-if="lastEventResult.goldGained">金幣 +{{ lastEventResult.goldGained }}</span>
                            <span v-if="lastEventResult.gemsGained">寶石 +{{ lastEventResult.gemsGained }}</span>
                            <span v-if="lastEventResult.blessingGranted">獲得一個祝福</span>
                            <span v-if="lastEventResult.curseApplied">遭受一個詛咒</span>
                            <span v-if="lastEventResult.itemsGained?.length">獲得物品 x{{ lastEventResult.itemsGained.length }}</span>
                        </div>
                    </template>
                    <template v-else>
                        <div class="text-body-2 mb-3">
                            {{ eventNodeData?.description }}
                        </div>
                        <div
                            v-if="eventNodeData?.choices?.length"
                            class="d-flex flex-column ga-2"
                        >
                            <SystemBtn
                                v-for="(choice, index) in eventNodeData.choices"
                                :key="index"
                                variant="outlined"
                                color="primary"
                                class="text-none"
                                :loading="runLoading"
                                @click="handleResolveEvent(index)"
                            >
                                {{ choice.label }}
                            </SystemBtn>
                        </div>
                    </template>
                </div>

                <!-- REST：可使用藥水 -->
                <div
                    v-else-if="currentRun.state === AdventureStateType.REST"
                    class="adventure-page__box mb-3"
                >
                    <div class="text-caption text-medium-emphasis mb-2 d-flex align-center ga-1">
                        <img
                            src="/images/combat-fx/heal-glow.png"
                            alt=""
                            width="18"
                            height="18"
                            style="image-rendering: pixelated;"
                        >
                        休息中，已自動恢復 {{ restNodeData?.autoHealAmount ?? 0 }} 點生命值，可使用藥水回復更多生命值
                    </div>

                    <div
                        v-if="restPotions.length === 0"
                        class="text-caption text-medium-emphasis text-center py-2"
                    >
                        沒有可用的藥水
                    </div>
                    <div
                        v-for="potion in restPotions"
                        :key="potion.itemId"
                        class="adventure-page__potion-row"
                    >
                        <span class="text-body-2">{{ describeItem(potion).name }}（{{ potion.rarity }}）</span>
                        <SystemBtn
                            variant="outlined"
                            color="primary"
                            size="small"
                            class="text-none"
                            :loading="runLoading"
                            @click="handleHeal(potion.itemId)"
                        >
                            使用
                        </SystemBtn>
                    </div>
                </div>

                <!-- RESOLUTION 但沒有戰鬥/事件結果要顯示（例如剛結束休息、或選完祝福後）：
                     單純的過場，補一段敘述文字讓「繼續前進」前有點內容可看 -->
                <div
                    v-if="currentRun.state === AdventureStateType.RESOLUTION && !lastCombatResult && !lastEventResult"
                    class="adventure-page__box mb-3"
                >
                    <div class="text-body-2 text-medium-emphasis">
                        {{ transitionNarrative }}
                    </div>
                </div>

                <div
                    v-if="runError"
                    class="text-body-2 mb-3"
                    style="color: rgb(var(--v-theme-warning));"
                >
                    {{ runError }}
                </div>
            </div>

            <!-- 角色 stage：探索與戰鬥共用同一個持久化的大角色顯示區，固定在畫面下方
                （敵方 arena 在上面的 scroll 區域）。HP 條疊加在角色圖像上，取代原本
                固定於頁面頂端的獨立 HP 區塊；戰鬥中額外疊加行動條/spark/傷害飄字。 -->
            <div
                v-if="character"
                class="adventure-page__stage"
            >
                <div class="adventure-page__stage-fx-anchor">
                    <img
                        v-if="acquiredModifierDialog"
                        :key="acquiredModifierDialog.modifierId"
                        :src="modifierGlowSrc"
                        alt=""
                        class="adventure-page__stage-glow"
                    >
                    <div
                        :key="inCombatStage && playerCardFx ? playerCardFx.key : -1"
                        class="adventure-page__stage-sprite-wrap"
                        :class="inCombatStage && playerCardFx ? `adventure-page__stage-sprite-wrap--${playerCardFx.kind}` : ''"
                    >
                        <img
                            :src="characterSpriteSrc"
                            alt="角色"
                            class="adventure-page__stage-sprite"
                            :class="{ 'adventure-page__stage-sprite--dead': inCombatStage && !playerAlive }"
                        >
                    </div>
                    <GameSparkFx
                        v-if="inCombatStage && playerSpark"
                        :key="playerSpark.key"
                        :kind="playerSpark.kind"
                        class="adventure-page__stage-spark"
                        :class="`adventure-page__stage-spark--${playerSpark.kind}`"
                    />
                    <span
                        v-if="inCombatStage && playerDamageText"
                        :key="playerDamageText.key"
                        class="adventure-page__stage-damage-text"
                        :class="`adventure-page__stage-damage-text--${playerDamageText.kind}`"
                    >
                        <span
                            v-if="playerDamageText.kind === 'crit'"
                            class="adventure-page__stage-damage-text-crit-label"
                        >爆擊</span>
                        <span>{{ playerDamageText.kind === 'dodge' ? '閃避' : playerDamageText.value }}</span>
                    </span>
                </div>
                <div class="adventure-page__stage-hp">
                    <div class="d-flex align-center justify-space-between">
                        <span class="text-caption text-medium-emphasis">HP</span>
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-warning));">
                            {{ Math.round(stageHp.current) }} / {{ stageHp.max }}<span
                                v-if="hpMaxBonus"
                                class="text-caption"
                                :style="{ color: hpMaxBonus > 0 ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
                            >({{ hpMaxBonus > 0 ? '+' : '' }}{{ hpMaxBonus }})</span>
                        </span>
                    </div>
                    <div class="adventure-page__stage-hp-bar">
                        <div
                            class="adventure-page__stage-hp-bar-fill"
                            :style="{ width: `${stageHp.percent}%` }"
                        />
                    </div>
                    <div
                        v-if="inCombatStage && playerAlive"
                        class="adventure-page__stage-gauge"
                    >
                        <div
                            v-if="playerGauge.percent !== null"
                            class="adventure-page__stage-gauge-fill"
                            :class="{ 'adventure-page__stage-gauge-fill--paused': playerGauge.paused }"
                            :style="{ width: `${playerGauge.percent}%` }"
                        />
                    </div>
                </div>
            </div>

            <div class="adventure-page__actions d-flex flex-column ga-2">
                <SystemBtn
                    v-if="combatSummaryDialogOpen"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    @click="showCombatSummaryDialog = false"
                >
                    關閉
                </SystemBtn>

                <SystemBtn
                    v-else-if="acquiredModifierDialog"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    @click="acquiredModifierDialog = null"
                >
                    關閉
                </SystemBtn>

                <SystemBtn
                    v-else-if="wheelResultPending"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    @click="wheelResultPending = false"
                >
                    關閉
                </SystemBtn>

                <SystemBtn
                    v-else-if="currentRun.state === AdventureStateType.COMBAT && !lastCombatResult"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    :loading="runLoading"
                    @click="handleStartCombat"
                >
                    開始戰鬥
                </SystemBtn>

                <SystemBtn
                    v-else-if="currentRun.state === AdventureStateType.EVENT && !lastEventResult && !eventNodeData?.choices?.length"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    :loading="runLoading"
                    @click="handleResolveEvent()"
                >
                    繼續
                </SystemBtn>

                <SystemBtn
                    v-else-if="canAdvanceGenerically
                        && currentRun.state !== AdventureStateType.RESOLUTION
                        && currentRun.state !== AdventureStateType.EXPLORING"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    :loading="runLoading"
                    @click="handleAdvance"
                >
                    {{ advanceLabel }}
                </SystemBtn>

                <!-- 上面三個分支都不成立時（例如戰鬥演出播放中、RESOLUTION/EXPLORING
                     自動推進中），仍用等高但隱藏的按鈕佔位，避免上方角色 stage
                     （緊貼在 actions 正上方，見 __stage 的 flex: 0 0 auto）因為
                     actions 高度收合而跳動。 -->
                <SystemBtn
                    v-else
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    style="visibility: hidden;"
                >
                    -
                </SystemBtn>
            </div>
        </template>

        <GameAdventureLogDialog
            v-model="showLogDialog"
            :entries="runLog"
        />

        <GameBlessingSelectDialog
            :open="currentRun?.state === AdventureStateType.BLESSING_SELECT"
            :candidates="blessingCandidatesWithEffect"
            :loading="runLoading"
            @select="handleSelectBlessing"
        />
    </div>
</template>

<script setup lang="ts">
import {
    AdventureStateType, NodeType, EventType, getStageDisplayName,
    type FacilitySeverity, type EnemyFaction, type RunModifier,
} from '../../shared/types/adventure';
import { EXP_TABLE } from '../../shared/types/character';
import { BLESSING_TEMPLATES, CURSE_TEMPLATES } from '../../shared/constants/blessings';
import type { Stats } from '../../shared/types/common';
import { describeItem, resolvePixelIcon, RARITY_COLOR, type ItemLike } from '../utils/equipmentDisplay';
import type { EventNodeData, BlessingNodeData, CombatNodeData, RestNodeData } from '../composables/useAdventureRun';
import { pickIntroNarrative, pickTransitionNarrative } from '../constants/adventureNarrative';
import { backSpriteUrl, walkFrameUrl } from '../utils/spriteDisplay';
import { getFacilityBackgroundUrl } from '../utils/facilityBackground';
import { getEnemyAvatarTier, getEnemyPortraitUrl } from '../utils/enemyAvatar';
import { useCombat } from '../composables/useCombat';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '冒險',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 冒險進行畫面' }],
});

const TIER_LABEL: Record<NodeType, string> = {
    [NodeType.COMBAT]: '普通',
    [NodeType.ELITE]: '菁英',
    [NodeType.STRONG_ELITE]: '強敵',
    [NodeType.BOSS]: '頭目',
    [NodeType.EVENT]: '',
    [NodeType.REST]: '',
    [NodeType.CHOICE]: '',
};

const TIER_COLOR: Record<NodeType, string> = {
    [NodeType.COMBAT]: 'rgb(var(--v-theme-primary))',
    [NodeType.ELITE]: 'rgb(var(--v-theme-green))',
    [NodeType.STRONG_ELITE]: '#c084fc',
    [NodeType.BOSS]: 'rgb(var(--v-theme-warning))',
    [NodeType.EVENT]: 'rgb(var(--v-theme-primary))',
    [NodeType.REST]: 'rgb(var(--v-theme-primary))',
    [NodeType.CHOICE]: 'rgb(var(--v-theme-primary))',
};

const {
    character, loading: characterLoading, fetchCharacter,
} = useCharacter();
const {
    currentRun, loading: runLoading, error: runError, checked, fetchCurrent, advance, useHealingItem,
    startCombat, lastCombatResult, resolveEvent, selectBlessing, lastEventResult,
    lastSettlement, clearSettlement, runLog, abandon, commitCombatLog, commitPendingSettlement,
} = useAdventureRun();

// A true browser reload (or a direct/bookmarked navigation) re-initializes
// this module's singleton state, so `checked` is still false the moment this
// page's setup runs. SPA navigation from /main (via the "繼續冒險" CTA)
// already resolved fetchCurrent there, so `checked` is true by the time we
// get here. This lets us tell "landed cold on /adventure" apart from a
// normal resume — the former must immediately fail the run rather than
// silently continuing it (known-issue.md #8).
const enteredAdventureCold = !checked.value;

const showLogDialog = ref(false);
const walkFrame = useWalkFrame();
const characterSpriteSrc = computed(() => {
    if (!character.value) return '';
    const back = backSpriteUrl(character.value.spriteUrl);
    return walkFrameUrl(back, walkFrame.isWalking.value ? walkFrame.step.value : 0);
});

// 戰鬥演出狀態集中在這裡（而非 GameCombatResultPanel 內部）：探索與戰鬥共用同一個
// 「角色 stage」，玩家的 HP/行動條/spark/傷害飄字需要疊加在同一個持久化角色圖像
// 上，不能只存在戰鬥子元件裡。getResult 在沒有進行中戰鬥時回傳 null，useCombat
// 內部對此已有保護（見 useCombat.ts）。
// 進入這場戰鬥當下的實際 HP（見 handleStartCombat）：playerStatus 的動畫起始值
// 要用這個快照，而不是每次都跟著 currentRun.playerHp 變動——resolveCombat 一
// 回應，currentRun.playerHp 就已經是戰鬥「結束後」的數字，若動畫起點直接引用
// currentRun.playerHp 會被這個結束值污染。
const combatStartHp = ref(0);
const {
    displayedBanner,
    enemyCards,
    playerAlive,
    playerStatus,
    playerGauge,
    playerCardFx,
    playerSpark,
    playerDamageText,
    playbackDone: combatAnimPlaybackDone,
} = useCombat(
    () => lastCombatResult.value,
    () => currentRun.value?.playerHpMax ?? 0,
    () => combatStartHp.value,
);
const inCombatStage = computed(() => !!lastCombatResult.value);

// 本次戰鬥/事件中剛取得的祝福或詛咒，非 null 時以 dialog 呈現內容（見
// handleResolveEvent/handleSelectBlessing）；關閉 dialog 後歸零，不做持久顯示，
// HP panel 不再重覆列出詳情，僅頂端 summary 列的祝福計數保留為持久狀態。
const acquiredModifierDialog = ref<RunModifier | null>(null);
// handleResolveEvent/handleSelectBlessing 呼叫 API 到真的設定好 acquiredModifierDialog
// 之間隔了好幾個 await，這段時間 currentRun 可能已經先變成 RESOLUTION，讓下面的
// auto-advance watch 有機會搶先觸發、在祝福/詛咒 dialog 顯示前就先播走路動畫
// （見該兩個 handler 內的用法）。
const pendingModifierAck = ref(false);
// 轉盤事件結果需要玩家看過、手動點擊「關閉」才能繼續走路——跟一般事件（結果
// 顯示完就自動 advance）不同，轉盤是個「開獎」時刻，不能被自動前進蓋過去
// （見使用者回報）。true 代表結果已經出現、還沒被玩家關掉，同樣要擋下面的
// auto-advance watch（見 handleResolveEvent 內的用法）。
const wheelResultPending = ref(false);
// 取得祝福/詛咒當下疊在角色 sprite 上的光暈特效來源，跟 acquiredModifierDialog
// 共用同一個值——dialog 一出現，光暈就套用在角色身上，從小到大再淡出消失（見
// __stage-glow 的 keyframes）。
const modifierGlowSrc = computed(() => {
    if (!acquiredModifierDialog.value) return '';
    return acquiredModifierDialog.value.isBlessing
        ? '/images/combat-fx/blessing-glow.png'
        : '/images/combat-fx/curse-glow.png';
});
const {
    items: permanentItems, fetchInventory, loaded: inventoryLoaded, invalidate: invalidateInventory,
} = useInventory();

const stageDisplayName = computed(() => {
    if (!currentRun.value) return '';
    return getStageDisplayName(currentRun.value.chapterIndex);
});

// 設施背景底圖：依 run 固定不變的 severityTier 決定，疊一層暗色漸層確保前景
// 卡片文字可讀性。沒有進行中的 run（loading/角色列表等畫面）時不套用。
const pageBackgroundStyle = computed(() => {
    if (!currentRun.value) return {};
    const url = getFacilityBackgroundUrl(currentRun.value.severityTier);
    return {
        backgroundImage: `linear-gradient(rgba(10, 11, 14, 0.55), rgba(10, 11, 14, 0.8)), url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
    };
});

// 開頭畫面的敘述：純前端風味文字，依章節主題挑選，同一關卡（chapterIndex +
// currentLevelIndex 不變）內維持穩定，不會每次重新渲染就換一句。
const introNarrative = computed(() => {
    if (!currentRun.value || !character.value) return '';
    const seed = currentRun.value.chapterIndex * 31 + character.value.currentLevelIndex;
    return pickIntroNarrative(stageDisplayName.value, seed);
});

// 設施風險分級/敵對陣營提示文案（enemy-factions-and-severity design.md 決策
// 8）：純顯示，讓玩家在進入關卡前對本趟遠征的危險程度/敵人類型有心理預期。
// ASSUMPTION：文案內容未在其他地方定案，可事後調整。
const SEVERITY_HINT_TEXT: Record<FacilitySeverity, string> = {
    DEEP_WRECK: '設施幾乎完全荒廢，機能停擺已久',
    PARTIAL_ACTIVE: '設施部分機能仍在運作，需保持警戒',
    HIGHLY_ACTIVE: '⚠️ 警戒森嚴：設施機能高度運作中',
};
const FACTION_HINT_TEXT: Record<EnemyFaction, string> = {
    GKBOT: '，偵測到殘存 GkBot 活動跡象',
    HUMAN: '，偵測到武裝人類／合成人勢力',
};
const SEVERITY_HINT_COLOR: Record<FacilitySeverity, string> = {
    DEEP_WRECK: 'rgb(var(--v-theme-primary))',
    PARTIAL_ACTIVE: 'rgb(var(--v-theme-primary))',
    HIGHLY_ACTIVE: 'rgb(var(--v-theme-warning))',
};
const severityFactionHint = computed(() => {
    if (!currentRun.value) return null;
    const { severityTier, factionType } = currentRun.value;
    if (!severityTier || !factionType) return null;
    return {
        text: `${SEVERITY_HINT_TEXT[severityTier]}${FACTION_HINT_TEXT[factionType]}`,
        color: SEVERITY_HINT_COLOR[severityTier],
    };
});

// 過場敘述：以目前節點在本次 run 內的位置為種子，讓每次推進看到的文字都不同。
const transitionNarrative = computed(() => {
    if (!currentRun.value) return '';
    return pickTransitionNarrative(stageDisplayName.value, currentRun.value.stageNodeIndex);
});

// 頂部 panel 顯示 "{章節} - {關卡} {currentStage/totalStage}"，例如
// "廢棄維修廠 - 3 3/16"：章節主題名 + 該章節第幾關（1-based） + 該關卡內的
// 節點進度。
const stageHeaderLabel = computed(() => {
    if (!currentRun.value || !character.value) return '';
    const levelNumber = character.value.currentLevelIndex + 1;
    const nodeProgress = `${currentRun.value.stageNodeIndex + 1}/${currentRun.value.stageNodeCount}`;
    return `${stageDisplayName.value} ${levelNumber} - ${nodeProgress}`;
});

const STAT_LABEL: Partial<Record<keyof Stats, string>> = {
    ATK: '攻擊力',
    DEF: '防禦力',
    HP_MAX: '生命上限',
    actionIntervalSec: '攻擊間隔',
};

const MODIFIER_TEMPLATES = [...BLESSING_TEMPLATES, ...CURSE_TEMPLATES];

// 本次冒險已獲得的祝福/詛咒清單（原始 modifierId 對應回模板取名稱與正負屬性），
// 供下方狀態 panel 逐一列成小 chip。
const acquiredModifiers = computed(() => {
    if (!currentRun.value) return [];
    const modifierIds = [...currentRun.value.blessings, ...currentRun.value.curses];
    return modifierIds
        .map(modifierId => MODIFIER_TEMPLATES.find(t => t.modifierId === modifierId))
        .filter(t => t !== undefined);
});

// 祝福/詛咒對生命上限的總加成，顯示在 HP 上限旁邊，例如 "171(+40)"。
const hpMaxBonus = computed(() => acquiredModifiers.value.reduce(
    (sum, modifier) => sum + (modifier.statModifiers?.HP_MAX ?? 0), 0,
));

// 單一祝福/詛咒 chip 下方的效果文字，例如 "防禦力 +6" 或 "掉落率 x1.30"。
const describeModifierEffect = (modifier: (typeof MODIFIER_TEMPLATES)[number]) => {
    const parts = Object.entries(modifier.statModifiers ?? {}).map(([key, value]) => {
        const label = STAT_LABEL[key as keyof Stats] ?? key;
        return `${label} ${value! > 0 ? '+' : ''}${value}`;
    });
    if (modifier.dropRateMultiplier) parts.push(`掉落率 x${modifier.dropRateMultiplier.toFixed(2)}`);
    return parts.join('、');
};

// BOSS 節點的隨行小兵與頭目共用同一個節點 tier（BOSS），標籤需依 enemy.isBoss
// 逐一判斷，其餘 tier（普通/菁英/強敵）維持整節點統一標籤。
const enemyTierLabel = (tier: NodeType, isBoss: boolean) => (
    tier === NodeType.BOSS ? (isBoss ? '頭目' : '小兵') : TIER_LABEL[tier]
);

const enemyTierColor = (tier: NodeType, isBoss: boolean) => (
    tier === NodeType.BOSS && !isBoss ? 'rgb(var(--v-theme-primary))' : TIER_COLOR[tier]
);

// 戰前遭遇預覽的頭像：與 combatResultPanel 同一套 archetype 專屬圖優先、
// faction+tier fallback 規則（enemy-portrait-resolution）。
const enemyPreviewAvatarSrc = (tier: NodeType, isBoss: boolean, archetypeSlug?: string) => (
    getEnemyPortraitUrl(archetypeSlug, currentRun.value?.factionType ?? 'GKBOT', getEnemyAvatarTier(isBoss, tier))
);

const combatNodeData = computed(() => (
    currentRun.value?.state === AdventureStateType.COMBAT
        ? currentRun.value.currentNodeData as CombatNodeData
        : null
));

const settlementIsSuccess = computed(() => lastSettlement.value?.endReason === 'COMPLETED');

// GameCombatResultPanel 現在是純渲染元件（不再自己呼叫 useCombat），結算文字用
// 的欄位從 lastCombatResult.summary 直接取出當 props 傳下去。
const combatVictory = computed(() => lastCombatResult.value?.summary.victory ?? false);
const combatRoundCount = computed(() => lastCombatResult.value?.summary.roundCount ?? 0);
const combatExpGained = computed(() => lastCombatResult.value?.summary.expGained ?? 0);
const combatGoldDropped = computed(() => lastCombatResult.value?.summary.goldDropped ?? 0);
const combatGemsDropped = computed(() => lastCombatResult.value?.summary.gemsDropped ?? 0);
const combatDroppedItemNames = computed(() => (
    lastCombatResult.value?.summary.itemsDropped.map(item => describeItem(item).name) ?? []
));

// 戰鬥結果的 log 演繹（stage 上的 playerGauge/playerSpark 等）播完前，不能顯示
// 「繼續前進」，避免玩家在還沒看完戰鬥過程時就跳過結算。lastCombatResult 換成
// 新的一場戰鬥時重新歸零，等 useCombat 的 playbackDone 再次變 true 才放行；播完的
// 同一刻也跳出戰鬥結算 dialog（見 GameCombatSummaryDialog）。
const combatPlaybackDone = ref(false);
const showCombatSummaryDialog = ref(false);
// 保險起見，dialog 實際開關再疊一層 lastCombatResult 存在與否的判斷——
// showCombatSummaryDialog 只代表「玩家還沒關掉」，避免結果被清空（換下一個
// 節點）但這個旗標還沒同步回 false 的極短暫視窗裡，顯示出資料全是預設值
// （戰鬥失敗／回合0）的殘影 dialog。
const combatSummaryDialogOpen = computed(() => showCombatSummaryDialog.value && !!lastCombatResult.value);
watch(lastCombatResult, () => {
    combatPlaybackDone.value = false;
    showCombatSummaryDialog.value = false;
});
watch(combatAnimPlaybackDone, (done) => {
    if (!done) return;
    combatPlaybackDone.value = true;
    showCombatSummaryDialog.value = true;
    commitCombatLog();
});

// 戰敗時 startCombat 已經把結算存進 pendingSettlement（見 useAdventureRun），
// 但要等玩家親手關掉戰鬥結算 dialog 才能真的套用（設成 lastSettlement）—
// 否則畫面會在 dialog 還開著時就先切到「冒險失敗」結算頁，兩者疊在一起
// （known-issue.md #issue，戰鬥失敗需關閉 dialog 後才進入冒險失敗畫面）。
watch(showCombatSummaryDialog, async (open, wasOpen) => {
    if (wasOpen && !open) {
        await commitPendingSettlement();
    }
});
const combatPlaybackPending = computed(() => (
    currentRun.value?.state === AdventureStateType.RESOLUTION
    && !!lastCombatResult.value
    && !combatPlaybackDone.value
));

// RESOLUTION（戰鬥/事件/祝福/休息都已解決，純粹要走到下一節點）與 EXPLORING
// （單純推進到下一個節點，尚未遇到需要玩家選擇的內容）都不需要玩家自己點擊，
// 直接演繹走路動畫並自動推進；有戰鬥結算 dialog 要看的話，等玩家關掉 dialog
// 才觸發（不能搶在玩家讀完結算前就跳走）。取得祝福/詛咒的 acquiredModifierDialog
// 同理：dialog 還開著時不能先播走路動畫（known-issue.md #3）。轉盤事件結果
// （wheelResultPending）也是同一套邏輯：開獎結果要等玩家自己點「關閉」才能
// 繼續走路，不能被自動 advance 蓋過去（見使用者回報）。INIT「開始探索」、
// REST「結束休息」仍維持手動點擊，因為這兩個是玩家主動決定「現在要做這件事」的
// 時機點。
watch(() => (
    (currentRun.value?.state === AdventureStateType.RESOLUTION
        || currentRun.value?.state === AdventureStateType.EXPLORING)
    && !combatPlaybackPending.value
    && !combatSummaryDialogOpen.value
    && !acquiredModifierDialog.value
    && !wheelResultPending.value
    && !pendingModifierAck.value
    && !runLoading.value
), (ready) => {
    if (ready) handleAdvance();
});

// Stage 上的 HP 顯示：有進行中的戰鬥演出時，直接沿用 useCombat 的 playerStatus
// （已經是逐格套用 combatLog 算出的即時 HP，本身就是動畫來源，不需要再另外凍結
// 一份「戰鬥開始前」快照）；沒有戰鬥時退回 currentRun 的伺服器端真值。
const stageHp = computed(() => {
    if (lastCombatResult.value) {
        return {
            current: playerStatus.value.hpCurrent,
            max: playerStatus.value.hpMax,
            percent: playerStatus.value.hpPercent,
        };
    }
    const current = currentRun.value?.playerHp ?? 0;
    const max = currentRun.value?.playerHpMax ?? 0;
    return {
        current,
        max,
        percent: max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0,
    };
});

// 結算頁的 EXP 進度條動畫：掛載後才把目標值設進去，讓 v-progress-linear 內建的
// model-value 變化動畫播放一次「從 0 長到目前進度」的效果。
const expDisplayPercent = ref(0);

const settlementExpTargetPercent = computed(() => {
    if (!character.value) return 0;
    const threshold = EXP_TABLE[character.value.level];
    if (!threshold) return 100; // 已滿等
    return Math.min(100, (character.value.exp / threshold) * 100);
});

watch(lastSettlement, async (settlement) => {
    if (!settlement) return;
    expDisplayPercent.value = 0;
    if (settlement.expGained <= 0) return;
    await fetchCharacter();
    await nextTick();
    setTimeout(() => {
        expDisplayPercent.value = settlementExpTargetPercent.value;
    }, 100);
});

const stateLabel = computed(() => {
    switch (currentRun.value?.state) {
        case AdventureStateType.INIT: return '準備中';
        case AdventureStateType.EXPLORING: return '探索中';
        case AdventureStateType.COMBAT: return '戰鬥中';
        case AdventureStateType.EVENT: return '事件';
        case AdventureStateType.REST: return '休息中';
        case AdventureStateType.RESOLUTION: return '結算中';
        case AdventureStateType.BLESSING_SELECT: return '選擇祝福';
        default: return '';
    }
});

const canAdvanceGenerically = computed(() => {
    const state = currentRun.value?.state;
    return state !== undefined
        && state !== AdventureStateType.COMBAT
        && state !== AdventureStateType.EVENT
        && state !== AdventureStateType.BLESSING_SELECT;
});

const eventNodeData = computed(() => (
    currentRun.value?.state === AdventureStateType.EVENT
        ? currentRun.value.currentNodeData as EventNodeData
        : null
));

const restNodeData = computed(() => (
    currentRun.value?.state === AdventureStateType.REST
        ? currentRun.value.currentNodeData as RestNodeData
        : null
));

const blessingCandidates = computed(() => (
    currentRun.value?.state === AdventureStateType.BLESSING_SELECT
        ? (currentRun.value.currentNodeData as BlessingNodeData)?.candidates ?? []
        : []
));

// 祝福選擇 dialog 要顯示效果數值（例如「防禦力 +6」），用 modifierId 查回完整
// 模板（含 statModifiers）算出效果文字，沿用既有 describeModifierEffect。
const blessingCandidatesWithEffect = computed(() => blessingCandidates.value.map((candidate) => {
    const template = MODIFIER_TEMPLATES.find(t => t.modifierId === candidate.modifierId);
    return {
        ...candidate,
        effectText: template ? describeModifierEffect(template) : '',
    };
}));

const advanceLabel = computed(() => {
    switch (currentRun.value?.state) {
        case AdventureStateType.INIT: return '開始探索';
        case AdventureStateType.REST: return '結束休息';
        case AdventureStateType.RESOLUTION: return '繼續前進';
        default: return '推進';
    }
});

// Potions usable at a Rest node: this run's own drops + the permanent inventory's potions
const restPotions = computed<(ItemLike & { itemId: string })[]>(() => {
    if (!currentRun.value) return [];
    const runPotions = currentRun.value.runInventory.filter(item => item.type === 'POTION');
    const permanentPotions = permanentItems.value.filter(item => item.type === 'POTION');
    return [...runPotions, ...permanentPotions] as (ItemLike & { itemId: string })[];
});

// 走路動畫是純視覺演出，跟 advance() 的 API 回應各自獨立（見
// adventure-run-presentation spec）：點擊當下立刻開始播放固定長度的走路節拍，
// 不等待、也不阻塞 API 回應；API 提早回應時畫面一樣正常切換到新節點狀態。
const WALK_BEAT_MS = 1500;
const handleAdvance = async () => {
    if (!character.value) return;
    walkFrame.start();
    setTimeout(walkFrame.stop, WALK_BEAT_MS);
    await advance(character.value.characterId);
};

// 開頭畫面的「進入關卡」：跟一般的 handleAdvance 不同，這裡要先把走路動畫完整
// 播完，畫面才切換到「冒險進行中」顯示第一個節點的內容（見 enteringRun 那個
// v-else-if 分支）——用 Promise.all 讓動畫節拍與 advance() API 併行，兩者都
// 完成才收尾，而不是像其他 handleAdvance 呼叫點那樣讓動畫與畫面更新各自獨立。
const enteringRun = ref(false);
const handleStartExploring = async () => {
    if (!character.value) return;
    enteringRun.value = true;
    walkFrame.start();
    await Promise.all([
        new Promise(resolve => setTimeout(resolve, WALK_BEAT_MS)),
        advance(character.value.characterId),
    ]);
    walkFrame.stop();
    enteringRun.value = false;
};

// 開頭畫面的「撤退」：這趟遠征還沒真正開始就放棄，比照既有放棄機制結算
// （DISCONNECT）。結算完 currentRun 會變成 null、lastSettlement 會被設定，
// 畫面自然切到既有的結算頁，由玩家自己按「回到營地」。
const handleRetreat = async () => {
    if (!character.value) return;
    await abandon(character.value.characterId);
};

const handleStartCombat = async () => {
    if (!character.value) return;
    combatStartHp.value = currentRun.value?.playerHp ?? 0;
    await startCombat(character.value.characterId);
};

const handleHeal = async (itemId: string) => {
    if (!character.value) return;
    await useHealingItem(character.value.characterId, itemId);
    if (!inventoryLoaded.value) return;
    await fetchInventory();
};

const handleResolveEvent = async (choiceIndex?: number) => {
    if (!character.value) return;
    // resolveEvent() 內部的 fetchCurrent 會先把 currentRun 更新成 RESOLUTION，
    // 這個 reactive 變化跟下面才要設定的 acquiredModifierDialog 中間隔了好幾個
    // await/microtask，auto-advance watch 有機會搶先在 acquiredModifierDialog
    // 設定好之前就先跑起來、播走路動畫。pendingModifierAck 在呼叫 API 前就同步
    // 設成 true 堵住這個時間差，等 dialog 內容真的設定好才清掉（見下方 watch）。
    pendingModifierAck.value = true;
    await resolveEvent(character.value.characterId, choiceIndex);
    const grantedModifierId = lastEventResult.value?.blessingGranted ?? lastEventResult.value?.curseApplied;
    if (grantedModifierId) {
        acquiredModifierDialog.value = MODIFIER_TEMPLATES.find(t => t.modifierId === grantedModifierId) ?? null;
    } else if (lastEventResult.value?.eventType === EventType.WHEEL) {
        wheelResultPending.value = true;
    }
    pendingModifierAck.value = false;
};

const handleSelectBlessing = async (blessingId: string) => {
    if (!character.value) return;
    pendingModifierAck.value = true;
    const success = await selectBlessing(character.value.characterId, blessingId);
    if (success) {
        acquiredModifierDialog.value = MODIFIER_TEMPLATES.find(t => t.modifierId === blessingId) ?? null;
    }
    pendingModifierAck.value = false;
};

const handleReturnHome = () => {
    // Settlement may have just moved run-inventory items into the permanent
    // inventory — invalidate the cached backpack so the inventory page
    // refetches instead of showing the pre-run snapshot (known-issue.md #4).
    invalidateInventory();
    clearSettlement();
    navigateTo('/main');
};

watch(character, async (value) => {
    if (!value) return;
    await fetchCurrent(value.characterId);
    if (enteredAdventureCold && currentRun.value) {
        await abandon(value.characterId);
    }
}, { immediate: true });

onMounted(() => {
    if (!character.value) fetchCharacter();
    if (!inventoryLoaded.value) fetchInventory();
});
</script>

<style scoped lang="scss">
.adventure-page {
    width: 100%;
    overflow-y: auto;

    // 點擊推進時，背景底圖跟著輕微位移，呈現「正在往前移動」的錯覺，跟角色
    // 走路動畫（characterSpriteSrc）同一個 WALK_BEAT_MS 節拍。CSS animation
    // 對 background-position 的效果會蓋過 inline style 算出的固定值，動畫
    // 播完後自動還原成 pageBackgroundStyle 原本的置中位置。
    &--walking {
        animation: adventure-page-bg-drift 1.5s ease-in-out;
    }

    &__scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
    }

    &__actions {
        flex: 0 0 auto;
    }

    // GameCombatSummaryBanner／GameModifierAcquiredBanner 疊在內容上的定位錨點
    // （banner 本身 position: absolute; inset: 0）。
    &__banner-anchor {
        position: relative;
    }

    &__box {
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;

        &--center {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 80px;
        }

        &--forfeited {
            border-color: rgba(255, 82, 82, 0.4);
        }
    }

    // 角色 stage：探索與戰鬥共用的持久化大角色顯示區，固定在畫面下方、敵方
    // arena 之下（見 known-issue.md 冒險 UI 改版 + 使用者後續調整）。HP 條疊在
    // 角色圖像上，取代原本的獨立 HP 區塊；戰鬥中額外疊加行動條/spark/傷害飄字，
    // 動畫/樣式沿用 combatResultPanel.vue 同一套手刻 keyframes 慣例。
    // flex: 0 0 auto（而非 1 1 auto）讓 stage 高度只取決於自身內容，緊貼在
    // __actions 正上方；上面的 __scroll 是唯一會撐開的區塊，藉此讓角色 sprite
    // 不論 scroll 內容多寡都固定在同一個畫面位置（見進場走路動畫的版面比照）。
    &__stage {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 4px 0 12px;
    }

    // fx-anchor：spark／傷害飄字獨立掛在這一層（跟 sprite-wrap 是兄弟節點，不是
    // 子節點），避免 sprite-wrap 因為自己的 :key（cardFx 出手/閃避動畫）重新掛載時
    // 把還在播放中的 spark／飄字一併拆掉重建，導致同一個效果在原本的動畫還沒播完
    // 時被重新掛載、看起來像是重播了一次（見使用者回報：首次受擊 effect 跳兩/三次）。
    &__stage-fx-anchor {
        position: relative;
        width: 120px;
        aspect-ratio: 1;
    }

    &__stage-sprite-wrap {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;

        &--attack {
            animation: adventure-page-stage-lunge 0.3s ease-out;
        }

        &--dodge {
            animation: adventure-page-stage-dodge 0.38s ease-out;
        }
    }

    &__stage-sprite {
        width: 100%;
        height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
        transition: opacity 0.2s ease;

        &--dead {
            opacity: 0.4;
        }
    }

    // 取得祝福/詛咒時疊在角色身後的光暈：z-index 刻意低於 sprite-wrap（見上方
    // z-index: 1），讓光暈只在角色剪影周圍露出、被角色不透明的身體部位擋住，讀起來
    // 像是「光暈罩在角色身上」而不是蓋在角色前面的貼圖。從小到大再淡出消失，一次性
    // 播放，:key 用 modifierId 讓每次取得新的祝福/詛咒都能重新播放。
    &__stage-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        z-index: 0;
        width: 150%;
        height: 150%;
        transform: translate(-50%, -50%) scale(0.2);
        image-rendering: pixelated;
        pointer-events: none;
        opacity: 0;
        animation: adventure-page-stage-glow-pulse 1.6s ease-out forwards;
    }

    // z-index 明確蓋過 sprite-wrap（見上方 z-index: 1），確保角色被攻擊時受擊
    // 特效疊在角色圖像「前面」而不是被身體擋住（見使用者回報：加入光暈後受擊
    // slash 特效被角色本身蓋住看不到）。
    &__stage-spark {
        position: absolute;
        top: 45%;
        left: 50%;
        z-index: 2;
        width: 96px;
        height: 96px;
        transform: translate(-50%, -50%) scale(0.3);
        image-rendering: pixelated;
        pointer-events: none;
        animation: adventure-page-stage-spark-pop 0.45s ease-out forwards;

        &--crit {
            width: 130px;
            height: 130px;
            filter: drop-shadow(0 0 6px rgba(255, 140, 0, 0.7));
        }
    }

    &__stage-damage-text {
        position: absolute;
        z-index: 2;
        top: 10%;
        left: 50%;
        transform: translate(-50%, 0);
        font-weight: 700;
        font-size: 20px;
        color: #fff;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        pointer-events: none;
        white-space: nowrap;
        animation: adventure-page-stage-damage-text-float 0.7s ease-out forwards;

        &--crit {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 1px;
            font-size: 28px;
            color: rgb(var(--v-theme-warning));
        }

        &--dodge {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.8);
        }
    }

    &__stage-damage-text-crit-label {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.05em;
    }

    &__stage-hp {
        width: 100%;
        max-width: 220px;
    }

    &__stage-hp-bar {
        margin-top: 4px;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.12);
        overflow: hidden;
    }

    &__stage-hp-bar-fill {
        height: 100%;
        background: rgb(var(--v-theme-warning));
        transition: width 0.3s ease;
    }

    // 攻速充能條，樣式比照 combatResultPanel.vue 的 &__gauge（電池格底紋 +
    // JS 逐幀算好寬度寫入，見 useCombat 的 gaugeAt）。
    &__stage-gauge {
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

    &__stage-gauge-fill {
        height: 100%;
        background-color: #fff;
        transition: width 0.1s linear;

        &--paused {
            background-color: rgba(255, 255, 255, 0.4);
        }
    }

    &__loot-stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__loot-value {
        font-size: 13px;
        font-weight: 700;
    }

    &__potion-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 0;

        &:not(:last-child) {
            border-bottom: 1px solid rgba(196, 203, 219, 0.1);
        }
    }

    &__enemy-row {
        padding: 6px 0;

        &:not(:last-child) {
            border-bottom: 1px solid rgba(196, 203, 219, 0.1);
        }
    }

    &__enemy-tier {
        margin-right: 4px;
    }

    // 戰前遭遇預覽的敵人頭像：與 combatResultPanel__avatar 同一套像素圖來源
    // (enemy-portrait-resolution)，這裡固定成小方塊搭配文字列表。
    &__enemy-preview-avatar {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        image-rendering: pixelated;
    }

    &__settlement {
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
    }

    &__intro-actions {
        width: 100%;
        max-width: 280px;
    }

    &__levelup {
        animation: settlement-levelup-pop 0.4s ease-out;
    }

    &__item-chip {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        font-size: 11px;
        border: 1px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: rgba(196, 203, 219, 0.04);

        &--forfeited {
            opacity: 0.5;
            text-decoration: line-through;
            border-color: rgba(255, 82, 82, 0.4);
        }
    }


    &__item-chip-rarity {
        position: absolute;
        top: -6px;
        left: -6px;
        padding: 0 2px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        border-radius: 2px;
        white-space: nowrap;
    }
}

@keyframes settlement-levelup-pop {
    0% {
        transform: scale(0.6);
        opacity: 0;
    }
    60% {
        transform: scale(1.1);
        opacity: 1;
    }
    100% {
        transform: scale(1);
    }
}

@keyframes adventure-page-bg-drift {
    0% {
        background-position: center top;
    }
    50% {
        background-position: 54% top;
    }
    100% {
        background-position: center top;
    }
}

// 出手：角色向敵方（畫面上方）撲出去再彈回來，跟 combatResultPanel.vue 的
// &__unit-inner--attack 是同一套演出語言，只是這裡永遠是「往上」（--fx-dir
// 寫死，stage 上只有玩家自己，不需要像 combatResultPanel 那樣依 row 切換方向）。
@keyframes adventure-page-stage-lunge {
    0% {
        transform: translateY(0);
    }
    45% {
        transform: translateY(-10px);
    }
    100% {
        transform: translateY(0);
    }
}

@keyframes adventure-page-stage-dodge {
    0% {
        transform: translateX(0);
    }
    30% {
        transform: translateX(14px);
    }
    65% {
        transform: translateX(-5px);
    }
    100% {
        transform: translateX(0);
    }
}

@keyframes adventure-page-stage-glow-pulse {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.2);
    }
    35% {
        opacity: 0.9;
        transform: translate(-50%, -50%) scale(1.15);
    }
    60% {
        opacity: 0.85;
        transform: translate(-50%, -50%) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1.05);
    }
}

@keyframes adventure-page-stage-spark-pop {
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

@keyframes adventure-page-stage-damage-text-float {
    0% {
        opacity: 0;
        transform: translate(-50%, 0);
    }
    20% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -28px);
    }
}
</style>
