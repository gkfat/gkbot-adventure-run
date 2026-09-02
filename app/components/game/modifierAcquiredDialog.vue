<template>
    <v-dialog
        :model-value="modifier !== null"
        max-width="360"
        @update:model-value="(value) => !value && $emit('update:modifier', null)"
    >
        <div
            v-if="modifier"
            class="modifier-acquired-dialog pa-4"
        >
            <div
                class="text-center font-pixel text-subtitle-2 mb-1"
                :style="{ color: modifier.isBlessing ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
            >
                {{ modifier.isBlessing ? '獲得祝福' : '遭受詛咒' }}
            </div>
            <div class="text-center text-body-1 mb-2">
                {{ modifier.name }}
            </div>
            <div class="text-caption text-medium-emphasis mb-2">
                {{ modifier.description }}
            </div>
            <div
                v-if="effectText"
                class="text-center text-caption font-pixel"
                :style="{ color: modifier.isBlessing ? 'rgb(var(--v-theme-green))' : 'rgb(var(--v-theme-warning))' }"
            >
                {{ effectText }}
            </div>

            <SystemBtn
                block
                variant="outlined"
                color="primary"
                class="text-none mt-3"
                @click="$emit('update:modifier', null)"
            >
                關閉
            </SystemBtn>
        </div>
    </v-dialog>
</template>

<script setup lang="ts">
import type { RunModifier } from '../../../shared/types/adventure';

defineProps<{ modifier: RunModifier | null; effectText?: string }>();
defineEmits<{ 'update:modifier': [value: null] }>();
</script>

<style scoped lang="scss">
.modifier-acquired-dialog {
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);
}
</style>
