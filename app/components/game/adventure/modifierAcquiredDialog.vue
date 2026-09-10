<template>
    <GameCommonDialogFrame
        :model-value="!!modifier"
        persistent
        :scrim="false"
        content-class="modifier-acquired-dialog"
    >
        <template v-if="modifier">
            <img
                :src="modifier.isBlessing ? '/images/combat-fx/buff-spark.png' : '/images/combat-fx/debuff-spark.png'"
                alt=""
                class="modifier-acquired-dialog__spark"
            >
            <div
                class="font-pixel text-subtitle-2 mb-1"
                :style="{ color: modifier.isBlessing ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
            >
                {{ modifier.isBlessing ? '獲得祝福' : '遭受詛咒' }}
            </div>
            <div class="text-body-1 mb-1">
                {{ modifier.name }}
            </div>
            <div class="text-caption text-medium-emphasis mb-1">
                {{ modifier.description }}
            </div>
            <div
                v-if="effectText"
                class="text-caption font-pixel mb-3"
                :style="{ color: modifier.isBlessing ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
            >
                {{ effectText }}
            </div>

            <!-- 行內對話呈現：這個 dialog 置中顯示時會蓋住玩家 stage 上的對話氣泡
                 （見使用者實測：獲得祝福時氣泡幾乎被這個 dialog 完全遮蔽），沿用
                 同一份 useDialogueBubble 狀態，換一個一定看得到的位置（比照
                 eventResultDialog.vue 的做法，見 tasks.md 5.1）。 -->
            <div
                v-if="playerDialogueText"
                class="text-caption text-center font-pixel modifier-acquired-dialog__dialogue"
            >
                「{{ playerDialogueText }}」
            </div>
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import type { RunModifier } from '../../../../shared/types/adventure';
import { useDialogueBubble } from '../../../composables/useDialogueBubble';

defineProps<{ modifier: RunModifier | null; effectText?: string }>();

const { bubbles: dialogueBubbles } = useDialogueBubble();
const playerDialogueText = computed(() => dialogueBubbles.get('player')?.text ?? null);
</script>

<style scoped lang="scss">
.modifier-acquired-dialog {
    &__spark {
        width: 56px;
        height: 56px;
        margin-bottom: 4px;
        image-rendering: pixelated;
        animation: modifier-acquired-dialog-spark-pop 0.5s ease-out;
    }

    &__dialogue {
        color: rgba(255, 255, 255, 0.75);
    }
}

@keyframes modifier-acquired-dialog-spark-pop {
    0% {
        opacity: 0;
        transform: scale(0.4);
    }
    60% {
        opacity: 1;
        transform: scale(1.1);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
}
</style>

<style lang="scss">
// content-class 是傳給 GameCommonDialogFrame 的字串 prop，套用該 class 的外層
// <div> 是在 dialogFrame.vue 的 template 裡渲染，只會帶 dialogFrame.vue 自己的
// scoped 屬性，這裡（modifierAcquiredDialog.vue）的 scoped style 選不到它
// （見使用者回報 #3：dialog 內容沒有置中）。置中規則因此需要放在非 scoped
// block，比照 dialogFrame.vue 自己對 --contained-fullscreen 的做法。
.modifier-acquired-dialog {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}
</style>
