<template>
    <div class="fill-height inventory-page pa-3">
        <!-- 讀取中 -->
        <div
            v-if="(characterLoading && !character) || (inventoryLoading && !inventoryLoaded)"
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
                載入背包中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="characterError || inventoryError"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ characterError || inventoryError }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none flex-grow-0"
                prepend-icon="mdi-refresh"
                @click="loadAll"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 背包內容 -->
        <template v-else>
            <!-- LV / 職業 + 屬性 + 可分配屬性點 -->
            <GameCharacterStageAttributePanel
                v-if="character"
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

            <!-- 戰鬥數值 -->
            <GameCharacterStageCombatStats
                v-if="character"
                :attributes="character.attributes"
                :stats="character.stats"
                :equipment-bonus="character.equipmentBonus"
                :talent-bonus="character.talentBonus"
                :proficiency-bonus="character.proficiencyBonus"
                :pending-allocation="pendingAllocation"
                :total-pending="totalPending"
            />

            <!-- Tab 切換：裝備／熟練度／道具 -->
            <div class="inventory-page__tabs d-flex ga-2 mb-3">
                <button
                    v-for="option in TAB_OPTIONS"
                    :key="option.key"
                    type="button"
                    class="inventory-page__tab pixel-press font-pixel"
                    :class="{ 'inventory-page__tab--active': tab === option.key }"
                    @click="tab = option.key"
                >
                    {{ option.label }}
                </button>
            </div>

            <!-- 熟練度 tab -->
            <GameInventoryPageWeaponProficiencyPanel
                v-if="tab === 'PROFICIENCY' && character"
                :weapon-proficiency="character.weaponProficiency"
                :dual-wield-proficiency="character.dualWieldProficiency"
            />

            <!-- 裝備／道具 tab：裝備 tab 多顯示目前裝備總覽，兩者共用下方物品格 -->
            <template v-else>
                <div
                    v-if="tab === 'EQUIPMENT'"
                    class="inventory-page__box mb-3"
                >
                    <div class="d-flex align-center justify-space-between mb-2">
                        <span class="text-caption text-medium-emphasis">目前裝備</span>
                        <span
                            class="text-caption font-pixel"
                            :style="{ color: isOverweight ? 'rgb(var(--v-theme-warning))' : 'rgb(var(--v-theme-primary))' }"
                        >
                            重量 {{ totalEquippedWeight }} / {{ character?.stats.carryCapacity ?? 0 }}
                        </span>
                    </div>
                    <div
                        v-if="overloadPenaltyTexts.length > 0"
                        class="text-caption mb-2"
                        style="color: rgb(var(--v-theme-warning));"
                    >
                        超重懲罰：{{ overloadPenaltyTexts.join('、') }}
                    </div>
                    <div class="d-flex flex-nowrap justify-space-between ga-1">
                        <div
                            v-for="slot in EQUIP_SLOTS_ALL"
                            :key="slot"
                            class="d-flex flex-column align-center flex-grow-0 flex-shrink-0 equip-slot-wrap"
                        >
                            <button
                                type="button"
                                class="pixel-slot pixel-slot--equip pixel-press"
                                :style="slotStyle(slot)"
                                :aria-label="slotLabel(slot)"
                                @click="openSlotDetail(slot)"
                            >
                                <span
                                    v-if="itemById(character?.equipment[slot])"
                                    class="pixel-slot__rarity font-pixel"
                                    :style="{ background: RARITY_COLOR[itemById(character?.equipment[slot])!.rarity] }"
                                >
                                    {{ itemById(character?.equipment[slot])!.rarity }}
                                </span>
                                <GameCommonPixelIcon
                                    :name="slotIcon(slot)"
                                    :size="30"
                                />
                                <span
                                    v-if="slotValue(slot)"
                                    class="pixel-slot__value pixel-slot__value--equip font-pixel"
                                    :style="{ color: slotValueColor(slot) }"
                                >
                                    {{ slotValue(slot) }}
                                </span>
                            </button>
                            <span class="equip-slot-wrap__label text-caption text-medium-emphasis">
                                {{ SLOT_LABEL[slot] }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 格狀背包，一列 6 格，依稀有度由高到低排序 -->
                <v-row
                    v-if="sortedItems.length > 0"
                    dense
                >
                    <v-col
                        v-for="item in sortedItems"
                        :key="item.itemId"
                        cols="2"
                    >
                        <button
                            type="button"
                            class="pixel-slot pixel-slot--item pixel-press"
                            :class="{ 'pixel-slot--equipped': isEquipped(item) }"
                            :style="{ borderColor: RARITY_COLOR[item.rarity] }"
                            @click="openDetail(item)"
                        >
                            <span
                                class="pixel-slot__rarity font-pixel"
                                :style="{ background: RARITY_COLOR[item.rarity] }"
                            >
                                {{ item.rarity }}
                            </span>
                            <GameCommonPixelIcon
                                :name="resolvePixelIcon(item)"
                                :size="32"
                            />
                            <span
                                v-if="primaryStatValue(item)"
                                class="pixel-slot__value font-pixel"
                                :style="{ color: RARITY_COLOR[item.rarity] }"
                            >
                                {{ primaryStatValue(item) }}
                            </span>

                            <div
                                v-if="isEquipped(item)"
                                class="pixel-slot__badge"
                                aria-label="裝備中"
                            >
                                <v-icon
                                    icon="mdi-check-bold"
                                    size="10"
                                />
                            </div>
                        </button>
                    </v-col>
                </v-row>
                <div
                    v-else
                    class="text-center text-body-2 text-medium-emphasis mt-6"
                >
                    這個分類目前沒有物品
                </div>
            </template>
        </template>

        <!-- 物品詳情 dialog -->
        <GameCommonItemDetailDialog ref="itemDetailDialogRef" />
    </div>
</template>

<script setup lang="ts">
import type { EquipmentSlot } from '../../shared/types/common';
import {
    EQUIP_SLOTS_ALL, SLOT_PIXEL_ICON, SLOT_LABEL, RARITY_COLOR, RARITY_ORDER_DESC,
    resolvePixelIcon, primaryStatValue, primaryStatMagnitude,
    equippedStatValue, equippedStatColor, type ItemLike,
} from '../utils/equipmentDisplay';
import { WEIGHT_OVERLOAD_PENALTY } from '../../shared/constants/equipmentWeight';

definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '角色',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 角色頁面' }],
});

