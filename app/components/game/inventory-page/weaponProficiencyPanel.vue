<template>
    <div class="character-stage__box weapon-proficiency mb-3">
        <div class="text-caption text-medium-emphasis mb-2">武器熟練度</div>
        <div class="weapon-proficiency__grid">
            <div
                v-for="row in rows"
                :key="row.key"
                class="weapon-proficiency__row"
            >
                <div class="d-flex align-center justify-space-between">
                    <span class="font-pixel text-caption">{{ row.label }}</span>
                    <span
                        v-if="row.used"
                        class="font-pixel text-caption"
                        style="color: rgb(var(--v-theme-primary));"
                    >
                        Lv.{{ row.level }}
                    </span>
                    <span
                        v-else
                        class="text-caption text-medium-emphasis"
                    >
                        尚未使用
                    </span>
                </div>

                <div
                    v-if="row.used"
                    class="weapon-proficiency__bar"
                >
                    <div
                        class="weapon-proficiency__bar-fill"
                        :style="{ width: `${row.progressPercent}%` }"
                    />
                </div>
                <div
                    v-if="row.used && row.level < 10"
                    class="weapon-proficiency__progress-text text-caption text-medium-emphasis"
                >
                    {{ row.expIntoLevel }} / {{ row.expForNextLevel }}
                </div>
                <div
                    v-else-if="row.used"
                    class="weapon-proficiency__progress-text text-caption"
                    style="color: rgb(var(--v-theme-green));"
                >
                    已達最高等級
                </div>

                <div
                    v-if="row.used && row.statBonusText"
                    class="weapon-proficiency__stat-bonus text-caption text-medium-emphasis"
                >
                    {{ row.statBonusText }}
                </div>

                <div
                    v-if="row.unlockedPassives.length > 0"
                    class="weapon-proficiency__passives"
                >
                    <div
                        v-for="passive in row.unlockedPassives"
                        :key="passive.name"
                        class="text-caption"
                    >
                        <span style="color: rgb(var(--v-theme-warning));">{{ passive.name }}</span>
                        <span class="text-medium-emphasis"> — {{ passive.description }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { WeaponType } from '../../../../shared/types/common';
import {
    PROFICIENCY_EXP_THRESHOLDS, PROFICIENCY_MAX_LEVEL,
    WEAPON_TYPE_STAT_BONUS_BY_LEVEL, DUAL_WIELD_STAT_BONUS_BY_LEVEL,
} from '../../../../shared/constants/weaponProficiency';
import {
    WEAPON_PROFICIENCY_DIMENSION_LABEL, WEAPON_PASSIVE_LABEL, PROFICIENCY_PASSIVE_LEVELS,
} from '../../../utils/weaponProficiencyDisplay';

type ProficiencyProgress = { exp: number; level: number };

const props = defineProps<{
    weaponProficiency: Partial<Record<string, ProficiencyProgress>>;
    dualWieldProficiency: ProficiencyProgress;
}>();

const DIMENSIONS: (WeaponType | 'DUAL_WIELD')[] = [
    WeaponType.FIST, WeaponType.BLADE, WeaponType.BLUNT, WeaponType.POLEARM, WeaponType.RANGED, 'DUAL_WIELD',
];

const rows = computed(() => DIMENSIONS.map((key) => {
    const progress = key === 'DUAL_WIELD' ? props.dualWieldProficiency : props.weaponProficiency[key];
    const exp = progress?.exp ?? 0;
    const level = progress?.level ?? 1;
    // dualWieldProficiency 在角色文件裡永遠是完整物件（非 Partial），所以不能用
    // Boolean(progress) 判斷是否用過——剛生成的角色也會落成 exp: 0 的物件，
    // 需改用 exp > 0 才是真的用過雙持。
    const used = exp > 0;

    const currentThreshold = PROFICIENCY_EXP_THRESHOLDS[level] ?? 0;
    const nextThreshold = level < PROFICIENCY_MAX_LEVEL ? PROFICIENCY_EXP_THRESHOLDS[level + 1] ?? currentThreshold : currentThreshold;
    const expIntoLevel = Math.max(0, exp - currentThreshold);
    const expForNextLevel = Math.max(1, nextThreshold - currentThreshold);
    const progressPercent = level >= PROFICIENCY_MAX_LEVEL ? 100 : Math.min(100, Math.round((expIntoLevel / expForNextLevel) * 100));

    const statBonus = (key === 'DUAL_WIELD' ? DUAL_WIELD_STAT_BONUS_BY_LEVEL : WEAPON_TYPE_STAT_BONUS_BY_LEVEL)[level];
    const bonusParts: string[] = [];
    if (statBonus?.atkPercent) {
        bonusParts.push(`攻擊力 +${Math.round(statBonus.atkPercent * 100)}%`);
    }
    if (statBonus?.critChance) {
        bonusParts.push(`爆擊率 +${Math.round(statBonus.critChance * 100)}%`);
    }
    const dimensionLabel = WEAPON_PROFICIENCY_DIMENSION_LABEL[key];
    const statBonusText = bonusParts.length > 0
        ? `裝備${key === 'DUAL_WIELD' ? dimensionLabel : `${dimensionLabel}類武器`}時 ${bonusParts.join('、')}`
        : '';

    const passiveLabel = WEAPON_PASSIVE_LABEL[key];
    const unlockedPassives: { name: string; description: string }[] = [];
    if (used) {
        if (level >= PROFICIENCY_PASSIVE_LEVELS.A_STRENGTHEN) {
            unlockedPassives.push({ name: `${passiveLabel.aName}・強化`, description: passiveLabel.aDescription });
        } else if (level >= PROFICIENCY_PASSIVE_LEVELS.A_UNLOCK) {
            unlockedPassives.push({ name: passiveLabel.aName, description: passiveLabel.aDescription });
        }
        if (level >= PROFICIENCY_PASSIVE_LEVELS.B_MASTERY) {
            unlockedPassives.push({ name: `${passiveLabel.bName}・精通`, description: passiveLabel.bDescription });
        } else if (level >= PROFICIENCY_PASSIVE_LEVELS.B_UNLOCK) {
            unlockedPassives.push({ name: passiveLabel.bName, description: passiveLabel.bDescription });
        }
    }

    return {
        key,
        label: WEAPON_PROFICIENCY_DIMENSION_LABEL[key],
        used,
        level,
        expIntoLevel,
        expForNextLevel,
        progressPercent,
        statBonusText,
        unlockedPassives,
    };
}));
</script>

<style scoped lang="scss">
.character-stage__box {
    width: 100%;
    max-width: none;
    padding: 10px 12px;
    background: rgba(196, 203, 219, 0.04);
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;
}

.weapon-proficiency {
    &__grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
    }

    &__row {
        padding: 6px 8px;
        border: 1px solid rgba(196, 203, 219, 0.12);
        border-radius: 3px;
        background: rgba(196, 203, 219, 0.02);
    }

    &__bar {
        margin-top: 4px;
        height: 6px;
        border-radius: 3px;
        background: rgba(196, 203, 219, 0.12);
        overflow: hidden;
    }

    &__bar-fill {
        height: 100%;
        background: rgb(var(--v-theme-primary));
        transition: width 0.2s ease-out;
    }

    &__progress-text {
        margin-top: 2px;
        text-align: right;
    }

    &__stat-bonus {
        margin-top: 4px;
    }

    &__passives {
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
}
</style>
