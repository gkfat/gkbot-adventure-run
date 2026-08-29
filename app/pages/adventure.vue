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

            <!-- COMBAT / EVENT：尚未開放 -->
            <div
                v-if="isPendingNode"
                class="adventure-page__box adventure-page__box--center mb-3"
            >
                <div class="text-body-2 text-medium-emphasis text-center">
                    {{ pendingNodeLabel }}尚未開放，敬請期待
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
                    v-if="!isPendingNode"
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    :loading="runLoading"
                    @click="handleAdvance"
                >
                    {{ advanceLabel }}
                </SystemBtn>

                <SystemBtn
                    v-if="canEnd"
                    block
                    variant="outlined"
                    color="warning"
                    class="text-none"
                    :loading="runLoading"
                    @click="handleEnd"
                >
                    結束冒險
                </SystemBtn>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { AdventureStateType } from '../../shared/types/adventure';
import { describeItem, type ItemLike } from '../utils/equipmentDisplay';

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
    currentRun, loading: runLoading, error: runError, checked, fetchCurrent, advance, end, useHealingItem,
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

const isPendingNode = computed(() => (
    currentRun.value?.state === AdventureStateType.COMBAT
    || currentRun.value?.state === AdventureStateType.EVENT
    || currentRun.value?.state === AdventureStateType.BLESSING_SELECT
));

const pendingNodeLabel = computed(() => {
    if (currentRun.value?.state === AdventureStateType.COMBAT) return '戰鬥';
    if (currentRun.value?.state === AdventureStateType.EVENT) return '事件';
    return '祝福選擇';
});

const advanceLabel = computed(() => {
    switch (currentRun.value?.state) {
        case AdventureStateType.INIT: return '開始探索';
        case AdventureStateType.REST: return '結束休息';
        case AdventureStateType.RESOLUTION: return '繼續前進';
        default: return '推進';
    }
});

const canEnd = computed(() => (
    currentRun.value?.state === AdventureStateType.EXPLORING
    || currentRun.value?.state === AdventureStateType.RESOLUTION
));

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

const handleHeal = async (itemId: string) => {
    if (!character.value) return;
    await useHealingItem(character.value.characterId, itemId);
    if (!inventoryLoaded.value) return;
    await fetchInventory();
};

const handleEnd = async () => {
    if (!character.value) return;
    const result = await end(character.value.characterId);
    if (result) {
        navigateTo('/main');
    }
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