const {
    character, loading: characterLoading, error: characterError, fetchCharacter, allocateAttributes,
} = useCharacter();
const {
    items, loading: inventoryLoading, loaded: inventoryLoaded, error: inventoryError, itemById, fetchInventory,
} = useInventory();

type AttributeKey = 'STR' | 'AGI' | 'CON' | 'LUCK';

const emptyAllocation = (): Record<AttributeKey, number> => ({
    STR: 0, AGI: 0, CON: 0, LUCK: 0,
});

// 屬性點分配：進入分配模式後，玩家可用左側 +/- 調整每項屬性的暫定加點
// （pendingAllocation），下限為 0（不可倒扣現有屬性），上限受剩餘可分配點數
// 限制。儲存時才呼叫 API 落地；取消則直接捨棄暫定值。（原本在主畫面，
// 隨 D10 UI 改版搬到角色頁）
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

// 負重狀態（weapon-weight-class D6）：加總目前 6 格裝備的 weight，與
// stats.carryCapacity 比較——懲罰內容已經反映在上方戰鬥數值，這裡只顯示數字。
const totalEquippedWeight = computed(() => (
    EQUIP_SLOTS_ALL.reduce((sum, slot) => sum + (itemById(character.value?.equipment[slot])?.weight ?? 0), 0)
));
const isOverweight = computed(() => totalEquippedWeight.value > (character.value?.stats.carryCapacity ?? 0));

// 超重懲罰文字（對應 shared/utils/calculateStats.ts applyWeightOverloadPenalty
// 的疊加規則），依 overage 級距組出目前實際生效的懲罰說明。
const overloadPenaltyTexts = computed(() => {
    const overage = totalEquippedWeight.value - (character.value?.stats.carryCapacity ?? 0);
    if (overage < 1) return [];

    const texts: string[] = [];
    texts.push(`攻速間隔 +${WEIGHT_OVERLOAD_PENALTY.ACTION_INTERVAL_SEC_AT_OVERAGE_1}s`);
    if (overage >= 2) {
        texts.push(`閃避 -${Math.round(WEIGHT_OVERLOAD_PENALTY.DODGE_CHANCE_AT_OVERAGE_2 * 100)}%`);
    }
    if (overage >= 3) {
        texts.push(`爆擊 -${Math.round(WEIGHT_OVERLOAD_PENALTY.CRIT_CHANCE_AT_OVERAGE_3 * 100)}%`);
    }
    if (overage >= 4) {
        const defPenalty = Math.floor(overage - 3) * WEIGHT_OVERLOAD_PENALTY.DEF_PER_POINT_BEYOND_OVERAGE_3;
        texts.push(`防禦 -${defPenalty}`);
    }
    return texts;
});

type TabKey = 'EQUIPMENT' | 'PROFICIENCY' | 'POTION';

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
    { key: 'EQUIPMENT', label: '裝備' },
    { key: 'PROFICIENCY', label: '熟練度' },
    { key: 'POTION', label: '道具' },
];

const tab = ref<TabKey>('EQUIPMENT');

