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
                <div class="character-stage__box character-stage__summary">
                    <div class="character-stage__summary-grid character-stage__summary-grid--no-level">
                        <div class="character-stage__summary-col">
                            <v-row dense>
                                <v-col
                                    v-for="attr in attributeEntries"
                                    :key="attr.key"
                                    cols="6"
                                    class="character-stage__stat"
                                >
                                    <span class="text-caption text-medium-emphasis character-stage__stat-label">{{ attr.label }}</span>
                                    <span class="d-flex align-center ga-1">
                                        <button
                                            v-if="allocating"
                                            type="button"
                                            class="attr-step-btn pixel-press"
                                            :disabled="attr.pending <= 0"
                                            aria-label="減少"
                                            @click="decrementAttribute(attr.key)"
                                        >
                                            −
                                        </button>
                                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                                            {{ attr.value }}<span
                                                v-if="attr.pending > 0"
                                                style="color: rgb(var(--v-theme-warning));"
                                            >+{{ attr.pending }}</span>
                                        </span>
                                        <button
                                            v-if="allocating"
                                            type="button"
                                            class="attr-step-btn pixel-press"
                                            :disabled="remainingPoints <= 0"
                                            aria-label="增加"
                                            @click="incrementAttribute(attr.key)"
                                        >
                                            +
                                        </button>
                                    </span>
                                </v-col>
                            </v-row>
                        </div>

                        <div class="character-stage__summary-col character-stage__col--divided character-stage__summary-col--points">
                            <span
                                class="font-pixel text-caption"
                                :style="{ color: remainingPoints > 0 ? 'rgb(var(--v-theme-warning))' : 'rgb(var(--v-theme-primary))' }"
                            >
                                +{{ remainingPoints }} 可用屬性點
                            </span>
                            <SystemBtn
                                v-if="!allocating && character.unspentAttributePoints > 0"
                                size="x-small"
                                variant="outlined"
                                color="primary"
                                class="text-none mt-1"
                                @click="startAllocating"
                            >
                                分配
                            </SystemBtn>
                            <div
                                v-else-if="allocating"
                                class="d-flex ga-2 mt-1"
                            >
                                <button
                                    type="button"
                                    class="attr-allocation-btn pixel-press"
                                    aria-label="儲存"
                                    :disabled="totalPending === 0 || savingAllocation"
                                    @click="saveAllocation"
                                >
                                    <GamePixelIcon name="confirm" :size="18" />
                                </button>
                                <button
                                    type="button"
                                    class="attr-allocation-btn pixel-press"
                                    aria-label="取消"
                                    :disabled="savingAllocation"
                                    @click="cancelAllocating"
                                >
                                    <GamePixelIcon name="cancel" :size="18" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 戰鬥數值：每格 col-4 -->
                <div class="character-stage__box character-stage__combat my-2">
                    <v-row dense>
                        <v-col
                            v-for="stat in statEntries"
                            :key="stat.label"
                            cols="4"
                            class="character-stage__combat-stat"
                        >
                            <span class="text-caption text-medium-emphasis character-stage__stat-label">{{ stat.label }}</span>
                            <span class="character-stage__stat-value-block">
                                <span
                                    class="font-pixel character-stage__stat-value"
                                    :style="{ color: stat.buffed ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-primary))' }"
                                >
                                    {{ stat.value }}
                                </span>
                                <span
                                    v-if="stat.delta"
                                    class="character-stage__stat-delta"
                                    style="color: rgb(var(--v-theme-green));"
                                >
                                    {{ stat.delta }}
                                </span>
                                <span
                                    v-if="stat.pendingDelta"
                                    class="character-stage__stat-delta"
                                    style="color: rgb(var(--v-theme-warning));"
                                >
                                    {{ stat.pendingDelta }}
                                </span>
                            </span>
                        </v-col>
                    </v-row>
                </div>

                <!-- 裝備欄位：角色圖像左右各 3 格 -->
                <div class="character-stage__equip-row my-5">
                    <div class="character-stage__equip-col">
                        <button
                            v-for="slot in EQUIP_SLOTS_LEFT"
                            :key="slot"
                            type="button"
                            class="equip-slot pixel-press"
                            :style="slotStyle(slot)"
                            :aria-label="slotLabel(slot, equippedItem(slot))"
                            @click="openSlotDetail(slot)"
                        >
                            <span
                                v-if="equippedItem(slot)"
                                class="equip-slot__rarity font-pixel"
                                :style="{ background: RARITY_COLOR[equippedItem(slot)!.rarity] }"
                            >
                                {{ equippedItem(slot)!.rarity }}
                            </span>
                            <GamePixelIcon
                                :name="slotIcon(slot)"
                                :size="32"
                                :class="{ 'equip-slot__icon--empty': !equippedItem(slot) }"
                            />
                            <span
                                v-if="slotValue(slot)"
                                class="equip-slot__value font-pixel"
                                :style="{ color: slotValueColor(slot) }"
                            >
                                {{ slotValue(slot) }}
                            </span>
                        </button>
                    </div>

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
                            <div class="text-body-2 text-medium-emphasis">
                                {{ character.nickname }}
                            </div>
                        </div>

                        <div class="character-stage__sprite-wrap">
                            <img
                                :src="breatheFrameUrl(character.spriteUrl, breathStep)"
                                alt="角色"
                                width="140"
                                height="140"
                                class="character-stage__sprite"
                            >
                        </div>
                    </div>

                    <div class="character-stage__equip-col">
                        <button
                            v-for="slot in EQUIP_SLOTS_RIGHT"
                            :key="slot"
                            type="button"
                            class="equip-slot pixel-press"
                            :style="slotStyle(slot)"
                            :aria-label="slotLabel(slot, equippedItem(slot))"
                            @click="openSlotDetail(slot)"
                        >
                            <span
                                v-if="equippedItem(slot)"
                                class="equip-slot__rarity font-pixel"
                                :style="{ background: RARITY_COLOR[equippedItem(slot)!.rarity] }"
                            >
                                {{ equippedItem(slot)!.rarity }}
                            </span>
                            <GamePixelIcon
                                :name="slotIcon(slot)"
                                :size="32"
                                :class="{ 'equip-slot__icon--empty': !equippedItem(slot) }"
                            />
                            <span
                                v-if="slotValue(slot)"
                                class="equip-slot__value font-pixel"
                                :style="{ color: slotValueColor(slot) }"
                            >
                                {{ slotValue(slot) }}
                            </span>
                        </button>
                    </div>
                </div>

                <!-- 裝備詳情 dialog -->
                <GameItemDetailDialog ref="itemDetailDialogRef" />
            </div>

            <!-- 章節進度／開始冒險：固定於底部 -->
            <div class="w-100 character-stage__footer">
                <!-- 中斷中的冒險：顯示上次斷掉的位置 -->
                <div
                    v-if="interruptedRunLabel"
                    class="text-caption text-medium-emphasis text-center character-stage__interrupted-run"
                >
                    上次探索中斷於：{{ interruptedRunLabel }}
                </div>
                <SystemBtn
                    block
                    size="x-large"
                    variant="flat"
                    color="primary"
                    class="text-none mt-2 mx-auto character-stage__adventure-cta"
                    :loading="adventureLoading"
                    @click="handleAdventureCta"
                >
                    <span class="d-flex flex-column">
                        <span
                            v-if="levelProgress"
                            class="text-caption font-weight-regular character-stage__adventure-cta-progress"
                        >
                            {{ levelProgress.stageName }} - {{ levelProgress.levelIndex }}/{{ levelProgress.levelTotal }}
                        </span>
                        <span>{{ adventureCtaLabel }}</span>
                    </span>
                </SystemBtn>
                <!-- 放棄本次探索：僅在有進行中的 run 時顯示 -->
                <SystemBtn
                    v-if="hasActiveRun && !justStarting"
                    block
                    color="error"
                    size="x-small"
                    class="text-none mt-1 mx-auto"
                    :loading="adventureLoading"
                    @click="handleAbandonRun"
                >
                    放棄本次探索
                </SystemBtn>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getStageDisplayName } from '../../../shared/types/adventure';
