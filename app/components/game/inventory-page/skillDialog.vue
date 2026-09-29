<template>
    <GameCommonDialogFrame
        v-model="open"
        :max-width="360"
        content-class="skill-dialog"
    >
        <template v-if="skill">
            <div
                v-if="skill.unlocked && skill.isEquipped"
                class="skill-dialog__equipped-badge font-pixel"
            >
                佩戴中
            </div>

            <div class="d-flex align-center ga-3 mb-3">
                <div class="skill-dialog__icon d-flex align-center justify-center">
                    <GameCommonPixelIcon
                        :name="pixelIconName"
                        :size="32"
                    />
                </div>
                <div>
                    <div class="d-flex align-center ga-2">
                        <span class="font-pixel text-body-1">{{ skill.name }}</span>
                        <span
                            v-if="skill.unlocked"
                            class="text-caption font-pixel"
                            style="color: rgb(var(--v-theme-secondary));"
                        >
                            {{ '★'.repeat(skill.star ?? 1) }}
                        </span>
                    </div>
                    <div
                        v-if="skill.unlocked"
                        class="font-pixel skill-dialog__level"
                        style="color: rgb(var(--v-theme-primary));"
                    >
                        Lv.{{ skill.level }}<span class="skill-dialog__level-max">/{{ SKILL_MAX_LEVEL }}</span>
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

            <!-- 效果：選到足夠升級的晶片數時，下方以醒目數字顯示升級後結果供比較 -->
            <div
                v-if="skill.unlocked && skill.effect"
                class="skill-dialog__box skill-dialog__box--effect mb-3"
            >
                <div class="text-caption text-medium-emphasis mb-1">效果</div>
                <div class="d-flex align-center justify-space-between ga-2">
                    <span class="text-body-2">{{ describeSkillEffect(skill.effect) }}</span>
                    <span
                        v-if="willLevelUp && previewEffect"
                        class="skill-dialog__preview-value font-pixel flex-shrink-0"
                    >
                        → {{ previewDiffParts ? previewDiffParts.to : describeSkillEffect(previewEffect) }}
                    </span>
                </div>
            </div>

            <!-- 成長進度：等級經驗值與升星碎片並列成兩條進度，同一種讀法 -->
            <div
                v-if="skill.unlocked"
                class="skill-dialog__box mb-3"
            >
                <div class="mb-3">
                    <template v-if="skill.level != null && skill.level < SKILL_MAX_LEVEL">
                        <div class="d-flex align-center justify-space-between mb-1">
                            <span class="text-caption text-medium-emphasis">升至 Lv.{{ previewLevel + 1 }} 經驗值</span>
                            <span class="text-caption font-pixel">{{ expIntoLevel }} / {{ expForNextLevel }}</span>
                        </div>
                        <div class="skill-dialog__bar">
                            <div
                                class="skill-dialog__bar-fill"
                                :style="{ width: `${expPercent}%` }"
                            />
                        </div>
                    </template>
                    <div
                        v-else
                        class="text-caption"
                        style="color: rgb(var(--v-theme-green));"
                    >
                        已達最高等級
                    </div>
                </div>

                <!-- 升星碎片（已解鎖即顯示）；升星按鈕仍需 Lv.10 才會出現 -->
                <template v-if="(skill.star ?? 1) < SKILL_STAR_MAX">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">
                            升至 ★{{ (skill.star ?? 1) + 1 }} 碎片
                        </span>
                        <span class="text-caption font-pixel">
                            {{ skill.fragmentCount ?? 0 }} / {{ nextStarFragmentCost }}
                        </span>
                    </div>
                    <div class="skill-dialog__bar">
                        <div
                            class="skill-dialog__bar-fill skill-dialog__bar-fill--fragment"
                            :style="{ width: `${fragmentPercent}%` }"
                        />
                    </div>
                </template>
                <div
                    v-else
                    class="text-caption"
                    style="color: rgb(var(--v-theme-green));"
                >
                    已達最高星等
                </div>
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
                v-else-if="skill.level != null && skill.level < SKILL_MAX_LEVEL && chipCount > 0"
                class="skill-dialog__box mb-3"
            >
                <div class="text-caption text-medium-emphasis mb-2">技能經驗值晶片（持有 {{ chipCount }}）</div>
                <div class="d-flex align-center justify-center ga-2 mb-2">
                    <SystemBtn
                        variant="outlined"
                        color="primary"
                        size="small"
                        class="text-none"
                        :disabled="chipsToSpend <= 0"
                        @click="chipsToSpend = 0"
                    >
                        MIN
                    </SystemBtn>
                    <SystemBtn
                        size="small"
                        variant="outlined"
                        color="primary"
                        class="skill-dialog__stepper-btn"
                        :disabled="chipsToSpend <= 0"
                        @click="chipsToSpend = Math.max(0, chipsToSpend - 1)"
                    >
                        <v-icon icon="mdi-minus" size="16" />
                    </SystemBtn>
                    <span class="skill-dialog__count font-pixel text-body-2">
                        {{ chipsToSpend }} / {{ chipCount }}
                    </span>
                    <SystemBtn
                        size="small"
                        variant="outlined"
                        color="primary"
                        class="skill-dialog__stepper-btn"
                        :disabled="chipsToSpend >= chipCount"
                        @click="chipsToSpend = Math.min(chipCount, chipsToSpend + 1)"
                    >
                        <v-icon icon="mdi-plus" size="16" />
                    </SystemBtn>
                    <SystemBtn
                        variant="outlined"
                        color="primary"
                        size="small"
                        class="text-none"
                        @click="chipsToSpend = chipCount"
                    >
                        MAX
                    </SystemBtn>
                </div>
                <SystemBtn
                    block
                    variant="flat"
                    color="primary"
                    class="text-none"
                    :disabled="chipsToSpend === 0"
                    :loading="actionLoading"
                    @click="handleUseChip"
                >
                    使用晶片升級
                </SystemBtn>
            </div>

            <SystemBtn
                v-if="skill.unlocked && skill.level === SKILL_MAX_LEVEL && (skill.star ?? 1) < SKILL_STAR_MAX"
                block
                variant="flat"
                color="primary"
                class="text-none mb-3"
                :disabled="(skill.fragmentCount ?? 0) < nextStarFragmentCost"
                :loading="actionLoading"
                @click="handleStarUp"
            >
                消耗碎片升星
            </SystemBtn>

            <v-row dense>
                <v-col v-if="skill.unlocked" cols="6">
                    <SystemBtn
                        v-if="!skill.isEquipped"
                        block
                        variant="flat"
                        color="green"
                        class="text-none"
                        :disabled="!hasOpenSlot"
                        :loading="actionLoading"
                        @click="handleEquip"
                    >
                        {{ hasOpenSlot ? '佩戴' : '欄位已滿' }}
                    </SystemBtn>
                    <SystemBtn
                        v-else
                        block
                        variant="outlined"
                        color="warning"
                        class="text-none"
                        :loading="actionLoading"
                        @click="handleUnequip"
                    >
                        卸下
                    </SystemBtn>
                </v-col>
                <v-col :cols="skill.unlocked ? 6 : 12">
                    <SystemBtn
                        block
                        variant="outlined"
                        color="primary"
                        class="text-none"
                        @click="open = false"
                    >
                        關閉
                    </SystemBtn>
                </v-col>
            </v-row>
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import type { SkillEntry } from '../../../composables/useCharacterSkills';
import { describeSkillEffect, describeSkillEffectDiffParts } from '../../../utils/skillDisplay';
import type { PixelIconName } from '../../../utils/pixelIcons';
import {
    SKILL_MAX_LEVEL, SKILL_STAR_MAX, SKILL_STAR_UP_FRAGMENT_COST, SKILL_EXP_TABLE, SKILL_EXP_PER_CHIP, getSkillLevelForExp,
} from '../../../../shared/constants/skills';
import { applyStarBonus } from '../../../../shared/constants/characterSkills';

