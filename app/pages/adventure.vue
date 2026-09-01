<template>
    <div class="fill-height adventure-page pa-3 d-flex flex-column">
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
                    :loading="runLoading"
                    @click="handleAdvance"
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

        <!-- 冒險進行中 -->
        <template v-else>
            <div class="adventure-page__scroll">
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
                    </div>
                </div>

                <!-- 狀態：目前 HP，以及本次冒險已獲得的祝福/詛咒清單 -->
                <div class="adventure-page__box mb-3">
                    <div class="d-flex align-center justify-space-between mb-2">
                        <span class="text-caption text-medium-emphasis">HP</span>
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-warning));">
                            {{ displayedPlayerHp }} / {{ currentRun.playerHpMax }}<span
                                v-if="hpMaxBonus"
                                class="text-caption"
                                :style="{ color: hpMaxBonus > 0 ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
                            >({{ hpMaxBonus > 0 ? '+' : '' }}{{ hpMaxBonus }})</span>
                        </span>
                    </div>
                    <div
                        v-if="acquiredModifiers.length"
                        class="d-flex flex-wrap ga-2"
                    >
                        <div
                            v-for="modifier in acquiredModifiers"
                            :key="modifier.modifierId"
                            class="adventure-page__modifier-chip"
                            :class="{ 'adventure-page__modifier-chip--curse': !modifier.isBlessing }"
                        >
                            <div class="adventure-page__modifier-chip-label">
                                {{ modifier.isBlessing ? '祝福' : '詛咒' }}
                            </div>
                            <div class="adventure-page__modifier-chip-title">
                                {{ modifier.name }}
                            </div>
                            <div
                                v-if="describeModifierEffect(modifier)"
                                class="adventure-page__modifier-chip-value font-pixel"
                            >
                                {{ describeModifierEffect(modifier) }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- COMBAT：觸發戰鬥；戰鬥結果在 COMBAT/RESOLUTION 都顯示，直到玩家繼續前進 -->
                <div
                    v-if="currentRun.state === AdventureStateType.COMBAT || (currentRun.state === AdventureStateType.RESOLUTION && lastCombatResult)"
                    class="adventure-page__box mb-3"
                >
                    <template v-if="lastCombatResult">
                        <GameCombatResultPanel
                            :result="lastCombatResult"
                            :player-hp-max="currentRun.playerHpMax"
                            @playback-done="handleCombatPlaybackDone"
                        />
                    </template>
                    <template v-else>
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
                                class="adventure-page__enemy-row"
                            >
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
                            <div
                                v-if="combatNodeData.waveCount > 1"
                                class="text-caption text-medium-emphasis text-center mt-1"
                            >
                                偵測到後續增援，數量不明
                            </div>
                        </div>
                    </template>
                </div>

                <!-- EVENT：顯示事件描述；有 choices 顯示選項，沒有則直接可繼續。結果在 EVENT/RESOLUTION 都顯示，直到玩家繼續前進 -->
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
                        <SystemBtn
                            v-else
                            block
                            variant="flat"
                            color="primary"
                            class="text-none"
                            :loading="runLoading"
                            @click="handleResolveEvent()"
                        >
                            繼續
                        </SystemBtn>
                    </template>
                </div>

                <!-- BLESSING_SELECT：3 選 1 -->
                <div
                    v-else-if="currentRun.state === AdventureStateType.BLESSING_SELECT"
                    class="adventure-page__box mb-3"
                >
                    <div class="text-caption text-medium-emphasis mb-2">選擇一個祝福</div>
                    <div
                        v-for="candidate in blessingCandidates"
                        :key="candidate.modifierId"
                        class="adventure-page__potion-row"
                    >
                        <div>
                            <div class="text-body-2">{{ candidate.name }}</div>
                            <div class="text-caption text-medium-emphasis">{{ candidate.description }}</div>
                        </div>
                        <SystemBtn
                            variant="outlined"
                            color="primary"
                            size="small"
                            class="text-none"
                            :loading="runLoading"
                            @click="handleSelectBlessing(candidate.modifierId)"
                        >
                            選擇
                        </SystemBtn>
                    </div>
                </div>

                <!-- REST：可使用藥水 -->
                <div
                    v-else-if="currentRun.state === AdventureStateType.REST"
                    class="adventure-page__box mb-3"
                >
                    <div class="text-caption text-medium-emphasis mb-2">休息中，可使用藥水回復生命值</div>

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

            <div class="adventure-page__actions d-flex flex-column ga-2">
                <SystemBtn
                    v-if="currentRun.state === AdventureStateType.COMBAT && !lastCombatResult"
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
                    v-else-if="canAdvanceGenerically && !combatPlaybackPending"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    :loading="runLoading"
                    @click="handleAdvance"
                >
                    {{ advanceLabel }}
                </SystemBtn>
            </div>
        </template>

        <GameAdventureLogDialog
            v-model="showLogDialog"
            :entries="runLog"
        />
    </div>
</template>

<script setup lang="ts">
import {
    AdventureStateType, NodeType, getStageDisplayName,
    type FacilitySeverity, type EnemyFaction,
} from '../../shared/types/adventure';
import { EXP_TABLE } from '../../shared/types/character';
import { BLESSING_TEMPLATES, CURSE_TEMPLATES } from '../../shared/constants/blessings';
import type { Stats } from '../../shared/types/common';
import { describeItem, resolvePixelIcon, RARITY_COLOR, type ItemLike } from '../utils/equipmentDisplay';
import type { EventNodeData, BlessingNodeData, CombatNodeData } from '../composables/useAdventureRun';
import { pickIntroNarrative, pickTransitionNarrative } from '../constants/adventureNarrative';

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
    lastSettlement, clearSettlement, runLog, abandon, commitCombatLog,
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
const {
    items: permanentItems, fetchInventory, loaded: inventoryLoaded, invalidate: invalidateInventory,
} = useInventory();

const stageDisplayName = computed(() => {
    if (!currentRun.value) return '';
    return getStageDisplayName(currentRun.value.chapterIndex);
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

const combatNodeData = computed(() => (
    currentRun.value?.state === AdventureStateType.COMBAT
        ? currentRun.value.currentNodeData as CombatNodeData
        : null
));

const settlementIsSuccess = computed(() => lastSettlement.value?.endReason === 'COMPLETED');

// 戰鬥結果的 log 演繹（GameCombatResultPanel）播完前，不能顯示「繼續前進」，
// 避免玩家在還沒看完戰鬥過程時就跳過結算。lastCombatResult 換成新的一場戰鬥時
// 重新歸零，等對應的 playback-done 事件再次觸發才放行。
const combatPlaybackDone = ref(false);
watch(lastCombatResult, () => {
    combatPlaybackDone.value = false;
});
const handleCombatPlaybackDone = () => {
    combatPlaybackDone.value = true;
    commitCombatLog();
};
const combatPlaybackPending = computed(() => (
    currentRun.value?.state === AdventureStateType.RESOLUTION
    && !!lastCombatResult.value
    && !combatPlaybackDone.value
));

// startCombat() 的回應會立刻把 currentRun 更新成戰鬥「結束後」的狀態（含
// playerHp），但 GameCombatResultPanel 這時才剛開始逐格演繹戰鬥過程。上方狀態
// panel 若直接綁 currentRun.playerHp 會讓 HP 在演繹開始的當下就瞬間跳到終局
// 數值，所以演繹播放期間先顯示戰鬥開始前記下的 HP，播放完成後才切換成
// currentRun 的最新值。
const preCombatPlayerHp = ref<number | null>(null);
const displayedPlayerHp = computed(() => {
    if (combatPlaybackPending.value && preCombatPlayerHp.value !== null) {
        return preCombatPlayerHp.value;
    }
    return currentRun.value?.playerHp ?? 0;
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

const blessingCandidates = computed(() => (
    currentRun.value?.state === AdventureStateType.BLESSING_SELECT
        ? (currentRun.value.currentNodeData as BlessingNodeData)?.candidates ?? []
        : []
));

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

const handleAdvance = async () => {
    if (!character.value) return;
    await advance(character.value.characterId);
};

// 開頭畫面的「撤退」：這趟遠征還沒真正開始就放棄，比照既有放棄機制結算
// （DISCONNECT）。結算完 currentRun 會變成 null、lastSettlement 會被設定，
// 畫面自然切到既有的結算頁，由玩家自己按「回到營地」。
const handleRetreat = async () => {
    if (!character.value) return;
    await abandon(character.value.characterId);
};

const handleStartCombat = async () => {
    if (!character.value || !currentRun.value) return;
    preCombatPlayerHp.value = currentRun.value.playerHp;
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
    await resolveEvent(character.value.characterId, choiceIndex);
};

const handleSelectBlessing = async (blessingId: string) => {
    if (!character.value) return;
    await selectBlessing(character.value.characterId, blessingId);
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

    &__scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
    }

    &__actions {
        flex: 0 0 auto;
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

    &__modifier-chip {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        min-width: 64px;
        max-width: 100%;
        padding: 4px 8px;
        text-align: center;
        color: rgb(var(--v-theme-green));
        background: rgba(var(--v-theme-green), 0.08);
        border: 1px solid rgba(var(--v-theme-green), 0.4);
        border-radius: 3px;

        &--curse {
            color: rgb(var(--v-theme-warning));
            background: rgba(255, 82, 82, 0.08);
            border-color: rgba(255, 82, 82, 0.4);
        }
    }

    &__modifier-chip-label {
        font-size: 9px;
        opacity: 0.7;
    }

    &__modifier-chip-title {
        font-size: 11px;
        font-weight: 700;
    }

    &__modifier-chip-value {
        margin-top: 2px;
        padding-top: 2px;
        font-size: 10px;
        line-height: 1.3;
        white-space: normal;
        word-break: keep-all;
        border-top: 1px dashed rgba(196, 203, 219, 0.2);
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
</style>
