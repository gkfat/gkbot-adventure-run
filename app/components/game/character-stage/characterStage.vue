<template>
    <div class="character-stage d-flex flex-column align-center fill-height pa-2">
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
                <!-- 裝備欄位：角色圖像左右各 3 格 -->
                <div class="character-stage__equip-row d-flex align-center justify-space-between mt-1">
                    <GameCharacterStageEquipSlots
                        :slots="EQUIP_SLOTS_LEFT"
                        :equipment="character.equipment"
                        :item-by-id="itemById"
                        side="left"
                        @select="openItemDetail"
                    />

                    <div class="character-stage__sprite-col d-flex flex-column align-center ga-1">
                        <div class="character-stage__identity d-flex flex-column align-center">
                            <v-chip
                                label
                                size="small"
                                color="primary"
                                variant="outlined"
                                class="font-pixel character-stage__class-chip mb-1"
                            >
                                {{ character.className }}
                            </v-chip>
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
                                width="116"
                                height="116"
                                class="character-stage__sprite"
                            >
                        </div>

                        <div class="character-stage__sprite-header">
                            <p class="font-pixel character-stage__lv-tag my-1">
                                LV {{ character.level }}
                            </p>
                            <p class="font-pixel character-stage__power-tag">
                                戰力 {{ combatPower }}
                            </p>
                        </div>
                    </div>

                    <GameCharacterStageEquipSlots
                        :slots="EQUIP_SLOTS_RIGHT"
                        :equipment="character.equipment"
                        :item-by-id="itemById"
                        side="right"
                        @select="openItemDetail"
                    />
                </div>

                <!-- 目前佩戴中的技能（character-skills）：獨立一列，避免撐高左側裝備欄導致左右不對齊 -->
                <GameCharacterStageEquippedSkills class="mt-1" />

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
    character, loading, error, fetchCharacter,
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

    &__identity {
        gap: 2px;
        margin-bottom: 4px;
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
        width: 116px;
        height: 116px;
    }

    &__sprite {
        position: relative;
        z-index: 1;
        image-rendering: pixelated;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
    }

    &__equip-row {
        width: 100%;
        margin: 0 auto;
        padding: 8px 10px;
    }
}
</style>