import type { EquipmentSlot } from '../../../shared/types/common';
import { calculateBaseStats, applyEquipmentStats } from '../../../shared/utils/calculateStats';
import {
    EQUIP_SLOTS_LEFT, EQUIP_SLOTS_RIGHT, SLOT_PIXEL_ICON, SLOT_LABEL, RARITY_COLOR, resolvePixelIcon,
    equippedStatValue, equippedStatColor,
} from '../../utils/equipmentDisplay';
import { breatheFrameUrl } from '../../utils/spriteDisplay';

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
const breathStep = useIdleBreathingFrame();

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

const equippedItem = (slot: EquipmentSlot) => itemById(character.value?.equipment[slot]);

const slotLabel = (slot: EquipmentSlot, item: ReturnType<typeof equippedItem>) => (
    item ? `${SLOT_LABEL[slot]}：已裝備（${item.rarity}）` : `${SLOT_LABEL[slot]}：空`
);

const slotStyle = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    if (!item) {
        return { borderColor: 'rgba(196, 203, 219, 0.25)', background: '#14171c' };
    }
    return { borderColor: RARITY_COLOR[item.rarity], background: '#14171c' };
};

// Show the equipped item's own picture when the slot is filled, otherwise
// the generic placeholder for that slot.
const slotIcon = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    return item ? resolvePixelIcon(item) : SLOT_PIXEL_ICON[slot];
};

