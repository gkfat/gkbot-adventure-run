<template>
    <div class="character-stage__box skill-slot-panel mb-3">
        <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-medium-emphasis">佩戴欄位</span>
            <span class="text-caption font-pixel" style="color: rgb(var(--v-theme-primary));">
                {{ unlockedSlotCount }} / 3
            </span>
        </div>
        <div class="d-flex ga-2">
            <div
                v-for="index in [0, 1, 2]"
                :key="index"
                class="d-flex flex-column align-center flex-grow-0 flex-shrink-0"
            >
                <button
                    type="button"
                    class="skill-slot-panel__slot d-flex align-center justify-center pixel-press"
                    :class="{ 'skill-slot-panel__slot--locked': index >= unlockedSlotCount }"
                    :disabled="index >= unlockedSlotCount"
                    :aria-label="slotLabel(index)"
                    @click="handleClick(index)"
                >
                    <template v-if="index >= unlockedSlotCount">
                        <v-icon icon="mdi-lock-outline" size="20" />
                    </template>
                    <template v-else-if="skillByIndex(index)">
                        <GameCommonPixelIcon
                            :name="(skillByIndex(index)!.icon as PixelIconName)"
                            :size="30"
                        />
                    </template>
                    <template v-else>
                        <v-icon
                            icon="mdi-plus"
                            size="20"
                            style="opacity: 0.4;"
                        />
                    </template>
                </button>
                <span class="skill-slot-panel__label text-caption text-medium-emphasis">
                    {{ index >= unlockedSlotCount ? `Lv.${slotRequiredLevel(index)} 開放` : (skillByIndex(index)?.name ?? '空') }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { SkillEntry } from '../../../composables/useCharacterSkills';
import type { PixelIconName } from '../../../utils/pixelIcons';
import { SKILL_SLOT_LEVEL_INTERVAL } from '../../../../shared/constants/skills';

const props = defineProps<{
    skills: SkillEntry[];
    equippedSkillIds: (string | null)[];
    unlockedSlotCount: number;
}>();

const emit = defineEmits<{ select: [skill: SkillEntry] }>();

const skillByIndex = (index: number): SkillEntry | undefined => {
    const skillId = props.equippedSkillIds[index];
    if (!skillId) return undefined;
    return props.skills.find(skill => skill.skillId === skillId);
};

// 每個欄位索引對應的開放等級——0-based index，第 0 格從 Lv.1 就開放，第 N 格
// 需要角色等級達到 N * SKILL_SLOT_LEVEL_INTERVAL（見 shared/constants/skills.ts
// getUnlockedSkillSlotCount 的公式，這裡是它的反推）。
const slotRequiredLevel = (index: number): number => index * SKILL_SLOT_LEVEL_INTERVAL;

const slotLabel = (index: number): string => {
    if (index >= props.unlockedSlotCount) return `佩戴欄位 ${index + 1}：Lv.${slotRequiredLevel(index)} 開放`;
    const skill = skillByIndex(index);
    return skill ? `佩戴欄位 ${index + 1}：${skill.name}` : `佩戴欄位 ${index + 1}：空`;
};

const handleClick = (index: number) => {
    if (index >= props.unlockedSlotCount) return;
    const skill = skillByIndex(index);
    if (skill) emit('select', skill);
};
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

.skill-slot-panel {
    &__slot {
        width: 48px;
        height: 48px;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        background: #14171c;
        color: rgb(var(--v-theme-primary));
        cursor: pointer;
        transition: transform 0.06s ease-out;

        &:hover:not(:disabled) {
            transform: translateY(-1px);
        }

        &--locked {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }

    &__label {
        margin-top: 4px;
        font-size: 10px;
        line-height: 1;
        max-width: 56px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>