const props = defineProps<{
    equippedSkillIds: (string | null)[];
    unlockedSlotCount: number;
}>();

const {
    skills, unlockSkill, starUpSkill, useSkillExpChip, equipSkill, actionLoading, actionError,
} = useCharacterSkills();
const { items: inventoryItems } = useInventory();
const { playSfx } = useAudio();

const open = ref(false);
const skill = ref<SkillEntry | null>(null);
// 升級改成可選擇消耗幾顆技能經驗值晶片，預設 0（比照舊版碎片強化的互動慣例：
// 預設不選任何晶片，改由玩家自己選擇要消耗多少），而不是強制一次全部投入。
const chipsToSpend = ref(0);

const pixelIconName = computed(() => (skill.value?.icon ?? 'mysteryCapsule') as PixelIconName);

// 目前角色背包內持有的技能經驗值晶片數量/itemId 清單——晶片不綁定特定
// skillId，任何一顆都能用於任何技能的升級。
const chipItemIds = computed(() => inventoryItems.value.filter(item => item.templateId === 'skill_exp_chip').map(item => item.itemId));
const chipCount = computed(() => chipItemIds.value.length);

const nextStarFragmentCost = computed(() => SKILL_STAR_UP_FRAGMENT_COST[(skill.value?.star ?? 1) + 1] ?? Infinity);

// 選擇晶片後預估落在哪一級（用同一套 exp 換算邏輯 getSkillLevelForExp，跟
// 後端 useSkillExpChip 的判斷共用同一份 shared 常數）——下面經驗值條/預覽 panel
// 都以這個「預估等級」為準，選到的晶片數超過一個等級的門檻時會連續往後推算
// 多級，而不是卡在目前等級的區間就不動。
const previewLevel = computed(() => {
    if (!skill.value?.level || skill.value.exp == null) return skill.value?.level ?? 1;
    const previewExp = skill.value.exp + chipsToSpend.value * SKILL_EXP_PER_CHIP;
    return Math.min(SKILL_MAX_LEVEL, getSkillLevelForExp(previewExp));
});

