<template>
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
</template>

<script setup lang="ts">
import type { Attributes, Stats } from '../../../../shared/types/common';
import { calculateBaseStats, applyEquipmentStats, applyTalentStats } from '../../../../shared/utils/calculateStats';

const props = defineProps<{
    attributes: Attributes;
    stats: Stats;
    equipmentBonus: Partial<Stats>;
    talentBonus: Partial<Stats>;
    pendingAllocation: Partial<Attributes>;
    totalPending: number;
}>();

// 裝備與天賦都是已經反映在 `stats` 裡的加成來源,顯示時合併成單一括號差值
// (例如 "(+3)" 可能是裝備+2、天賦+1 的總和),不特別區分來源。
const totalBonus = (stat: keyof Stats): number | undefined => {
    const fromEquipment = props.equipmentBonus[stat] ?? 0;
    const fromTalent = props.talentBonus[stat] ?? 0;
    const total = fromEquipment + fromTalent;
    return total || undefined;
};

// 分配過程中的即時狀態值預覽：以暫定屬性（現有值 + 待分配點數）套用純前端的
// calculateBaseStats/applyEquipmentStats/applyTalentStats（與後端同一份公式，見
// shared/utils/calculateStats），疊上目前裝備＋天賦加成後與伺服端目前的 stats
// 比較差值，顯示在下方戰鬥數值旁。天賦加成不會因為分配屬性點而改變，但仍要疊
// 上去──否則拿掉裝備/天賦後的 preview 會比已經含裝備/天賦加成的 `stats` 低，
// 明明只加點卻算出負的 pendingDelta（見使用者回報）。
const previewStats = computed(() => {
    if (props.totalPending === 0) return null;
    const previewAttributes = {
        STR: props.attributes.STR + (props.pendingAllocation.STR ?? 0),
        AGI: props.attributes.AGI + (props.pendingAllocation.AGI ?? 0),
        CON: props.attributes.CON + (props.pendingAllocation.CON ?? 0),
        LUCK: props.attributes.LUCK + (props.pendingAllocation.LUCK ?? 0),
    };
    const base = calculateBaseStats(previewAttributes);
    const afterEquipment = applyEquipmentStats(base, props.equipmentBonus);
    return applyTalentStats(afterEquipment, props.talentBonus);
});

type StatFormat = 'int' | 'seconds';

const formatStat = (value: number, format: StatFormat) => (
    format === 'seconds' ? `${value.toFixed(2)}s` : `${value}`
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
    const { stats } = props;
    const preview = previewStats.value;

    return [
        {
            label: '生命值',
            ...withEquipmentBonus(stats.HP_MAX, totalBonus('HP_MAX'), 'int'),
            pendingDelta: pendingDeltaText(stats.HP_MAX, preview?.HP_MAX, 'int'),
        },
        {
            label: '攻擊力',
            ...withEquipmentBonus(stats.ATK, totalBonus('ATK'), 'int'),
            pendingDelta: pendingDeltaText(stats.ATK, preview?.ATK, 'int'),
        },
        {
            label: '防禦力',
            ...withEquipmentBonus(stats.DEF, totalBonus('DEF'), 'int'),
            pendingDelta: pendingDeltaText(stats.DEF, preview?.DEF, 'int'),
        },
        {
            label: '攻速',
            ...withEquipmentBonus(stats.actionIntervalSec, totalBonus('actionIntervalSec'), 'seconds'),
            pendingDelta: pendingDeltaText(stats.actionIntervalSec, preview?.actionIntervalSec, 'seconds'),
        },
        {
            label: '爆擊',
            ...withEquipmentBonusPercent(stats.critChance, totalBonus('critChance')),
            pendingDelta: pendingPercentDeltaText(stats.critChance, preview?.critChance),
        },
        {
            label: '閃避',
            ...withEquipmentBonusPercent(stats.dodgeChance, totalBonus('dodgeChance')),
            pendingDelta: pendingPercentDeltaText(stats.dodgeChance, preview?.dodgeChance),
        },
    ];
});
</script>

<style scoped lang="scss">
.character-stage__box {
    width: 100%;
    max-width: 280px;
    padding: 10px 12px;
    background: rgba(196, 203, 219, 0.04);
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;
}

.character-stage__combat {
    max-width: none;
    padding: 8px 12px;
}

.character-stage__combat-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
}

.character-stage__stat-label {
    white-space: nowrap;
    flex-shrink: 0;
}

.character-stage__stat-value-block {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    line-height: 1.3;
}

.character-stage__stat-value {
    font-size: 10px;
    white-space: nowrap;
}

.character-stage__stat-delta {
    font-size: 11px;
    white-space: nowrap;
    opacity: 0.85;
}
</style>
