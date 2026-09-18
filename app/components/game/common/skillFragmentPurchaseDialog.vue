<template>
    <GameCommonDialogFrame
        v-model="open"
        max-width="300"
        content-class="skill-fragment-purchase-dialog"
    >
        <template v-if="result">
            <div class="skill-fragment-purchase-dialog__title font-pixel text-caption text-center mb-3">
                取得技能碎片
            </div>

            <div class="d-flex flex-column align-center mb-3">
                <div class="skill-fragment-purchase-dialog__icon d-flex align-center justify-center mb-2">
                    <GameCommonPixelIcon
                        :name="(result.icon as PixelIconName)"
                        :size="36"
                    />
                </div>
                <div class="font-pixel text-body-1 mb-1">{{ result.name }}</div>
                <div class="text-body-2" style="color: rgb(var(--v-theme-primary));">
                    +{{ result.amount }} 碎片
                </div>
            </div>

            <SystemBtn
                block
                variant="flat"
                color="primary"
                class="text-none"
                @click="open = false"
            >
                太好了
            </SystemBtn>
        </template>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
import type { PixelIconName } from '../../../utils/pixelIcons';

type SkillFragmentResult = { skillId: string; amount: number; name: string; icon: string };

const open = ref(false);
const result = ref<SkillFragmentResult | null>(null);

defineExpose({
    open: (target: SkillFragmentResult) => {
        result.value = target;
        open.value = true;
    },
});
</script>

<style scoped lang="scss">
.skill-fragment-purchase-dialog {
    &__title {
        color: rgb(var(--v-theme-secondary));
    }

    &__icon {
        width: 56px;
        height: 56px;
        background: #14171c;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
    }
}
</style>
