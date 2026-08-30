<template>
    <div class="fill-height adventure-page pa-3">
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
                返回首頁
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

        <!-- 冒險進行中 -->
        <template v-else>
            <div class="adventure-page__box mb-3">
                <div class="d-flex align-center justify-space-between mb-2">
                    <span class="font-pixel text-subtitle-1" style="color: rgb(var(--v-theme-green));">
                        {{ stageDisplayName }}
                    </span>
                    <span class="text-caption text-medium-emphasis">{{ stateLabel }}</span>
                </div>

                <div class="text-caption text-medium-emphasis mb-2">
                    {{ currentRun.stageNodeIndex + 1 }} / {{ currentRun.stageNodeCount }}
                </div>

                <div class="adventure-page__bar mb-2">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">HP</span>
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                            {{ currentRun.playerHp }} / {{ currentRun.playerHpMax }}
                        </span>
                    </div>
                    <v-progress-linear
                        :model-value="hpPercent"
                        color="green"
                        bg-color="dark"
                        height="6"
                        rounded
                    />
                </div>

                <div class="d-flex ga-4 text-caption text-medium-emphasis">
                    <span>EXP {{ currentRun.expEarned }}</span>
                    <span>金幣 +{{ currentRun.goldEarned }}</span>
                    <span>寶石 +{{ currentRun.gemsEarned }}</span>
                </div>
            </div>

            <!-- COMBAT：觸發戰鬥；戰鬥結果在 COMBAT/RESOLUTION 都顯示，直到玩家繼續前進 -->
            <div
                v-if="currentRun.state === AdventureStateType.COMBAT || (currentRun.state === AdventureStateType.RESOLUTION && lastCombatResult)"
                class="adventure-page__box mb-3"
            >
                <template v-if="lastCombatResult">
                    <div
                        class="font-pixel text-subtitle-2 mb-2"
                        :style="{ color: lastCombatResult.summary.victory ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
                    >
                        {{ lastCombatResult.summary.victory ? '戰鬥勝利' : '戰鬥失敗' }}
                    </div>
                    <GameCombatResultPanel :result="lastCombatResult" />
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
                                        :style="{ color: TIER_COLOR[combatNodeData.tier] }"
                                    >
                                        {{ TIER_LABEL[combatNodeData.tier] }}
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

            <div
                v-if="runError"
                class="text-body-2 mb-3"
                style="color: rgb(var(--v-theme-warning));"
            >
                {{ runError }}
            </div>

            <div class="d-flex flex-column ga-2">
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
                    v-else-if="canAdvanceGenerically"
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
    </div>
</template>

<script setup lang="ts">
import { AdventureStateType, NodeType, getStageDisplayName } from '../../shared/types/adventure';
import { EXP_TABLE } from '../../shared/types/character';
import { describeItem, resolvePixelIcon, RARITY_COLOR, type ItemLike } from '../utils/equipmentDisplay';
import type { EventNodeData, BlessingNodeData, CombatNodeData } from '../composables/useAdventureRun';

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
    lastSettlement, clearSettlement,
} = useAdventureRun();
const {
    items: permanentItems, fetchInventory, loaded: inventoryLoaded,
} = useInventory();

const stageDisplayName = computed(() => {
    if (!currentRun.value) return '';
    return getStageDisplayName(currentRun.value.chapterIndex);
});

const combatNodeData = computed(() => (
    currentRun.value?.state === AdventureStateType.COMBAT
        ? currentRun.value.currentNodeData as CombatNodeData
        : null
));

const settlementIsSuccess = computed(() => lastSettlement.value?.endReason === 'COMPLETED');

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
    await fetchCharacter();
    await nextTick();
    setTimeout(() => {
        expDisplayPercent.value = settlementExpTargetPercent.value;
    }, 100);
});

const hpPercent = computed(() => {
    if (!currentRun.value || currentRun.value.playerHpMax <= 0) return 0;
    return (currentRun.value.playerHp / currentRun.value.playerHpMax) * 100;
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

const handleStartCombat = async () => {
    if (!character.value) return;
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
    clearSettlement();
    navigateTo('/main');
};

watch(character, (value) => {
    if (value) fetchCurrent(value.characterId);
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

    &__bar {
        width: 100%;
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
</style>
