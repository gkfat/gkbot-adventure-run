<template>
    <div
        v-if="loaded"
        class="d-flex justify-center ga-3"
    >
        <button
            v-for="(slot, index) in slots"
            :key="index"
            type="button"
            class="equipped-skill-slot pixel-press d-flex align-center justify-center"
            :aria-label="slot ? `${slot.name}（Lv.${slot.level}），點擊查看角色技能` : '尚未裝配技能，點擊前往角色技能頁'"
            @click="goToSkillTab"
        >
            <template v-if="slot">
                <GameCommonPixelIcon
                    :name="(slot.icon as PixelIconName)"
                    :size="32"
                />
                <span class="equipped-skill-slot__value font-pixel">
                    Lv.{{ slot.level }}
                </span>
            </template>
            <span
                v-else
                class="equipped-skill-slot__empty text-caption text-medium-emphasis"
            >
                未裝配
            </span>
        </button>
    </div>
</template>

<script setup lang="ts">
import type { PixelIconName } from '../../../utils/pixelIcons';

// 主畫面裝備欄下方顯示目前的 3 個技能欄位（含未裝配）——與角色頁「技能」
// tab 共用同一份 useCharacterSkills 狀態，這裡只負責唯讀呈現，點擊任一欄位
// 跳轉到角色頁並直接開啟技能 tab（見 inventory.vue 的 route.query.tab）。
const {
    skills, equippedSkillIds, loaded, fetchSkills,
} = useCharacterSkills();

const slots = computed(() => (
    equippedSkillIds.value.map(id => (id ? skills.value.find(skill => skill.skillId === id) ?? null : null))
));

onMounted(() => {
    if (!loaded.value) fetchSkills();
});

const goToSkillTab = () => navigateTo('/inventory?tab=SKILL');
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
    cursor: pointer;

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

    &__empty {
        line-height: 1.2;
        text-align: center;
        opacity: 0.6;
    }
}
</style>
