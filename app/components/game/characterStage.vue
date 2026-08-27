<template>
    <div class="character-stage d-flex flex-column align-center justify-center fill-height">
        <!-- 首次登入自動建立角色 / 讀取角色資料 -->
        <div
            v-if="loading && !character"
            class="text-center"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="56"
                :width="5"
                class="mb-4"
            />
            <div class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary)); opacity: 0.8;">
                建立角色中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="error"
            class="text-center px-6"
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
                src="/images/hero-sprite.png"
                alt="角色"
                width="176"
                height="176"
                class="character-stage__sprite"
            >
            <div class="d-flex align-center justify-center ga-2 mt-2">
                <span class="font-pixel text-caption" style="color: rgb(var(--v-theme-green));">
                    LV {{ character.level }}
                </span>
                <span class="text-body-2 text-medium-emphasis">
                    {{ character.nickname }}
                </span>
            </div>

            <!-- HP 條 -->
            <div class="character-stage__hp mt-4 mx-auto">
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

            <!-- Stats -->
            <div class="character-stage__stats mt-4 mx-auto">
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
</template>

<script setup lang="ts">
const {
    character, loading, error, fetchCharacter,
} = useCharacter();

const hpPercent = computed(() => {
    if (!character.value) return 0;
    const { HP_CURRENT, HP_MAX } = character.value.stats;
    return HP_MAX > 0 ? (HP_CURRENT / HP_MAX) * 100 : 0;
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

    &__sprite {
        image-rendering: pixelated;
        animation: character-idle-bob 2.4s ease-in-out infinite;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
    }

    &__hp {
        width: 100%;
        max-width: 220px;
    }

    &__stats {
        width: 100%;
        max-width: 260px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        row-gap: 10px;
        padding-top: 12px;
        border-top: 1px solid rgba(196, 203, 219, 0.12);
    }

    &__stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
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
