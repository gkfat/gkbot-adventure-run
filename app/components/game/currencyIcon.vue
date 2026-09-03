<template>
    <img
        :src="type === 'GOLD' ? '/images/pixel-icons/gold.svg' : '/images/pixel-icons/ruby.svg'"
        :width="size"
        :height="size"
        :alt="type === 'GOLD' ? '金幣' : '寶石'"
        class="currency-icon"
    >
</template>

<script setup lang="ts">
import type { ShopType } from '../../composables/useShop';

withDefaults(defineProps<{
    type: ShopType;
    size?: number;
}>(), { size: 14 });
</script>

<style scoped>
.currency-icon {
    display: block;
}
</style>