const sortedItems = computed(() => {
    const filtered = items.value.filter(item => item.type === tab.value);

    return [...filtered].sort((a, b) => {
        const rarityDiff = RARITY_ORDER_DESC.indexOf(a.rarity) - RARITY_ORDER_DESC.indexOf(b.rarity);
        if (rarityDiff) return rarityDiff;

        return primaryStatMagnitude(b) - primaryStatMagnitude(a);
    });
});

const slotLabel = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    return item ? `${SLOT_LABEL[slot]}：已裝備（${item.rarity}）` : `${SLOT_LABEL[slot]}：空`;
};

const slotStyle = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    if (!item) {
        return { borderColor: 'rgba(196, 203, 219, 0.25)', opacity: 0.5 };
    }
    return { borderColor: RARITY_COLOR[item.rarity], opacity: 1 };
};

// Show the equipped item's own picture when the slot is filled, otherwise
// the generic placeholder for that slot.
const slotIcon = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    return item ? resolvePixelIcon(item) : SLOT_PIXEL_ICON[slot];
};

const slotValue = (slot: EquipmentSlot) => equippedStatValue(itemById(character.value?.equipment[slot]));
const slotValueColor = (slot: EquipmentSlot) => equippedStatColor(itemById(character.value?.equipment[slot]));

const isEquipped = (item: { itemId: string }) => (
    Object.values(character.value?.equipment ?? {}).includes(item.itemId)
);

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type ItemDetailDialog = { open: (item: ItemLike & { itemId: string; sellPriceGold: number }) => void };
const itemDetailDialogRef = ref<ItemDetailDialog | null>(null);

const openDetail = (item: ItemLike & { itemId: string; sellPriceGold: number }) => {
    itemDetailDialogRef.value?.open(item);
};

const openSlotDetail = (slot: EquipmentSlot) => {
    const item = itemById(character.value?.equipment[slot]);
    if (item) {
        openDetail(item);
    }
};

const loadAll = () => {
    fetchCharacter();
    fetchInventory();
};

onMounted(() => {
    if (!character.value) fetchCharacter();
    if (!inventoryLoaded.value) fetchInventory();
});
</script>

<style scoped lang="scss">
.inventory-page {
    width: 100%;
    overflow-y: auto;

    &__box {
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }

    &__tabs {
        gap: 8px;
    }

    &__tab {
        flex: 1 1 0;
        padding: 8px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        color: rgb(var(--v-theme-primary));
        opacity: 0.5;
        cursor: pointer;
        transition: opacity 0.08s ease-out;

        &--active {
            opacity: 1;
            border-color: rgb(var(--v-theme-green));
            color: rgb(var(--v-theme-green));
        }
    }
}

.equip-slot-wrap {
    gap: 10px;

    &__label {
        font-size: 10px;
        line-height: 1;
        white-space: nowrap;
    }
}

// Shared "pixel cabinet slot" look: a beveled dark cell with retro corner
// brackets, used for both the equipped-gear overview and the item grid.
.pixel-slot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 3px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    box-shadow:
        inset 2px 2px 0 rgba(255, 255, 255, 0.06),
        inset -2px -2px 0 rgba(0, 0, 0, 0.55);

    &::before,
    &::after {
        content: '';
        position: absolute;
        width: 6px;
        height: 6px;
        pointer-events: none;
        opacity: 0.55;
    }

    &::before {
        top: -2px;
        left: -2px;
        border-top: 2px solid rgb(var(--v-theme-primary));
        border-left: 2px solid rgb(var(--v-theme-primary));
    }

    &::after {
        bottom: -2px;
        right: -2px;
        border-bottom: 2px solid rgb(var(--v-theme-primary));
        border-right: 2px solid rgb(var(--v-theme-primary));
    }

    &--equip {
        width: 48px;
        height: 48px;
        padding: 0;
        cursor: pointer;
        transition: transform 0.06s ease-out;

        &:hover {
            transform: translateY(-1px);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &--item {
        flex-direction: column;
        gap: 2px;
        aspect-ratio: 1;
        width: 100%;
        padding: 0;
        cursor: pointer;
        transition: transform 0.06s ease-out;

        &:hover {
            transform: translateY(-1px);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &--equipped {
        &::before,
        &::after {
            border-color: rgb(var(--v-theme-green));
            opacity: 1;
        }
    }

    &--detail {
        width: 64px;
        height: 64px;
        flex: 0 0 auto;
    }

    &__value {
        font-size: 9px;

        &--equip {
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            padding: 0 3px;
            line-height: 1.3;
            background: #14171c;
            white-space: nowrap;
        }
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

    &__badge {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(var(--v-theme-green));
        color: rgb(var(--v-theme-background));
        border: 2px solid rgb(var(--v-theme-background));
    }
}

.item-detail {
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);

    &__equipped-tag {
        display: inline-flex;
        align-items: center;
        color: rgb(var(--v-theme-green));
    }
}
</style>
