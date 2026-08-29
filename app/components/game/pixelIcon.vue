<template>
    <svg
        :width="size"
        :height="size"
        viewBox="0 0 12 12"
        shape-rendering="crispEdges"
        class="pixel-icon"
        role="img"
        :aria-label="name"
    >
        <rect
            v-for="(px, index) in pixels"
            :key="index"
            :x="px.x"
            :y="px.y"
            width="1"
            height="1"
            :fill="px.color"
        />
    </svg>
</template>

<script setup lang="ts">
import {
    PIXEL_ICON_GRIDS, type PixelIconName,
} from '../../utils/pixelIcons';

const props = withDefaults(defineProps<{
    name: PixelIconName;
    size?: number;
}>(), { size: 28 });

const pixels = computed(() => {
    const grid = PIXEL_ICON_GRIDS[props.name];
    const result: { x: number; y: number; color: string }[] = [];

    grid.rows.forEach((row, y) => {
        [...row].forEach((char, x) => {
            const color = grid.colors[char];
            if (color) {
                result.push({
                    x, y, color,
                });
            }
        });
    });

    return result;
});
</script>

<style scoped>
.pixel-icon {
    image-rendering: pixelated;
    display: block;
}
</style>
