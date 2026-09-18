<template>
    <div class="archetype-gallery d-flex flex-column align-center fill-height pa-4 pt-2">
        <div class="font-pixel text-h6" style="color: rgb(var(--v-theme-primary)); opacity: 0.85;">
            選擇角色
        </div>

        <!-- 角色 carousel：中間卡片較大，兩側較小並漸淡 -->
        <div class="archetype-carousel">
            <div class="archetype-carousel__track">
                <button
                    v-for="(archetype, index) in archetypes"
                    :key="archetype.archetypeId"
                    type="button"
                    class="archetype-carousel__card d-flex align-center justify-center"
                    :class="{ 'archetype-carousel__card--active': index === selectedIndex }"
                    :style="cardStyle(index)"
                    :disabled="loading"
                    @click="selectedIndex = index"
                >
                    <img
                        :src="idleFrameUrl(archetype.spriteUrl, idleStep)"
                        :alt="archetype.className"
                        width="100"
                        height="100"
                        class="archetype-carousel__sprite"
                    >
                </button>
            </div>
        </div>

        <!-- 角色說明欄 -->
        <div
            v-if="selected"
            class="archetype-detail d-flex flex-column ga-2"
        >
            <div class="archetype-detail__panel">
                <div class="text-body-1 font-weight-medium">
                    {{ selected.className }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1 mb-3">
                    {{ blurb }}
                </div>

                <div class="text-caption text-medium-emphasis mb-1">
                    初始配備
                </div>
                <div class="archetype-gallery__starter-row d-flex mb-3">
                    <button
                        v-for="preview in starterLoadoutPreview"
                        :key="preview.templateId"
                        type="button"
                        class="pixel-slot pixel-slot--starter pixel-press d-flex align-center justify-center"
                        :style="{ borderColor: RARITY_COLOR[preview.rarity] }"
                        @click="openStarterDetail(preview)"
                    >
                        <span
                            class="pixel-slot__rarity font-pixel"
                            :style="{ background: RARITY_COLOR[preview.rarity] }"
                        >
                            {{ preview.rarity }}
                        </span>
                        <GameCommonPixelIcon
                            :name="resolvePixelIcon(preview)"
                            :size="28"
                        />
                    </button>
                </div>

                <div class="archetype-gallery__stats d-flex flex-column ga-1 mb-3">
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

                <!-- 可獲得技能（character-skills）：讓玩家在選角當下就能看到這個職業
                     未來能練出哪些技能，不需要開新戰鬥或到角色頁才第一次看到。 -->
                <div class="text-caption text-medium-emphasis mb-1">
                    可獲得技能
                </div>
                <div class="d-flex flex-column ga-2">
                    <div
                        v-for="skill in archetypeSkills"
                        :key="skill.skillId"
                        class="d-flex align-center ga-2"
                    >
                        <div class="archetype-gallery__skill-icon d-flex align-center justify-center flex-shrink-0">
                            <GameCommonPixelIcon
                                :name="(skill.icon as PixelIconName)"
                                :size="20"
                            />
                        </div>
                        <div style="min-width: 0;">
                            <div class="text-caption">{{ skill.name }}</div>
                            <div class="archetype-gallery__skill-desc text-caption text-medium-emphasis">
                                {{ skill.description }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="archetype-detail__nav-row d-flex ga-2">
                <button
                    type="button"
                    class="archetype-detail__nav d-flex align-center justify-center"
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

                <button
                    type="button"
                    class="archetype-detail__nav d-flex align-center justify-center"
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
        </div>

        <SystemBtn
            v-if="selected"
            block
            size="large"
            color="green"
            class="text-none mt-auto flex-grow-0 archetype-gallery__confirm-btn"
            :loading="loading"
            @click="handleConfirm"
        >
            確認
        </SystemBtn>

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

        <!-- 初始配備詳情 dialog（唯讀預覽，尚未創建角色，不提供裝備/卸下操作） -->
        <GameCommonDialogFrame
            v-model="starterDetailOpen"
            max-width="320"
        >
            <template v-if="starterDetail">
                <GameCommonItemDetailPanel
                    :item="starterDetail"
                    :name="starterDetail.name"
                    :effects="starterDetail.effects"
                    :flavor="starterDetail.description"
                />

                <SystemBtn
                    block
                    variant="outlined"
                    color="primary"
                    class="text-none"
                    @click="starterDetailOpen = false"
                >
                    關閉
                </SystemBtn>
            </template>
        </GameCommonDialogFrame>
    </div>
</template>

<script setup lang="ts">
import { idleFrameUrl } from '../../../utils/spriteDisplay';
import { RARITY_COLOR, resolvePixelIcon } from '../../../utils/equipmentDisplay';
import {
    getStarterLoadoutPreview, type StarterLoadoutItemPreview,
} from '../../../../shared/constants/starterLoadout';
import { getCharacterSkillsByArchetypeId } from '../../../../shared/constants/characterSkills';
import type { PixelIconName } from '../../../utils/pixelIcons';

defineEmits<{ cancel: [] }>();

const starterDetailOpen = ref(false);
const starterDetail = ref<StarterLoadoutItemPreview | null>(null);
const openStarterDetail = (preview: StarterLoadoutItemPreview) => {
    starterDetail.value = preview;
    starterDetailOpen.value = true;
};

const {
    archetypes, roster, loading, createCharacter,
} = useCharacter();
const idleStep = useIdleFrame();

const selectedIndex = ref(0);
const selected = computed(() => archetypes.value[selectedIndex.value] ?? archetypes.value[0] ?? null);
const starterLoadoutPreview = computed(() => (
    selected.value ? getStarterLoadoutPreview(selected.value.archetypeId) : []
));
const archetypeSkills = computed(() => (
    selected.value ? getCharacterSkillsByArchetypeId(selected.value.archetypeId) : []
));

const ARCHETYPE_BLURB: Record<string, string> = {
    fighter: '身體素質最好，最快適應戰鬥的近戰肉盾。在無數次戰鬥後，痛覺對你來說越來越陌生——你隱約察覺，這副軀殼正在變成別的東西。',
    adventurer: '靈活敏捷，擅長探索，非戰鬥的地方總能多發現點東西。你始終相信，這片廢土底下藏著答案，只要肯多走幾步、多看一眼。',
    scholar: '知識轉化為力量，越了解這個世界就越強。你翻遍殘存的紀錄與典籍，試圖拼湊世界崩壞前的真相——代價是，你的身體從沒空好好鍛鍊。',
    tinkerer: '擅長拾荒與修補，總能把撿到的零件變成活下去的辦法。你的雙手比誰都清楚機械的構造，因為某種程度上，你自己也是。',
    gambler: '幸運加身，熱愛在風險與回報之間放手一搏。命運的骰子從不虧待你，你早已習慣把每個抉擇都當成一場賭局。',
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
    { label: '力量', percent: (attributes.STR / ATTRIBUTE_BAR_MAX) * 100 },
    { label: '敏捷', percent: (attributes.AGI / ATTRIBUTE_BAR_MAX) * 100 },
    { label: '體質', percent: (attributes.CON / ATTRIBUTE_BAR_MAX) * 100 },
    { label: '幸運', percent: (attributes.LUCK / ATTRIBUTE_BAR_MAX) * 100 },
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

    &__starter-row {
        gap: 6px;
    }

    &__stat-row {
        display: grid;
        grid-template-columns: 32px 1fr;
        align-items: center;
        gap: 6px;
    }

    &__confirm-btn {
        width: 100%;
        max-width: 320px;
        height: 48px;
        font-size: 1rem;
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

    &__skill-icon {
        width: 32px;
        height: 32px;
        background: #14171c;
        border: 2px solid rgba(196, 203, 219, 0.25);
        border-radius: 3px;
        color: rgb(var(--v-theme-primary));
    }

    &__skill-desc {
        font-size: 10px;
        line-height: 1.3;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }
}

.archetype-carousel {
    width: 100%;
    height: 152px;
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
        width: 120px;
        height: 120px;
        margin: -60px 0 0 -60px;
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
    padding: 12px 14px;
    background: #14171c;
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;

    &__nav {
        flex: 1 1 0;
        height: 40px;
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
        width: 100%;
    }
}

// Shared "pixel cabinet slot" look (same visual language as inventory.vue /
// itemDetailDialog.vue) — duplicated here since Vue scoped styles don't
// cross component boundaries.
.pixel-slot {
    position: relative;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 3px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    box-shadow:
        inset 2px 2px 0 rgba(255, 255, 255, 0.06),
        inset -2px -2px 0 rgba(0, 0, 0, 0.55);

    &::before,
    &::after {
        content: '';
        position: absolute;
        width: 6px;
        height: 6px;
        pointer-events: none;
        opacity: 0.55;
    }

    &::before {
        top: -2px;
        left: -2px;
        border-top: 2px solid rgb(var(--v-theme-primary));
        border-left: 2px solid rgb(var(--v-theme-primary));
    }

    &::after {
        bottom: -2px;
        right: -2px;
        border-bottom: 2px solid rgb(var(--v-theme-primary));
        border-right: 2px solid rgb(var(--v-theme-primary));
    }

    &--starter {
        width: 40px;
        height: 40px;
        padding: 0;
        cursor: pointer;
        transition: transform 0.06s ease-out;

        &:hover {
            transform: translateY(-1px);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &__rarity {
        position: absolute;
        top: -6px;
        left: -6px;
        padding: 0 2px;
        font-size: 7px;
        line-height: 1.4;
        color: #14171c;
        border-radius: 2px;
        white-space: nowrap;
    }
}

</style>
