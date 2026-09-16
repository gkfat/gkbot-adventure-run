<template>
    <div class="chapter-progress">
        <div class="font-title chapter-progress__title">
            {{ stageName }}
        </div>
        <div class="chapter-progress__meta">
            <div class="chapter-progress__nodes">
                <span
                    v-for="n in levelTotal"
                    :key="n"
                    class="chapter-progress__node"
                    :class="{
                        'chapter-progress__node--lit': n < levelIndex,
                        'chapter-progress__node--current': n === levelIndex,
                    }"
                />
            </div>
            <span class="font-pixel chapter-progress__count">{{ levelIndex }}/{{ levelTotal }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    stageName: string;
    levelIndex: number;
    levelTotal: number;
}>();
</script>

<style scoped lang="scss">
.chapter-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: fit-content;
    max-width: 280px;
    padding: 8px 18px;

    &__title {
        color: #ffd166;
        font-size: 20px;
        letter-spacing: 2px;
        text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.85), 0 0 10px rgba(255, 209, 102, 0.35);
    }

    &__meta {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    &__nodes {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 5px;
    }

    &__node {
        width: 9px;
        height: 9px;
        flex-shrink: 0;
        background: rgba(196, 203, 219, 0.12);
        border: 1px solid rgba(196, 203, 219, 0.35);
        image-rendering: pixelated;

        &--lit {
            background: #81b29a;
            border-color: #81b29a;
            box-shadow: 0 0 4px rgba(129, 178, 154, 0.7);
        }

        &--current {
            background: #ffd166;
            border-color: #ffd166;
            box-shadow: 0 0 5px rgba(255, 209, 102, 0.85);
        }
    }

    &__count {
        color: rgb(var(--v-theme-primary));
        font-size: 10px;
        opacity: 0.85;
    }
}
</style>
