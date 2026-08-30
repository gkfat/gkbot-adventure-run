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

        <!-- 沒有進行中的冒險 -->
        <div
            v-else-if="!currentRun"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <div
                v-if="lastCombatResult && !lastCombatResult.summary.victory"
                class="adventure-page__box mb-4"
                style="width: 100%;"
            >
                <div class="font-pixel text-subtitle-2 mb-2" style="color: rgb(var(--v-theme-warning));">
                    戰鬥失敗
                </div>
                <GameCombatResultPanel :result="lastCombatResult" />
            </div>
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
                        第 {{ currentRun.step + 1 }} 關
                    </span>
                    <span class="text-caption text-medium-emphasis">{{ stateLabel }}</span>
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
                    <span>分數 {{ currentRun.score }}</span>
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
                <div
                    v-else
                    class="text-body-2 text-medium-emphasis text-center py-2"
                >
                    遭遇敵人，準備戰鬥
                </div>
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
import { AdventureStateType } from '../../shared/types/adventure';
import { describeItem, type ItemLike } from '../utils/equipmentDisplay';
import type { EventNodeData, BlessingNodeData } from '../composables/useAdventureRun';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '冒險',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 冒險進行畫面' }],
});

const {
    character, loading: characterLoading, fetchCharacter,
} = useCharacter();
const {
    currentRun, loading: runLoading, error: runError, checked, fetchCurrent, advance, useHealingItem,
    startCombat, lastCombatResult, resolveEvent, selectBlessing, lastEventResult,
} = useAdventureRun();
const {
    items: permanentItems, fetchInventory, loaded: inventoryLoaded,
} = useInventory();

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
}
</style>