const slotValue = (slot: EquipmentSlot) => equippedStatValue(equippedItem(slot));
const slotValueColor = (slot: EquipmentSlot) => equippedStatColor(equippedItem(slot));

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type ItemDetailDialog = { open: (item: NonNullable<ReturnType<typeof equippedItem>>) => void };
const itemDetailDialogRef = ref<ItemDetailDialog | null>(null);

const openSlotDetail = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    if (item) {
        itemDetailDialogRef.value?.open(item);
    }
};

type AttributeKey = 'STR' | 'AGI' | 'CON' | 'LUCK';

const ATTRIBUTE_META: { key: AttributeKey; label: string }[] = [
    { key: 'STR', label: '力量' },
    { key: 'AGI', label: '敏捷' },
    { key: 'CON', label: '體質' },
    { key: 'LUCK', label: '幸運' },
];

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

const attributeEntries = computed(() => {
    if (!character.value) return [];
    const { attributes } = character.value;
    return ATTRIBUTE_META.map(({ key, label }) => ({
        key,
        label,
        value: attributes[key],
        pending: pendingAllocation.value[key],
    }));
});

// 分配過程中的即時狀態值預覽：以暫定屬性（現有值 + 待分配點數）套用純前端的
// calculateBaseStats/applyEquipmentStats（與後端同一份公式，見 shared/utils/calculateStats），
// 疊上目前裝備加成後與伺服端目前的 stats 比較差值，顯示在下方戰鬥數值旁。
const previewStats = computed(() => {
    if (!character.value || totalPending.value === 0) return null;
    const { attributes, equipmentBonus } = character.value;
    const previewAttributes = {
        STR: attributes.STR + pendingAllocation.value.STR,
        AGI: attributes.AGI + pendingAllocation.value.AGI,
        CON: attributes.CON + pendingAllocation.value.CON,
        LUCK: attributes.LUCK + pendingAllocation.value.LUCK,
    };
    const base = calculateBaseStats(previewAttributes);
    return applyEquipmentStats(base, equipmentBonus);
});

type StatFormat = 'int' | 'seconds';

const formatStat = (value: number, format: StatFormat) => (
    format === 'seconds' ? `${value.toFixed(1)}s` : `${value}`
);

// `finalValue` (from `stats`) already has the equipment contribution baked
// in — it is the number actually used in combat. Only the delta (`bonus`)
// is worth surfacing separately, in parentheses; the pre-equipment base
// value is not shown anywhere.
const withEquipmentBonus = (finalValue: number, bonus: number | undefined, format: StatFormat) => {
    if (!bonus) {
        return { value: formatStat(finalValue, format), delta: '', buffed: false };
    }
    const sign = bonus > 0 ? '+' : '';
    return {
        value: formatStat(finalValue, format),
        delta: `(${sign}${formatStat(bonus, format)})`,
        buffed: true,
    };
};

// 分配預覽的差值文字，例如 "+12"，數值不變時回傳空字串（不顯示）。
const pendingDeltaText = (current: number, preview: number | undefined, format: StatFormat) => {
    if (preview === undefined || preview === current) return '';
    const sign = preview > current ? '+' : '';
    return `${sign}${formatStat(preview - current, format)}`;
};

const pendingPercentDeltaText = (current: number, preview: number | undefined) => {
    if (preview === undefined || preview === current) return '';
    const diff = Math.round((preview - current) * 100);
    if (diff === 0) return '';
    return `${diff > 0 ? '+' : ''}${diff}%`;
};

