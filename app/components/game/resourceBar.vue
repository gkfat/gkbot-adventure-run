<template>
    <div class="resource-bar d-flex align-center ga-4 px-4">
        <div class="d-flex align-center ga-1">
            <v-icon
                icon="mdi-circle-multiple"
                size="14"
                style="color: #e0c063;"
            />
            <span class="font-pixel text-caption resource-bar__value">
                {{ character ? character.gold : '—' }}
            </span>
        </div>

        <div class="d-flex align-center ga-1">
            <v-icon
                icon="mdi-diamond-stone"
                size="14"
                color="primary"
            />
            <span class="font-pixel text-caption resource-bar__value">
                {{ character ? character.gems : '—' }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
const { character } = useCharacter();
</script>

<style scoped lang="scss">
.resource-bar {
    flex: 0 0 auto;
    height: 34px;
    border-bottom: 1px solid rgba(196, 203, 219, 0.12);

    &__value {
        color: rgb(var(--v-theme-secondary));
        opacity: 0.9;
    }
}
</style>
