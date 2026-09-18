<template>
    <GameCommonDialogFrame
        v-model="open"
        :max-width="360"
        content-class="skill-dialog"
    >
        <template v-if="skill">
            <div class="d-flex align-center ga-3 mb-3">
                <div class="skill-dialog__icon d-flex align-center justify-center">
                    <GameCommonPixelIcon
                        :name="pixelIconName"
                        :size="32"
                    />
                </div>
                <div>
                    <div class="font-pixel text-body-1">{{ skill.name }}</div>
                    <div
                        v-if="skill.unlocked"
                        class="text-caption"
                        style="color: rgb(var(--v-theme-primary));"
                    >
                        Lv.{{ skill.level }}
                        <span v-if="skill.isEquipped" style="color: rgb(var(--v-theme-green));">・佩戴中</span>
                    </div>
                    <div v-else class="text-caption text-medium-emphasis">尚未解鎖</div>
                </div>
            </div>

            <div
                v-if="skill.unlocked"
                class="text-body-2 text-medium-emphasis mb-1"
            >
                {{ skill.description }}
            </div>
            <div
                v-if="skill.unlocked && skill.chargeSec != null"
                class="text-caption text-medium-emphasis mb-3"
            >
                充能時間：{{ skill.chargeSec }} 秒
            </div>

            <div
                v-if="skill.unlocked && skill.effect"
                class="skill-dialog__box mb-3"
            >
                <div class="text-caption text-medium-emphasis mb-1">目前效果</div>
                <div class="text-body-2">{{ describeSkillEffect(skill.effect) }}</div>
            </div>

            <!-- 下一級效果預覽（known-issue.md #2）：內容隨目前選擇的碎片數量同步
                 變化——疊加大量碎片時會連續往後計算多級（不是只看下一級就停住，
                 見使用者回報），選到的碎片數若足以觸發升級，顯示「Lv.X → Lv.Y」
                 與對應數值差異，否則維持顯示目前等級/效果。沒有碎片可強化時完全
                 不顯示這個 panel（使用者要求：反正也沒辦法選碎片觸發升級）。 -->
            <div
                v-if="skill.unlocked && skill.effect && previewEffect && (skill.fragmentCount ?? 0) > 0"
                class="skill-dialog__box skill-dialog__box--preview mb-3"
            >
                <div class="text-caption mb-1" style="color: rgb(var(--v-theme-primary));">
                    {{ willLevelUp ? `Lv.${skill.level} → Lv.${previewLevel}` : `Lv.${skill.level}` }}
                </div>
                <div
                    v-if="willLevelUp && previewDiffParts"
                    class="text-body-2"
                >
                    {{ previewDiffParts.label }}：{{ previewDiffParts.from }} →
                    <span class="skill-dialog__preview-value">{{ previewDiffParts.to }}</span>
                </div>
                <div v-else class="text-body-2">
                    {{ willLevelUp ? describeSkillEffectDiff(skill.effect, previewEffect) : describeSkillEffect(skill.effect) }}
                </div>
            </div>

            <div
                v-if="skill.unlocked && skill.level != null && skill.level < SKILL_MAX_LEVEL"
                class="mb-3"
            >
                <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption text-medium-emphasis">經驗值</span>
                    <span class="text-caption font-pixel">{{ expIntoLevel }} / {{ expForNextLevel }}</span>
                </div>
                <div class="skill-dialog__bar">
                    <div
                        class="skill-dialog__bar-fill"
                        :style="{ width: `${expPercent}%` }"
                    />
                </div>
            </div>
            <div
                v-else-if="skill.unlocked"
                class="text-caption mb-3"
                style="color: rgb(var(--v-theme-green));"
            >
                已達最高等級
            </div>

            <div
                v-if="!skill.unlocked"
                class="text-caption text-medium-emphasis mb-3"
            >
                碎片：{{ skill.fragmentCount ?? 0 }} / {{ skill.unlockFragmentCost }}（解鎖門檻）
            </div>

            <div
                v-if="actionError"
                class="text-body-2 mb-3"
                style="color: rgb(var(--v-theme-warning));"
            >
                {{ actionError }}
            </div>

            <SystemBtn
                v-if="!skill.unlocked"
                block
                variant="flat"
                color="primary"
                class="text-none mb-2"
                :disabled="(skill.fragmentCount ?? 0) < skill.unlockFragmentCost"
                :loading="actionLoading"
                @click="handleUnlock"
            >
                解鎖
            </SystemBtn>

            <div
                v-else-if="skill.level != null && skill.level < SKILL_MAX_LEVEL"
                class="mb-2"
            >
                <div
                    v-if="(skill.fragmentCount ?? 0) > 0"
                    class="d-flex align-center justify-center ga-3 mb-2"
                >
                    <SystemBtn
                        variant="outlined"
                        color="primary"
                        size="small"
                        class="text-none"
                        :disabled="fragmentsToSpend <= 0"
                        @click="fragmentsToSpend = 0"
                    >
                        MIN
                    </SystemBtn>
                    <SystemBtn
                        size="small"
                        variant="outlined"
                        color="primary"
                        class="skill-dialog__stepper-btn"
                        :disabled="fragmentsToSpend <= 0"
                        @click="fragmentsToSpend = Math.max(0, fragmentsToSpend - 1)"
                    >
                        <v-icon icon="mdi-minus" size="16" />
                    </SystemBtn>
                    <span class="font-pixel text-body-2" style="min-width: 56px; text-align: center;">
                        {{ fragmentsToSpend }} / {{ skill.fragmentCount }}
                    </span>
                    <SystemBtn
                        size="small"
                        variant="outlined"
                        color="primary"
                        class="skill-dialog__stepper-btn"
                        :disabled="fragmentsToSpend >= (skill.fragmentCount ?? 0)"
                        @click="fragmentsToSpend = Math.min(skill.fragmentCount ?? 0, fragmentsToSpend + 1)"
                    >
                        <v-icon icon="mdi-plus" size="16" />
                    </SystemBtn>
                    <SystemBtn
                        variant="outlined"
                        color="primary"
                        size="small"
                        class="text-none"
                        @click="fragmentsToSpend = skill.fragmentCount ?? 0"
                    >
                        MAX
                    </SystemBtn>
                </div>
                <SystemBtn
                    v-if="(skill.fragmentCount ?? 0) > 0"
                    block
                    variant="outlined"
                    color="primary"
                    class="text-none"
                    :disabled="fragmentsToSpend === 0"
                    :loading="actionLoading"
                    @click="handleStrengthen"
                >
                    消耗碎片強化
                </SystemBtn>
            </div>

            <SystemBtn
                v-if="skill.unlocked && !skill.isEquipped"
                block
                variant="flat"
                color="green"
                class="text-none mb-2"
                :disabled="!hasOpenSlot"
                :loading="actionLoading"
                @click="handleEquip"
            >
                {{ hasOpenSlot ? '佩戴' : '佩戴欄位已滿' }}
            </SystemBtn>
            <SystemBtn
                v-else-if="skill.unlocked && skill.isEquipped"
                block
                variant="outlined"
                color="warning"
                class="text-none mb-2"
                :loading="actionLoading"
                @click="handleUnequip"
            >
                卸下
            </SystemBtn>

            <SystemBtn
                block
                variant="outlined"
                color="primary"
                class="text-none"
                @click="open = false"
            >
                關閉
            </SystemBtn>
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import type { SkillEntry } from '../../../composables/useCharacterSkills';
import { describeSkillEffect, describeSkillEffectDiff, describeSkillEffectDiffParts } from '../../../utils/skillDisplay';
import type { PixelIconName } from '../../../utils/pixelIcons';
import {
    SKILL_MAX_LEVEL, SKILL_EXP_TABLE, FRAGMENT_TO_EXP_RATE, getSkillLevelForExp,
} from '../../../../shared/constants/skills';

