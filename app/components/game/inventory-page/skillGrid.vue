<template>
    <v-row
        v-if="visibleSkills.length > 0"
        dense
    >
        <v-col
            v-for="skill in visibleSkills"
            :key="skill.skillId"
            cols="3"
        >
            <button
                type="button"
                class="pixel-slot pixel-slot--skill d-flex align-center justify-center pixel-press"
                :class="{ 'pixel-slot--locked': !skill.unlocked, 'pixel-slot--equipped': skill.isEquipped }"
                @click="emit('select', skill)"
            >
                <div
                    v-if="skill.unlocked"
                    class="pixel-slot__star font-pixel"
                >
                    {{ '★'.repeat(skill.star ?? 1) }}
                </div>

                <GameCommonPixelIcon
                    :name="(skill.icon as PixelIconName)"
                    :size="40"
                    :class="{ 'pixel-slot__icon--lit': skill.unlocked }"
                />
                <span
                    v-if="skill.unlocked"
                    class="pixel-slot__value font-pixel"
                >
                    Lv.{{ skill.level }}
                </span>
                <span
                    v-else
                    class="pixel-slot__value pixel-slot__value--fragment font-pixel"
                >
                    {{ skill.fragmentCount ?? 0 }}/{{ skill.unlockFragmentCost }}
                </span>

                <div
                    v-if="skill.isEquipped"
                    class="pixel-slot__equipped-badge bg-green"
                    aria-label="佩戴中"
                >
                    <v-icon
                        icon="mdi-check-bold"
                        size="14"
                        color="black"
                    />
                </div>

                <span
                    v-if="canProgress(skill)"
                    class="pixel-slot__dot-badge"
                    :aria-label="skill.unlocked ? '可強化升級' : '可解鎖'"
                />
            </button>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import type { SkillEntry } from '../../../composables/useCharacterSkills';
import type { PixelIconName } from '../../../utils/pixelIcons';
import {
    SKILL_MAX_LEVEL, SKILL_STAR_MAX, SKILL_STAR_UP_FRAGMENT_COST,
} from '../../../../shared/constants/skills';

const props = defineProps<{ skills: SkillEntry[] }>();
const emit = defineEmits<{ select: [skill: SkillEntry] }>();

// 尚未取得任何碎片、也未解鎖的技能不顯示——避免玩家還沒摸到邊的技能塞滿格狀清單。
const visibleSkills = computed(() => (
    props.skills.filter(skill => skill.unlocked || (skill.fragmentCount ?? 0) > 0)
));

// 尚未解鎖：碎片已達門檻，可解鎖；已解鎖且 Lv.10：碎片已達下一星等門檻，可升星。
const canProgress = (skill: SkillEntry): boolean => {
    const fragmentCount = skill.fragmentCount ?? 0;
    if (!skill.unlocked) return fragmentCount >= skill.unlockFragmentCost;

    const star = skill.star ?? 1;
    if ((skill.level ?? 1) < SKILL_MAX_LEVEL || star >= SKILL_STAR_MAX) return false;
    const cost = SKILL_STAR_UP_FRAGMENT_COST[star + 1] ?? Infinity;
    return fragmentCount >= cost;
};
</script>

<style scoped lang="scss">
.pixel-slot {
    position: relative;
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

    &--skill {
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

    &--locked {
        opacity: 0.55;
    }

    &--equipped {
        &::before,
        &::after {
            border-color: rgb(var(--v-theme-green));
            opacity: 1;
        }
    }

    &__value {
        font-size: 9px;

        &--fragment {
            color: rgba(196, 203, 219, 0.7);
        }
    }

    &__icon--lit {
        filter: brightness(1.35) drop-shadow(0 0 4px rgba(var(--v-theme-primary), 0.65));
    }

    &__star {
        position: absolute;
        top: 3px;
        right: 3px;
        z-index: 1;
        display: flex;
        align-items: center;
        height: 12px;
        padding: 0 3px;
        font-size: 8px;
        line-height: 1;
        color: rgb(var(--v-theme-secondary));
        white-space: nowrap;
    }

    &__equipped-badge {
        position: absolute;
        bottom: -5px;
        right: -5px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
        background: #14171c;
        border: 1.5px solid rgb(var(--v-theme-green));
        border-radius: 50%;
        pointer-events: none;
    }

    &__dot-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgb(var(--v-theme-error));
        border: 1.5px solid rgb(var(--v-theme-background));
        animation: skill-grid-badge-pulse 1.4s ease-in-out infinite;
    }
}

@keyframes skill-grid-badge-pulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.15);
    }
}
</style>