// 經驗值條隨加減晶片即時預覽：分母/分子都改用 previewLevel 的區間計算，足以
// 升級時會自動換算成「下一等級的經驗值累積」，而不是停留在原本等級的區間封頂
// 不動。chipsToSpend 為 0 時 previewLevel 等於目前等級，行為跟未選晶片時一致。
const expIntoLevel = computed(() => {
    if (!skill.value?.level || skill.value.exp == null) return 0;
    const currentThreshold = SKILL_EXP_TABLE[previewLevel.value] ?? 0;
    const previewExp = skill.value.exp + chipsToSpend.value * SKILL_EXP_PER_CHIP;
    return Math.max(0, Math.min(previewExp - currentThreshold, expForNextLevel.value));
});
const expForNextLevel = computed(() => {
    const level = previewLevel.value;
    if (!level) return 1;
    const currentThreshold = SKILL_EXP_TABLE[level] ?? 0;
    const nextThreshold = level < SKILL_MAX_LEVEL ? (SKILL_EXP_TABLE[level + 1] ?? currentThreshold) : currentThreshold;
    return Math.max(1, nextThreshold - currentThreshold);
});
const fragmentPercent = computed(() => (nextStarFragmentCost.value === Infinity ? 100 : Math.min(100, Math.round(((skill.value?.fragmentCount ?? 0) / nextStarFragmentCost.value) * 100))));
const expPercent = computed(() => Math.min(100, Math.round((expIntoLevel.value / expForNextLevel.value) * 100)));
const willLevelUp = computed(() => Boolean(skill.value?.level) && previewLevel.value > skill.value!.level!);
// previewLevel 對應等級的實際效果數值，取自 effectByLevel（Lv.1 對應 index 0），
// 套用與目前星等相同的加成比例，才能跟 skill.effect（伺服器已套用星等加成後
// 的目前生效數值）做公平比較。
const previewEffect = computed(() => {
    const base = skill.value?.effectByLevel?.[previewLevel.value - 1];
    if (!base) return undefined;
    return applyStarBonus(base, skill.value?.star ?? 1);
});
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
    const success = await unlockSkill(skill.value.skillId);
    if (success) playSfx('exploreStart.mp3');
    open.value = false;
};

const handleUseChip = async () => {
    if (!skill.value || chipsToSpend.value <= 0) return;
    const skillId = skill.value.skillId;
    const itemIds = chipItemIds.value.slice(0, chipsToSpend.value);
    const success = await useSkillExpChip(skillId, itemIds);
    if (!success) return;
    playSfx('exploreStart.mp3');
    // useSkillExpChip 內部已經 fetchSkills() 過一輪最新資料，把 dialog 顯示的
    // skill.value 換成重新整理後的版本，讓玩家能連續升級、即時看到新等級/效果，
    // 不需要關閉重開。
    const updated = skills.value.find(entry => entry.skillId === skillId);
    if (updated) skill.value = updated;
    chipsToSpend.value = 0;
};

const handleStarUp = async () => {
    if (!skill.value) return;
    const skillId = skill.value.skillId;
    const success = await starUpSkill(skillId);
    if (!success) return;
    playSfx('exploreStart.mp3');
    const updated = skills.value.find(entry => entry.skillId === skillId);
    if (updated) skill.value = updated;
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
        chipsToSpend.value = 0;
        open.value = true;
    },
});
</script>

<style scoped lang="scss">
.skill-dialog {
    position: relative;

    &__equipped-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        z-index: 2;
        padding: 2px 8px;
        font-size: 10px;
        line-height: 1.6;
        white-space: nowrap;
        color: #14171c;
        background: rgb(var(--v-theme-green));
        border-radius: 2px;
    }

    &__icon {
        width: 48px;
        height: 48px;
        flex: 0 0 auto;
        background: #14171c;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
    }

    &__level {
        font-size: 20px;
        font-weight: 700;
        line-height: 1.3;
    }

    &__level-max {
        font-size: 12px;
        opacity: 0.6;
    }

    &__box {
        padding: 8px 10px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }

    &__box--effect {
        border-color: rgba(var(--v-theme-primary), 0.3);
        background: rgba(var(--v-theme-primary), 0.06);
    }

    &__count {
        min-width: 64px;
        text-align: center;
        white-space: nowrap;
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

    &__bar-fill--fragment {
        background: rgb(var(--v-theme-secondary));
    }

    &__stepper-btn {
        min-width: 36px !important;
        padding: 0 !important;
    }

    // 升級效果預覽的「變動後數值」：比一般文字更粗、換色，讓玩家一眼看出強化
    // 後會變成多少（使用者要求：讓文字更明顯一點）。
    &__preview-value {
        font-size: 16px;
        font-weight: 700;
        color: rgb(var(--v-theme-green));
    }
}
</style>
