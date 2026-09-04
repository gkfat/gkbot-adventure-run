<template>
    <div class="resource-bar">
        <div class="resource-bar__row d-flex align-center ga-4 px-4">
            <div class="d-flex align-center ga-1">
                <GameCommonCurrencyIcon type="GOLD" />
                <span class="font-pixel text-caption resource-bar__value">
                    {{ character ? character.gold : '—' }}
                </span>
            </div>

            <div class="d-flex align-center ga-1">
                <GameCommonCurrencyIcon type="GEMS" />
                <span class="font-pixel text-caption resource-bar__value">
                    {{ character ? character.gems : '—' }}
                </span>
            </div>

            <div
                v-if="character"
                class="d-flex align-center ga-1 ml-auto"
            >
                <span class="text-caption text-medium-emphasis">EXP</span>
                <span class="font-pixel text-caption resource-bar__value">
                    {{ expLabel }}
                </span>
            </div>
        </div>

        <v-progress-linear
            v-if="character"
            :model-value="expPercent"
            color="primary"
            bg-color="dark"
            height="3"
        />
    </div>
</template>

<script setup lang="ts">
import { EXP_TABLE } from '../../../../shared/types/character';

const { character } = useCharacter();

const expToNextLevel = computed(() => (character.value ? EXP_TABLE[character.value.level] : undefined));

const expPercent = computed(() => {
    if (!character.value) return 0;
    if (!expToNextLevel.value) return 100; // 已滿等
    return Math.min(100, (character.value.exp / expToNextLevel.value) * 100);
});

const expLabel = computed(() => {
    if (!character.value) return '';
    if (!expToNextLevel.value) return `${character.value.exp}（已滿等）`;
    return `${character.value.exp} / ${expToNextLevel.value}`;
});
</script>

<style scoped lang="scss">
.resource-bar {
    flex: 0 0 auto;
    border-bottom: 1px solid rgba(196, 203, 219, 0.12);

    &__row {
        height: 34px;
    }

    &__value {
        color: rgb(var(--v-theme-secondary));
        opacity: 0.9;
    }
}
</style>
