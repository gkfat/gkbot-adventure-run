<template>
    <img
        :src="`/images/pixel-icons/${name}.png`"
        :width="size"
        :height="size"
        :alt="name"
        class="pixel-icon"
    >
</template>

<script setup lang="ts">
import type { PixelIconName } from '../../../utils/pixelIcons';

withDefaults(defineProps<{
    name: PixelIconName;
    size?: number;
}>(), { size: 28 });
</script>

<style scoped>
.pixel-icon {
    image-rendering: pixelated;
    display: block;
}
</style>