const props = defineProps<{
    equippedSkillIds: (string | null)[];
    unlockedSlotCount: number;
}>();

const {
    skills, unlockSkill, strengthenSkill, equipSkill, actionLoading, actionError,
} = useCharacterSkills();

const open = ref(false);
const skill = ref<SkillEntry | null>(null);
// known-issue.md #2：強化改成可選擇消耗幾個碎片，預設 0（使用者要求：預設不
// 選任何碎片，改由玩家自己選擇要消耗多少），而不是強制一次全部投入。
const fragmentsToSpend = ref(0);

const pixelIconName = computed(() => (skill.value?.icon ?? 'mysteryCapsule') as PixelIconName);

// 選擇碎片後預估落在哪一級（用同一套 exp 換算邏輯 getSkillLevelForExp，跟
// 後端 strengthenSkill 的判斷共用同一份 shared 常數）——下面經驗值條/預覽 panel
// 都以這個「預估等級」為準，選到的碎片數超過一個等級的門檻時會連續往後推算
// 多級，而不是卡在目前等級的區間就不動（使用者回報）。
const previewLevel = computed(() => {
    if (!skill.value?.level || skill.value.exp == null) return skill.value?.level ?? 1;
    const previewExp = skill.value.exp + fragmentsToSpend.value * FRAGMENT_TO_EXP_RATE;
    return Math.min(SKILL_MAX_LEVEL, getSkillLevelForExp(previewExp));
});

