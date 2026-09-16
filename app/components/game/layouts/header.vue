<template>
    <div class="game-header d-flex align-center justify-space-between px-4">
        <div class="d-flex align-center ga-2">
            <v-icon
                icon="mdi-robot"
                size="18"
                color="primary"
            />
            <span class="font-pixel text-caption game-header__wordmark">GKBOT</span>
        </div>

        <button
            type="button"
            class="game-header__config d-flex align-center justify-center pixel-press"
            aria-label="開啟設定選單"
            @click="$emit('open-drawer')"
        >
            <v-icon
                icon="mdi-cog-outline"
                size="20"
                color="primary"
            />
        </button>
    </div>
</template>

<script setup lang="ts">
defineEmits<{ 'open-drawer': [] }>();
</script>

<style scoped lang="scss">
.game-header {
    flex: 0 0 auto;
    height: 44px;
    border-bottom: 1px solid rgba(196, 203, 219, 0.12);

    &__wordmark {
        letter-spacing: 0.08em;
        color: rgb(var(--v-theme-primary));
        opacity: 0.85;
    }

    &__config {
        width: 34px;
        height: 34px;
        background: none;
        border: none;
        cursor: pointer;

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }
}
</style>
