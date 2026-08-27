<template>
    <div class="character-stage d-flex flex-column align-center fill-height pa-3">
        <!-- 讀取角色資料 -->
        <div
            v-if="loading && !character"
            class="text-center my-auto"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="56"
                :width="5"
                class="mb-4"
            />
            <div class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary)); opacity: 0.8;">
                載入角色中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="error"
            class="text-center px-6 my-auto"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ error }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none"
                prepend-icon="mdi-refresh"
                @click="fetchCharacter"
            >
                重試
            </SystemBtn>
        </div>

        <!-- 角色顯示 -->
        <div
            v-else-if="character"
            class="text-center character-stage__portrait"
        >
            <img
                :src="character.spriteUrl"
                alt="角色"
                width="100"
                height="100"
                class="character-stage__sprite"
            >
            <!-- 職業 / 等級 / EXP / HP -->
            <div class="character-stage__box mt-2 mx-auto">
                <div class="d-flex align-center justify-center ga-2">
                    <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                        LV {{ character.level }}
                    </span>
                    <span class="text-body-2 text-medium-emphasis">
                        {{ character.className }}
                    </span>
                </div>

                <div class="character-stage__bar mt-2">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">HP</span>
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                            {{ character.stats.HP_CURRENT }} / {{ character.stats.HP_MAX }}
                        </span>
                    </div>
                    <v-progress-linear
                        :model-value="hpPercent"
                        color="green"
                        bg-color="dark"
                        height="6"
                        rounded
                    />
                </div>

                <div class="character-stage__bar mt-2">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">EXP</span>
                        <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                            {{ expLabel }}
                        </span>
                    </div>
                    <v-progress-linear
                        :model-value="expPercent"
                        color="primary"
                        bg-color="dark"
                        height="6"
                        rounded
                    />
                </div>
            </div>

            <!-- 屬性 / 戰鬥數值：同一 row，各佔一半 -->
            <div class="character-stage__box character-stage__cols mt-2 mx-auto">
                <div class="character-stage__col">
                    <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption text-medium-emphasis">屬性</span>
                        <span
                            v-if="character.unspentAttributePoints > 0"
                            class="font-pixel text-caption"
                            style="color: rgb(var(--v-theme-warning));"
                        >
                            +{{ character.unspentAttributePoints }}
                        </span>
                    </div>
                    <div class="character-stage__grid">
                        <div
                            v-for="attr in attributeEntries"
                            :key="attr.label"
                            class="character-stage__stat"
                        >
                            <span class="text-caption text-medium-emphasis">{{ attr.label }}</span>
                            <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                                {{ attr.value }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="character-stage__col character-stage__col--divided">
                    <div class="mb-1">
                        <span class="text-caption text-medium-emphasis">戰鬥數值</span>
                    </div>
                    <div class="character-stage__grid">
                        <div
                            v-for="stat in statEntries"
                            :key="stat.label"
                            class="character-stage__stat"
                        >
                            <span class="text-caption text-medium-emphasis">{{ stat.label }}</span>
                            <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary));">
                                {{ stat.value }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { EXP_TABLE } from '../../../shared/types/character';

const {
    character, loading, error, fetchCharacter,
} = useCharacter();

const hpPercent = computed(() => {
    if (!character.value) return 0;
    const { HP_CURRENT, HP_MAX } = character.value.stats;
    return HP_MAX > 0 ? (HP_CURRENT / HP_MAX) * 100 : 0;
});

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

const attributeEntries = computed(() => {
    if (!character.value) return [];
    const { attributes } = character.value;
    return [
        { label: 'STR', value: attributes.STR },
        { label: 'AGI', value: attributes.AGI },
        { label: 'CON', value: attributes.CON },
        { label: 'LUCK', value: attributes.LUCK },
    ];
});

const statEntries = computed(() => {
    if (!character.value) return [];
    const { stats } = character.value;
    return [
        { label: 'ATK', value: stats.ATK },
        { label: 'DEF', value: stats.DEF },
        { label: '攻速', value: `${stats.actionIntervalSec.toFixed(1)}s` },
        { label: '爆擊', value: `${Math.round(stats.critChance * 100)}%` },
        { label: '閃避', value: `${Math.round(stats.dodgeChance * 100)}%` },
    ];
});

onMounted(() => {
    if (!character.value) {
        fetchCharacter();
    }
});
</script>

<style scoped lang="scss">
.character-stage {
    width: 100%;
    overflow-y: auto;

    &__sprite {
        image-rendering: pixelated;
        animation: character-idle-bob 2.4s ease-in-out infinite;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
    }

    &__bar {
        width: 100%;
    }

    &__box {
        width: 100%;
        max-width: 280px;
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }

    &__cols {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: 12px;
        padding: 10px 12px;
    }

    &__col {
        min-width: 0;

        &--divided {
            padding-left: 12px;
            border-left: 1px solid rgba(196, 203, 219, 0.12);
        }
    }

    &__grid {
        display: grid;
        grid-template-columns: 1fr;
        row-gap: 5px;
    }

    &__stat {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
    }
}

@keyframes character-idle-bob {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-6px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .character-stage__sprite {
        animation: none;
    }
}
</style>