// Percent-format sibling of `withEquipmentBonus` — `finalValue` already has
// the equipment contribution (incl. HEAVY carry-capacity discount) baked in.
const withEquipmentBonusPercent = (finalValue: number, bonus: number | undefined) => {
    const percentValue = `${Math.round(finalValue * 100)}%`;
    if (!bonus) {
        return { value: percentValue, delta: '', buffed: false };
    }
    const diff = Math.round(bonus * 100);
    const sign = diff > 0 ? '+' : '';
    return {
        value: percentValue, delta: `(${sign}${diff}%)`, buffed: true,
    };
};

const statEntries = computed(() => {
    if (!character.value) return [];
    const { stats, equipmentBonus } = character.value;
    const preview = previewStats.value;

    return [
        {
            label: 'HP',
            ...withEquipmentBonus(stats.HP_MAX, equipmentBonus.HP_MAX, 'int'),
            pendingDelta: pendingDeltaText(stats.HP_MAX, preview?.HP_MAX, 'int'),
        },
        {
            label: '攻擊力',
            ...withEquipmentBonus(stats.ATK, equipmentBonus.ATK, 'int'),
            pendingDelta: pendingDeltaText(stats.ATK, preview?.ATK, 'int'),
        },
        {
            label: '防禦力',
            ...withEquipmentBonus(stats.DEF, equipmentBonus.DEF, 'int'),
            pendingDelta: pendingDeltaText(stats.DEF, preview?.DEF, 'int'),
        },
        {
            label: '攻速',
            ...withEquipmentBonus(stats.actionIntervalSec, equipmentBonus.actionIntervalSec, 'seconds'),
            pendingDelta: pendingDeltaText(stats.actionIntervalSec, preview?.actionIntervalSec, 'seconds'),
        },
        {
            label: '爆擊',
            value: `${Math.round(stats.critChance * 100)}%`,
            delta: '',
            buffed: false,
            pendingDelta: pendingPercentDeltaText(stats.critChance, preview?.critChance),
        },
        {
            label: '閃避',
            ...withEquipmentBonusPercent(stats.dodgeChance, equipmentBonus.dodgeChance),
            pendingDelta: pendingPercentDeltaText(stats.dodgeChance, preview?.dodgeChance),
        },
    ];
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

    &__footer {
        flex-shrink: 0;
        padding-top: 8px;
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

    &__lv-tag {
        color: #ffd166;
        text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.85);
    }

    &__class-chip {
        background: rgba(10, 12, 16, 0.55) !important;
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
        border-radius: 8px;
        background-image: url('/images/backgrounds/sewer-camp.gif');
        background-size: cover;
        background-position: center;
        image-rendering: pixelated;
    }

    &__equip-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    &__box {
        width: 100%;
        max-width: 280px;
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }

    &__summary {
        max-width: none;
        padding: 8px 12px;
    }

    &__summary-grid {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        column-gap: 12px;

        &--no-level {
            grid-template-columns: 1fr auto;
        }
    }

    &__summary-col {
        min-width: 0;

        &--points {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            white-space: nowrap;
        }
    }

    &__col--divided {
        padding-left: 12px;
        border-left: 1px solid rgba(196, 203, 219, 0.12);
    }

    &__combat {
        max-width: none;
        padding: 8px 12px;
    }

    &__combat-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        text-align: center;
    }

    &__stat {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    &__stat-label {
        white-space: nowrap;
        flex-shrink: 0;
    }

    &__stat-value-block {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        justify-content: center;
        gap: 4px;
        min-width: 0;
        line-height: 1.3;
    }

    &__stat-value {
        font-size: 10px;
        white-space: nowrap;
    }

    &__stat-delta {
        font-size: 9px;
        white-space: nowrap;
        opacity: 0.85;
    }
}

.attr-allocation-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid rgba(196, 203, 219, 0.3);
    border-radius: 3px;
    background: rgba(196, 203, 219, 0.06);
    cursor: pointer;

    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
}

.attr-step-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    line-height: 1;
    font-size: 11px;
    border: 1px solid rgba(196, 203, 219, 0.3);
    border-radius: 3px;
    background: rgba(196, 203, 219, 0.06);
    color: rgb(var(--v-theme-primary));
    cursor: pointer;

    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
}

.equip-slot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    padding: 0;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 6px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    cursor: pointer;

    &__value {
        position: absolute;
        bottom: -9px;
        left: 50%;
        transform: translateX(-50%);
        padding: 0 3px;
        font-size: 9px;
        line-height: 1.3;
        background: #14171c;
        white-space: nowrap;
    }

    &__rarity {
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

    &__icon--empty {
        opacity: 0.4;
    }
}

</style>
