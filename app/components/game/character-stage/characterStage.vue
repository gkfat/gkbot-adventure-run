<template>
    <div class="character-stage d-flex flex-column align-center fill-height pa-3">
        <!-- 讀取角色資料 -->
        <div
            v-if="loading && !character"
            class="text-center my-auto"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="56"
                :width="5"
                class="mb-4"
            />
            <div class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary)); opacity: 0.8;">
                載入角色中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="error"
            class="text-center px-6 my-auto"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ error }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none"
                prepend-icon="mdi-refresh"
                @click="fetchCharacter"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 角色顯示 -->
        <div
            v-else-if="character"
            class="w-100 d-flex flex-column fill-height character-stage__portrait"
        >
            <div class="w-100 text-center character-stage__content">
                <!-- LV / 職業 + 屬性 + 可分配屬性點：合併為單一精簡區塊，寬度 100% -->
                <GameCharacterStageAttributePanel
                    :attributes="character.attributes"
                    :unspent-attribute-points="character.unspentAttributePoints"
                    :allocating="allocating"
                    :saving-allocation="savingAllocation"
                    :pending-allocation="pendingAllocation"
                    :remaining-points="remainingPoints"
                    :total-pending="totalPending"
                    @start-allocating="startAllocating"
                    @cancel-allocating="cancelAllocating"
                    @save-allocation="saveAllocation"
                    @increment="incrementAttribute"
                    @decrement="decrementAttribute"
                />

                <!-- 戰鬥數值：每格 col-4 -->
                <GameCharacterStageCombatStats
                    :attributes="character.attributes"
                    :stats="character.stats"
                    :equipment-bonus="character.equipmentBonus"
                    :talent-bonus="character.talentBonus"
                    :pending-allocation="pendingAllocation"
                    :total-pending="totalPending"
                />

                <!-- 裝備欄位：角色圖像左右各 3 格 -->
                <div class="character-stage__equip-row mt-2">
                    <GameCharacterStageEquipSlots
                        :slots="EQUIP_SLOTS_LEFT"
                        :equipment="character.equipment"
                        :item-by-id="itemById"
                        @select="openItemDetail"
                    />

                    <div class="character-stage__sprite-col">
                        <div class="character-stage__sprite-header">
                            <div class="d-flex align-center ga-2">
                                <span class="font-pixel text-caption character-stage__lv-tag">
                                    LV {{ character.level }}
                                </span>
                                <v-chip
                                    label
                                    size="x-small"
                                    color="primary"
                                    variant="outlined"
                                    class="font-pixel character-stage__class-chip"
                                >
                                    {{ character.className }}
                                </v-chip>
                            </div>
                            <div class="font-pixel text-caption character-stage__power-tag">
                                戰力 {{ combatPower }}
                            </div>
                            <div class="d-flex align-center ga-1">
                                <span class="text-body-2 text-medium-emphasis">
                                    {{ character.nickname }}
                                </span>
                                <v-icon
                                    icon="mdi-pencil-outline"
                                    size="14"
                                    color="primary"
                                    class="character-stage__rename-btn"
                                    @click="openRenameDialog"
                                />
                            </div>
                        </div>

                        <div class="character-stage__sprite-wrap">
                            <img
                                :src="idleFrameUrl(character.spriteUrl, idleStep)"
                                alt="角色"
                                width="140"
                                height="140"
                                class="character-stage__sprite"
                            >
                        </div>
                    </div>

                    <GameCharacterStageEquipSlots
                        :slots="EQUIP_SLOTS_RIGHT"
                        :equipment="character.equipment"
                        :item-by-id="itemById"
                        @select="openItemDetail"
                    />
                </div>

                <!-- 裝備詳情 dialog -->
                <GameCommonItemDetailDialog ref="itemDetailDialogRef" />

                <!-- 修改暱稱 dialog -->
                <GameCommonRenameCharacterDialog ref="renameCharacterDialogRef" />
            </div>

            <!-- 章節進度／開始冒險：固定於底部 -->
            <GameCharacterStageAdventureCta
                :label="adventureCtaLabel"
                :level-progress="levelProgress"
                :loading="adventureLoading"
                :show-abandon="hasActiveRun && !justStarting"
                :interrupted-run-label="interruptedRunLabel"
                @start="handleAdventureCta"
                @abandon="handleAbandonRun"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { getStageDisplayName } from '../../../../shared/types/adventure';
import { calculateCombatPower } from '../../../../shared/utils/calculateStats';
import { EQUIP_SLOTS_LEFT, EQUIP_SLOTS_RIGHT, type ItemLike } from '../../../utils/equipmentDisplay';
import { idleFrameUrl } from '../../../utils/spriteDisplay';

const {
    character, loading, error, fetchCharacter, allocateAttributes,
} = useCharacter();
const {
    itemById, fetchInventory, loaded: inventoryLoaded,
} = useInventory();
const {
    currentRun, hasActiveRun, loading: adventureLoading, fetchCurrent: fetchCurrentRun, start: startAdventure,
    abandon: abandonAdventure,
} = useAdventureRun();
const idleStep = useIdleFrame();

// 剛按下「開始探索」、run 還沒建立完成時，hasActiveRun／currentRun 會在
// startAdventure() 內部（fetchCurrent）比 navigateTo('/adventure') 完成頁面
// 切換更早一步變成 true，導致按鈕文字與「放棄本次探索」在畫面上閃現一下才
// 跳轉。justStarting 只在這段過渡期間內為 true，讓下面幾個 computed 暫時
// 忽略剛建立的 run，直到離開這個頁面為止。
const justStarting = ref(false);

