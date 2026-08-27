<template>
    <div class="archetype-gallery d-flex flex-column align-center fill-height pa-4">
        <div class="font-pixel text-caption mb-4" style="color: rgb(var(--v-theme-primary)); opacity: 0.85;">
            選擇職業
        </div>

        <!-- 角色 carousel：中間卡片較大，兩側較小並漸淡 -->
        <div class="archetype-carousel">
            <div class="archetype-carousel__track">
                <button
                    v-for="(archetype, index) in archetypes"
                    :key="archetype.archetypeId"
                    type="button"
                    class="archetype-carousel__card"
                    :class="{ 'archetype-carousel__card--active': index === selectedIndex }"
                    :style="cardStyle(index)"
                    :disabled="loading"
                    @click="selectedIndex = index"
                >
                    <img
                        :src="archetype.spriteUrl"
                        :alt="archetype.className"
                        width="84"
                        height="84"
                        class="archetype-carousel__sprite"
                    >
                </button>
            </div>
        </div>

        <!-- 角色說明欄 -->
        <div
            v-if="selected"
            class="archetype-detail mt-5"
        >
            <button
                type="button"
                class="archetype-detail__nav"
                aria-label="上一個職業"
                :disabled="loading"
                @click="step(-1)"
            >
                <v-icon
                    icon="mdi-chevron-left"
                    size="22"
                    color="primary"
                />
            </button>

            <div class="archetype-detail__panel">
                <div class="text-body-1 font-weight-medium">
                    {{ selected.className }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1 mb-3">
                    {{ blurb }}
                </div>

                <div class="archetype-gallery__stats">
                    <div
                        v-for="stat in statBars(selected.attributes)"
                        :key="stat.label"
                        class="archetype-gallery__stat-row"
                    >
                        <span class="text-caption text-medium-emphasis">{{ stat.label }}</span>
                        <div class="archetype-gallery__bar">
                            <div
                                class="archetype-gallery__bar-fill"
                                :style="{ width: `${stat.percent}%` }"
                            />
                        </div>
                    </div>
                </div>

                <SystemBtn
                    block
                    color="green"
                    class="text-none mt-4 flex-grow-0"
                    :loading="loading"
                    @click="handleConfirm"
                >
                    確認
                </SystemBtn>
            </div>

            <button
                type="button"
                class="archetype-detail__nav"
                aria-label="下一個職業"
                :disabled="loading"
                @click="step(1)"
            >
                <v-icon
                    icon="mdi-chevron-right"
                    size="22"
                    color="primary"
                />
            </button>
        </div>

        <SystemBtn
            v-if="roster.length > 0"
            variant="text"
            color="primary"
            class="text-none mt-4 flex-grow-0"
            :disabled="loading"
            @click="$emit('cancel')"
        >
            返回角色列表
        </SystemBtn>
    </div>
</template>

<script setup lang="ts">
defineEmits<{ cancel: [] }>();

const {
    archetypes, roster, loading, createCharacter,
} = useCharacter();

const selectedIndex = ref(0);
const selected = computed(() => archetypes.value[selectedIndex.value] ?? archetypes.value[0] ?? null);

const ARCHETYPE_BLURB: Record<string, string> = {
    barbarian: '血厚防高的近戰肉盾，適合正面硬撼。',
    rogue: '身手敏捷、攻速飛快，專走靈活風格。',
    paladin: '防禦與生存力最強，穩紮穩打。',
    wanderer: '幸運加身，掉落與祝福機率最佳。',
};

const blurb = computed(() => ARCHETYPE_BLURB[selected.value?.archetypeId ?? ''] ?? '');

const CARD_SPACING = 92;

/**
 * 循環最短路徑差值：把 index-selectedIndex 折算到 (-total/2, total/2] 內，
 * 讓卡片永遠走最短方向過渡，串接首尾形成無限循環的視覺效果。
 */
const cyclicDiff = (index: number) => {
    const total = archetypes.value.length;
    if (total === 0) return 0;
    let diff = ((index - selectedIndex.value) % total + total) % total;
    if (diff > total / 2) diff -= total;
    return diff;
};

const cardStyle = (index: number) => {
    const diff = cyclicDiff(index);
    const scale = diff === 0 ? 1 : 0.72;
    const opacity = diff === 0 ? 1 : Math.max(0, 1 - Math.abs(diff) * 0.45);

    return {
        transform: `translateX(${diff * CARD_SPACING}px) scale(${scale})`,
        opacity,
        zIndex: 10 - Math.abs(diff),
    };
};

const step = (delta: number) => {
    const total = archetypes.value.length;
    if (total === 0) return;
    selectedIndex.value = (selectedIndex.value + delta + total) % total;
};

const ATTRIBUTE_BAR_MAX = 5;

const statBars = (attributes: { STR: number; AGI: number; CON: number; LUCK: number }) => [
    { label: 'STR', percent: (attributes.STR / ATTRIBUTE_BAR_MAX) * 100 },
    { label: 'AGI', percent: (attributes.AGI / ATTRIBUTE_BAR_MAX) * 100 },
    { label: 'CON', percent: (attributes.CON / ATTRIBUTE_BAR_MAX) * 100 },
    { label: 'LUCK', percent: (attributes.LUCK / ATTRIBUTE_BAR_MAX) * 100 },
];

const handleConfirm = () => {
    if (!selected.value) return;
    createCharacter(selected.value.archetypeId);
};
</script>

<style scoped lang="scss">
.archetype-gallery {
    width: 100%;
    overflow-y: auto;

    &__stats {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    &__stat-row {
        display: grid;
        grid-template-columns: 32px 1fr;
        align-items: center;
        gap: 6px;
    }

    &__bar {
        height: 4px;
        background: rgba(196, 203, 219, 0.15);
        border-radius: 2px;
        overflow: hidden;
    }

    &__bar-fill {
        height: 100%;
        background: rgb(var(--v-theme-green));
    }
}

.archetype-carousel {
    width: 100%;
    height: 128px;
    position: relative;
    overflow: hidden;
    flex: 0 0 auto;

    &__track {
        position: relative;
        width: 100%;
        height: 100%;
    }

    &__card {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 96px;
        height: 96px;
        margin: -48px 0 0 -48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(196, 203, 219, 0.04);
        border: 3px solid rgb(20, 20, 20);
        outline: 2px solid rgba(196, 203, 219, 0.25);
        outline-offset: -6px;
        border-radius: 2px;
        cursor: pointer;
        transition: transform 0.2s ease-out, opacity 0.2s ease-out, outline-color 0.08s ease-out;

        &--active {
            outline-color: rgb(var(--v-theme-green));
        }

        &:disabled {
            cursor: default;
        }
    }

    &__sprite {
        image-rendering: pixelated;
    }
}

.archetype-detail {
    width: 100%;
    max-width: 320px;
    display: flex;
    align-items: stretch;
    gap: 8px;

    &__nav {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        border-radius: 3px;
        background: rgba(196, 203, 219, 0.06);
        border: none;
        cursor: pointer;
        transition: background-color 0.08s ease-out;

        &:hover:not(:disabled) {
            background: rgba(196, 203, 219, 0.14);
        }

        &:active:not(:disabled) {
            background: rgba(196, 203, 219, 0.22);
        }

        &:disabled {
            opacity: 0.35;
            cursor: default;
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: -2px;
        }
    }

    &__panel {
        flex: 1 1 auto;
        min-width: 0;
        padding: 12px 14px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
    }
}
</style>
