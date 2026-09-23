<template>
    <GameCommonDialogFrame
        :model-value="modelValue"
        max-width="320"
        content-class="audio-settings-dialog"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <div class="font-pixel text-subtitle-1 mb-3" style="color: rgb(var(--v-theme-primary));">
            音效設定
        </div>

        <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-body-2">背景音樂</span>
            <button
                type="button"
                class="audio-settings-dialog__toggle"
                :class="{ 'audio-settings-dialog__toggle--off': !bgmEnabled }"
                :aria-pressed="bgmEnabled"
                aria-label="切換背景音樂"
                @click="toggleBgm"
            >
                <GameCommonPixelIcon
                    :name="bgmEnabled ? 'confirm' : 'cancel'"
                    :size="18"
                />
            </button>
        </div>

        <div class="d-flex align-center justify-space-between">
            <span class="text-body-2">音效</span>
            <button
                type="button"
                class="audio-settings-dialog__toggle"
                :class="{ 'audio-settings-dialog__toggle--off': !sfxEnabled }"
                :aria-pressed="sfxEnabled"
                aria-label="切換音效"
                @click="toggleSfx"
            >
                <GameCommonPixelIcon
                    :name="sfxEnabled ? 'confirm' : 'cancel'"
                    :size="18"
                />
            </button>
        </div>

        <div
            v-if="error"
            class="text-body-2 mt-3"
            style="color: rgb(var(--v-theme-warning));"
        >
            {{ error }}
        </div>

        <SystemBtn
            block
            variant="outlined"
            color="primary"
            class="text-none mt-3"
            @click="emit('update:modelValue', false)"
        >
            關閉
        </SystemBtn>
    </GameCommonDialogFrame>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const {
    bgmEnabled, sfxEnabled, error, toggleBgm, toggleSfx,
} = useAudio();
</script>

<style scoped lang="scss">
// 像素風格開關按鈕：開啟顯示綠色勾選格、關閉顯示暗色叉叉格，
// 取代 Vuetify 預設 v-switch 以符合整體像素 UI 風格。
.audio-settings-dialog__toggle {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #14171c;
    border: 1px solid rgb(var(--v-theme-primary));
    border-radius: 3px;
    cursor: pointer;
    padding: 0;
    transition: border-color 0.08s ease-out, background-color 0.08s ease-out;

    &--off {
        border-color: rgba(196, 203, 219, 0.3);
        background: #0e1015;
    }
}
</style>