const adventureCtaLabel = computed(() => {
    if (!justStarting.value && hasActiveRun.value && currentRun.value) return '繼續探索';
    return '開始探索';
});

// 設施主題＋章節內關卡進度：一律讀 character（不論是否有進行中的 run），
// 因為這兩個欄位在整個章節內（含 run 進行期間）都不會變（chapter-level-structure）。
const levelProgress = computed(() => {
    if (!character.value) return null;
    return {
        stageName: getStageDisplayName(character.value.nextChapterIndex),
        levelIndex: character.value.currentLevelIndex + 1,
        levelTotal: character.value.chapterTotalLevels,
    };
});

const handleAdventureCta = async () => {
    if (!character.value) return;

    if (!hasActiveRun.value) {
        justStarting.value = true;
        const started = await startAdventure(character.value.characterId);
        if (!started) {
            justStarting.value = false;
            return;
        }
    }

    navigateTo('/adventure');
};

// 中斷中的冒險：顯示上次斷掉的章節/關卡位置，讓玩家決定要繼續還是放棄。
const interruptedRunLabel = computed(() => {
    if (justStarting.value || !hasActiveRun.value || !currentRun.value) return null;
    const run = currentRun.value;
    return `${getStageDisplayName(run.chapterIndex)}（第 ${run.stageNodeIndex + 1}/${run.stageNodeCount} 節點）`;
});

const handleAbandonRun = async () => {
    if (!character.value) return;
    await abandonAdventure(character.value.characterId);
};

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type ItemDetailDialog = { open: (item: ItemLike) => void };
const itemDetailDialogRef = ref<ItemDetailDialog | null>(null);

const openItemDetail = (item: ItemLike) => {
    itemDetailDialogRef.value?.open(item);
};

type RenameCharacterDialog = { open: () => void };
const renameCharacterDialogRef = ref<RenameCharacterDialog | null>(null);

const openRenameDialog = () => {
    renameCharacterDialogRef.value?.open();
};

type AttributeKey = 'STR' | 'AGI' | 'CON' | 'LUCK';

const emptyAllocation = (): Record<AttributeKey, number> => ({
    STR: 0, AGI: 0, CON: 0, LUCK: 0,
});

// 屬性點分配：進入分配模式後，玩家可用左側 +/- 調整每項屬性的暫定加點
// （pendingAllocation），下限為 0（不可倒扣現有屬性），上限受剩餘可分配點數
// 限制。儲存時才呼叫 API 落地；取消則直接捨棄暫定值。
const allocating = ref(false);
const savingAllocation = ref(false);
const pendingAllocation = ref(emptyAllocation());

const totalPending = computed(() => (
    Object.values(pendingAllocation.value).reduce((sum, value) => sum + value, 0)
));

const remainingPoints = computed(() => (
    (character.value?.unspentAttributePoints ?? 0) - totalPending.value
));

const startAllocating = () => {
    pendingAllocation.value = emptyAllocation();
    allocating.value = true;
};

const cancelAllocating = () => {
    pendingAllocation.value = emptyAllocation();
    allocating.value = false;
};

const incrementAttribute = (key: AttributeKey) => {
    if (remainingPoints.value <= 0) return;
    pendingAllocation.value[key] += 1;
};

const decrementAttribute = (key: AttributeKey) => {
    if (pendingAllocation.value[key] <= 0) return;
    pendingAllocation.value[key] -= 1;
};

const saveAllocation = async () => {
    if (totalPending.value === 0) return;
    savingAllocation.value = true;
    const ok = await allocateAttributes({ ...pendingAllocation.value });
    savingAllocation.value = false;
    if (ok) {
        allocating.value = false;
        pendingAllocation.value = emptyAllocation();
    }
};

const combatPower = computed(() => {
    if (!character.value) return 0;
    return calculateCombatPower(character.value.stats);
});

onMounted(() => {
    if (!character.value) {
        fetchCharacter();
    }
    if (!inventoryLoaded.value) {
        fetchInventory();
    }
});

watch(character, (value) => {
    if (value) {
        fetchCurrentRun(value.characterId);
    }
}, { immediate: true });
</script>

<style scoped lang="scss">
.character-stage {
    width: 100%;
    overflow-y: hidden;

    &__portrait {
        min-height: 0;
    }

    &__content {
        min-height: 0;
        overflow-y: auto;
        flex: 1 1 auto;
    }

    &__sprite-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    &__sprite-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    &__rename-btn {
        cursor: pointer;
    }

    &__lv-tag {
        color: #ffd166;
        text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.85);
    }

    &__class-chip {
        background: rgba(10, 12, 16, 0.55) !important;
    }

    &__power-tag {
        color: #ef8354;
        text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.85);
    }

    &__sprite-wrap {
        position: relative;
        width: 140px;
        height: 140px;
    }

    &__sprite {
        position: relative;
        z-index: 1;
        margin-left: 36px;
        image-rendering: pixelated;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
    }

    &__equip-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin: 0 auto;
        padding: 16px 10px;
        border-radius: 2px;
        border: 1px solid rgba(196, 203, 219, 0.3);
        background-image: url('/images/backgrounds/sewer-camp.gif');
        background-size: cover;
        background-position: center;
        image-rendering: pixelated;
    }
}
</style>
