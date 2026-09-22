<template>
    <div
        v-if="equippedSkills.length > 0"
        class="d-flex justify-center ga-3"
    >
        <div
            v-for="skill in equippedSkills"
            :key="skill.skillId"
            class="equipped-skill-slot d-flex align-center justify-center"
            :aria-label="`${skill.name}（Lv.${skill.level}）`"
        >
            <GameCommonPixelIcon
                :name="(skill.icon as PixelIconName)"
                :size="32"
            />
            <span class="equipped-skill-slot__value font-pixel">
                Lv.{{ skill.level }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PixelIconName } from '../../../utils/pixelIcons';

// 主畫面裝備欄下方顯示目前佩戴中的技能（character-skills）——與角色頁「技能」
// tab 共用同一份 useCharacterSkills 狀態，這裡只負責唯讀呈現，不提供互動。
const {
    skills, equippedSkillIds, loaded, fetchSkills,
} = useCharacterSkills();

const equippedSkills = computed(() => (
    equippedSkillIds.value
        .filter((id): id is string => id !== null)
        .map(id => skills.value.find(skill => skill.skillId === id))
        .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
));

onMounted(() => {
    if (!loaded.value) fetchSkills();
});
</script>

<style scoped lang="scss">
.equipped-skill-slot {
    position: relative;
    width: 48px;
    height: 48px;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 2px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 2px 0 0 rgba(0, 0, 0, 0.5);

    &__value {
        position: absolute;
        bottom: -9px;
        left: 50%;
        transform: translateX(-50%);
        padding: 0 3px;
        font-size: 9px;
        line-height: 1.3;
        color: rgb(var(--v-theme-primary));
        background: #14171c;
        white-space: nowrap;
    }
}
</style>
