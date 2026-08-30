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
            class="text-center character-stage__portrait"
        >
            <!-- 裝備欄位：角色圖像左右各 4 格 -->
            <div class="character-stage__equip-row">
                <div class="character-stage__equip-col">
                    <div
                        v-for="slot in EQUIP_SLOTS_LEFT"
                        :key="slot"
                        class="equip-slot"
                        :style="slotStyle(slot)"
                        :aria-label="slotLabel(slot, equippedItem(slot))"
                    >
                        <GamePixelIcon
                            :name="slotIcon(slot)"
                            :size="26"
                        />
                        <span
                            v-if="slotValue(slot)"
                            class="equip-slot__value font-pixel"
                            :style="{ color: slotValueColor(slot) }"
                        >
                            {{ slotValue(slot) }}
                        </span>
                    </div>
                </div>

                <img
                    :src="breatheFrameUrl(character.spriteUrl, breathStep)"
                    alt="角色"
                    width="100"
                    height="100"
                    class="character-stage__sprite"
                >

                <div class="character-stage__equip-col">
                    <div
                        v-for="slot in EQUIP_SLOTS_RIGHT"
                        :key="slot"
                        class="equip-slot"
                        :style="slotStyle(slot)"
                        :aria-label="slotLabel(slot, equippedItem(slot))"
                    >
                        <GamePixelIcon
                            :name="slotIcon(slot)"
                            :size="26"
                        />
                        <span
                            v-if="slotValue(slot)"
                            class="equip-slot__value font-pixel"
                            :style="{ color: slotValueColor(slot) }"
                        >
                            {{ slotValue(slot) }}
                        </span>
                    </div>
                </div>
            </div>
            <!-- 職業 / 等級 / EXP / HP -->
            <div class="character-stage__box mt-2 mx-auto">
                <div class="d-flex align-center justify-center ga-2">
                    <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                        LV {{ character.level }}
                    </span>
                    <span class="text-body-2 text-medium-emphasis">
                        {{ character.className }}
                    </span>
                </div>

                <div class="character-stage__bar mt-2">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">HP</span>
                        <span
                            class="font-pixel text-caption character-stage__hp-value"
                            style="color: rgb(var(--v-theme-green));"
                        >
                            {{ character.stats.HP_CURRENT }} / {{ hpMaxLabel }}
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

                <div class="character-stage__bar mt-2">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">EXP</span>
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                            {{ expLabel }}
                        </span>
                    </div>
                    <v-progress-linear
                        :model-value="expPercent"
                        color="primary"
                        bg-color="dark"
                        height="6"
                        rounded
                    />
                </div>
            </div>

            <!-- 屬性 / 戰鬥數值：同一 row，各佔一半 -->
            <div class="character-stage__box character-stage__cols mt-2 mx-auto">
                <div class="character-stage__col">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">屬性</span>
                        <span
                            v-if="character.unspentAttributePoints > 0"
                            class="font-pixel text-caption"
                            style="color: rgb(var(--v-theme-warning));"
                        >
                            +{{ character.unspentAttributePoints }}
                        </span>
                    </div>
                    <div
                        v-if="character.unspentAttributePoints > 0"
                        class="character-stage__hint"
                        style="color: rgb(var(--v-theme-warning));"
                    >
                        （可分配屬性點）
                    </div>
                    <div class="character-stage__grid">
                        <div
                            v-for="attr in attributeEntries"
                            :key="attr.label"
                            class="character-stage__stat"
                        >
                            <span class="text-caption text-medium-emphasis character-stage__stat-label">{{ attr.label }}</span>
                            <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                                {{ attr.value }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="character-stage__col character-stage__col--divided">
                    <div class="mb-1">
                        <span class="text-caption text-medium-emphasis">戰鬥數值</span>
                    </div>
                    <div class="character-stage__grid">
                        <div
                            v-for="stat in statEntries"
                            :key="stat.label"
                            class="character-stage__stat"
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
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 開始/繼續冒險 -->
            <SystemBtn
                block
                variant="flat"
                color="primary"
                class="text-none mt-3 mx-auto character-stage__adventure-cta"
                :loading="adventureLoading"
                @click="handleAdventureCta"
            >
                {{ adventureCtaLabel }}
            </SystemBtn>
        </div>
    </div>
</template>

<script setup lang="ts">
import { EXP_TABLE } from '../../../shared/types/character';
import { getStageDisplayName } from '../../../shared/types/adventure';
import type { EquipmentSlot } from '../../../shared/types/common';
import {
    EQUIP_SLOTS_LEFT, EQUIP_SLOTS_RIGHT, SLOT_PIXEL_ICON, SLOT_LABEL, RARITY_COLOR, resolvePixelIcon,
    equippedStatValue, equippedStatColor,
} from '../../utils/equipmentDisplay';
import { breatheFrameUrl } from '../../utils/spriteDisplay';

const {
    character, loading, error, fetchCharacter,
} = useCharacter();
const {
    itemById, fetchInventory, loaded: inventoryLoaded,
} = useInventory();
const {
    currentRun, hasActiveRun, loading: adventureLoading, fetchCurrent: fetchCurrentRun, start: startAdventure,
} = useAdventureRun();
const breathStep = useIdleBreathingFrame();

const adventureCtaLabel = computed(() => {
    if (hasActiveRun.value && currentRun.value) {
        const stageName = getStageDisplayName(currentRun.value.chapterIndex);
        return `繼續冒險（${stageName}）`;
    }
    if (!character.value) return '開始冒險';
    const stageName = getStageDisplayName(character.value.nextChapterIndex);
    return `開始冒險（${stageName}）`;
});

const handleAdventureCta = async () => {
    if (!character.value) return;

    if (!hasActiveRun.value) {
        const started = await startAdventure(character.value.characterId);
        if (!started) return;
    }

    navigateTo('/adventure');
};

const equippedItem = (slot: EquipmentSlot) => itemById(character.value?.equipment[slot]);

const slotLabel = (slot: EquipmentSlot, item: ReturnType<typeof equippedItem>) => (
    item ? `${SLOT_LABEL[slot]}：已裝備（${item.rarity}）` : `${SLOT_LABEL[slot]}：空`
);

const slotStyle = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    if (!item) {
        return { borderColor: 'rgba(196, 203, 219, 0.25)', opacity: 0.5 };
    }
    return { borderColor: RARITY_COLOR[item.rarity], opacity: 1 };
};