// 經驗值條隨加減碎片即時預覽：分母/分子都改用 previewLevel 的區間計算，足以
// 升級時會自動換算成「下一等級的經驗值累積」，而不是停留在原本等級的區間封頂
// 不動（使用者回報）。fragmentsToSpend 為 0 時 previewLevel 等於目前等級，行為
// 跟未選碎片時一致。
const expIntoLevel = computed(() => {
    if (!skill.value?.level || skill.value.exp == null) return 0;
    const currentThreshold = SKILL_EXP_TABLE[previewLevel.value] ?? 0;
    const previewExp = skill.value.exp + fragmentsToSpend.value * FRAGMENT_TO_EXP_RATE;
    return Math.max(0, Math.min(previewExp - currentThreshold, expForNextLevel.value));
});
const expForNextLevel = computed(() => {
    const level = previewLevel.value;
    if (!level) return 1;
    const currentThreshold = SKILL_EXP_TABLE[level] ?? 0;
    const nextThreshold = level < SKILL_MAX_LEVEL ? (SKILL_EXP_TABLE[level + 1] ?? currentThreshold) : currentThreshold;
    return Math.max(1, nextThreshold - currentThreshold);
});
const expPercent = computed(() => Math.min(100, Math.round((expIntoLevel.value / expForNextLevel.value) * 100)));
const willLevelUp = computed(() => Boolean(skill.value?.level) && previewLevel.value > skill.value!.level!);
// previewLevel 對應等級的實際效果數值，取自 effectByLevel（Lv.1 對應 index 0）。
const previewEffect = computed(() => skill.value?.effectByLevel?.[previewLevel.value - 1]);
// 拆成 label/from/to 三段，讓 template 把「變動後數值」用比較顯眼的樣式呈現
// （使用者要求）。
const previewDiffParts = computed(() => (
    skill.value?.effect && previewEffect.value ? describeSkillEffectDiffParts(skill.value.effect, previewEffect.value) : null
));

const openSlotIndex = computed(() => {
    for (let i = 0; i < props.unlockedSlotCount; i++) {
        if (!props.equippedSkillIds[i]) return i as 0 | 1 | 2;
    }
    return null;
});
const hasOpenSlot = computed(() => openSlotIndex.value !== null);

const handleUnlock = async () => {
    if (!skill.value) return;
    await unlockSkill(skill.value.skillId);
    open.value = false;
};

const handleStrengthen = async () => {
    if (!skill.value || !skill.value.fragmentCount || fragmentsToSpend.value <= 0) return;
    const skillId = skill.value.skillId;
    const amount = Math.min(fragmentsToSpend.value, skill.value.fragmentCount);
    const success = await strengthenSkill(skillId, amount);
    if (!success) return;
    // strengthenSkill 內部已經 fetchSkills() 過一輪最新資料，把 dialog 顯示的
    // skill.value 換成重新整理後的版本，讓玩家能連續強化、即時看到新等級/效果，
    // 不需要關閉重開。
    const updated = skills.value.find(entry => entry.skillId === skillId);
    if (updated) skill.value = updated;
    fragmentsToSpend.value = 0;
};

const handleEquip = async () => {
    if (!skill.value || openSlotIndex.value === null) return;
    await equipSkill(skill.value.skillId, openSlotIndex.value);
    open.value = false;
};

const handleUnequip = async () => {
    if (!skill.value) return;
    const slotIndex = props.equippedSkillIds.findIndex(id => id === skill.value?.skillId);
    if (slotIndex === -1) return;
    await equipSkill(null, slotIndex as 0 | 1 | 2);
    open.value = false;
};

defineExpose({
    open: (target: SkillEntry) => {
        skill.value = target;
        fragmentsToSpend.value = 0;
        open.value = true;
    },
});
</script>

<style scoped lang="scss">
.skill-dialog {
    &__icon {
        width: 48px;
        height: 48px;
        flex: 0 0 auto;
        background: #14171c;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
    }

    &__box {
        padding: 8px 10px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;

        &--preview {
            background: rgba(var(--v-theme-primary), 0.06);
            border-color: rgba(var(--v-theme-primary), 0.3);
        }
    }

    &__bar {
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

    &__stepper-btn {
        min-width: 36px !important;
        padding: 0 !important;
    }

    // 升級效果預覽的「變動後數值」：比一般文字更粗、換色，讓玩家一眼看出強化
    // 後會變成多少（使用者要求：讓文字更明顯一點）。
    &__preview-value {
        font-weight: 700;
        color: rgb(var(--v-theme-green));
    }
}
</style>