// Show the equipped item's own picture when the slot is filled, otherwise
// the generic placeholder for that slot.
const slotIcon = (slot: EquipmentSlot) => {
    const item = equippedItem(slot);
    return item ? resolvePixelIcon(item) : SLOT_PIXEL_ICON[slot];
};

const slotValue = (slot: EquipmentSlot) => equippedStatValue(equippedItem(slot));
const slotValueColor = (slot: EquipmentSlot) => equippedStatColor(equippedItem(slot));

const hpPercent = computed(() => {
    if (!character.value) return 0;
    const { HP_CURRENT, HP_MAX } = character.value.stats;
    return HP_MAX > 0 ? (HP_CURRENT / HP_MAX) * 100 : 0;
});

const hpMaxLabel = computed(() => {
    if (!character.value) return '';
    const { stats, equipmentBonus } = character.value;
    const { value, delta } = withEquipmentBonus(stats.HP_MAX, equipmentBonus.HP_MAX, 'int');
    return delta ? `${value} ${delta}` : value;
});

const expToNextLevel = computed(() => (character.value ? EXP_TABLE[character.value.level] : undefined));

const expPercent = computed(() => {
    if (!character.value) return 0;
    if (!expToNextLevel.value) return 100; // 已滿等
    return Math.min(100, (character.value.exp / expToNextLevel.value) * 100);
});

const expLabel = computed(() => {
    if (!character.value) return '';
    if (!expToNextLevel.value) return `${character.value.exp}（已滿等）`;
    return `${character.value.exp} / ${expToNextLevel.value}`;
});

const attributeEntries = computed(() => {
    if (!character.value) return [];
    const { attributes } = character.value;
    return [
        { label: '力量', value: attributes.STR },
        { label: '敏捷', value: attributes.AGI },
        { label: '體質', value: attributes.CON },
        { label: '幸運', value: attributes.LUCK },
    ];
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

const statEntries = computed(() => {
    if (!character.value) return [];
    const { stats, equipmentBonus } = character.value;

    return [
        { label: '攻擊力', ...withEquipmentBonus(stats.ATK, equipmentBonus.ATK, 'int') },
        { label: '防禦力', ...withEquipmentBonus(stats.DEF, equipmentBonus.DEF, 'int') },
        {
            label: '攻速',
            ...withEquipmentBonus(stats.actionIntervalSec, equipmentBonus.actionIntervalSec, 'seconds'),
        },
        {
            label: '爆擊', value: `${Math.round(stats.critChance * 100)}%`, delta: '', buffed: false,
        },
        {
            label: '閃避', value: `${Math.round(stats.dodgeChance * 100)}%`, delta: '', buffed: false,
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
    overflow-y: auto;

    &__sprite {
        image-rendering: pixelated;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
    }

    &__equip-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        max-width: 280px;
        margin: 0 auto;
    }

    &__equip-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    &__bar {
        width: 100%;
    }

    &__hp-value {
        white-space: nowrap;
    }

    &__box {
        width: 100%;
        max-width: 280px;
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }

    &__cols {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: 12px;
        padding: 10px 12px;
    }

    &__col {
        min-width: 0;

        &--divided {
            padding-left: 12px;
            border-left: 1px solid rgba(196, 203, 219, 0.12);
        }
    }

    &__grid {
        display: grid;
        grid-template-columns: 1fr;
        row-gap: 5px;
    }

    &__stat {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 6px;
        min-width: 0;
    }

    &__stat-label {
        white-space: nowrap;
        flex-shrink: 0;
    }

    &__stat-value-block {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
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

    &__hint {
        font-size: 10px;
        line-height: 1.2;
        margin-bottom: 4px;
    }
}

.equip-slot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 6px;
    background: rgba(196, 203, 219, 0.04);
    color: rgb(var(--v-theme-primary));

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
}

</style>
