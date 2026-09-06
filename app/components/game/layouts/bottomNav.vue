<template>
    <nav class="bottom-nav">
        <button
            v-for="item in leftItems"
            :key="item.key"
            type="button"
            class="bottom-nav__item pixel-press d-flex flex-column align-center justify-end"
            :aria-label="item.label"
            @click="handleTap(item)"
        >
            <v-icon
                :icon="item.icon"
                size="22"
            />
            <span class="bottom-nav__label">{{ item.label }}</span>
        </button>

        <div class="bottom-nav__home-slot d-flex flex-column align-center">
            <button
                type="button"
                class="bottom-nav__home pixel-press d-flex align-center justify-center"
                aria-label="冒險"
                :aria-current="isOnMainPage ? 'page' : undefined"
                @click="handleHomeTap"
            >
                <v-icon
                    icon="mdi-sword-cross"
                    size="24"
                />
            </button>
            <span class="bottom-nav__label bottom-nav__label--home">冒險</span>
        </div>

        <button
            v-for="item in rightItems"
            :key="item.key"
            type="button"
            class="bottom-nav__item pixel-press d-flex flex-column align-center justify-end"
            :class="{ 'bottom-nav__item--attention': item.key === 'talents' && hasAvailableTalentPoints }"
            :aria-label="itemAriaLabel(item)"
            @click="handleTap(item)"
        >
            <span class="bottom-nav__icon-wrap d-inline-flex">
                <v-icon
                    :icon="item.icon"
                    size="22"
                />
                <span
                    v-if="item.key === 'talents' && hasAvailableTalentPoints"
                    class="bottom-nav__badge font-pixel d-flex align-center justify-center"
                    aria-hidden="true"
                >
                    {{ talentPointsBadgeText }}
                </span>
                <span
                    v-else-if="item.key === 'quests' && hasClaimableQuests"
                    class="bottom-nav__dot-badge"
                    aria-hidden="true"
                />
            </span>
            <span class="bottom-nav__label">{{ item.label }}</span>
        </button>
    </nav>
</template>

<script setup lang="ts">
type NavItem = {
    key: string;
    label: string;
    icon: string;
};

const leftItems: NavItem[] = [
    { key: 'shop', label: '商店', icon: 'mdi-store' },
    { key: 'inventory', label: '背包', icon: 'mdi-bag-personal-outline' },
];

const rightItems: NavItem[] = [
    { key: 'talents', label: '天賦', icon: 'mdi-star-four-points-outline' },
    { key: 'quests', label: '任務', icon: 'mdi-clipboard-check-outline' },
];

const route = useRoute();
const isOnMainPage = computed(() => route.path === '/main');

// 有可用天賦點時,天賦入口做醒目提示(數字 badge + 暖色系),提醒玩家有點數可以投。
const { character } = useCharacter();
const hasAvailableTalentPoints = computed(() => (character.value?.talentPoints ?? 0) > 0);
const talentPointsBadgeText = computed(() => {
    const points = character.value?.talentPoints ?? 0;
    return points > 99 ? '99+' : String(points);
});

// 有可領取任務時,任務入口只用紅點提示(不顯示數字),進頁面前就先抓一次任務清單。
const { hasClaimable: hasClaimableQuests, fetchDaily, fetchPersistent } = useQuests();
onMounted(() => {
    fetchDaily();
    fetchPersistent();
});

const itemAriaLabel = (item: NavItem) => {
    if (item.key === 'talents' && hasAvailableTalentPoints.value) return `${item.label}（有可用天賦點）`;
    if (item.key === 'quests' && hasClaimableQuests.value) return `${item.label}（有可領取任務）`;
    return item.label;
};

const handleTap = (item: NavItem) => {
    if (item.key === 'inventory') {
        navigateTo('/inventory');
        return;
    }
    if (item.key === 'shop') {
        navigateTo('/shop');
        return;
    }
    if (item.key === 'talents') {
        navigateTo('/talents');
        return;
    }
    if (item.key === 'quests') {
        navigateTo('/quests');
        return;
    }
};

const handleHomeTap = () => {
    if (!isOnMainPage.value) {
        navigateTo('/main');
    }
};
</script>

<style scoped lang="scss">
// 天賦點的主色（characterStage.vue 的 LV 標籤同色），與屬性點沿用的
// warning（暗紅，見 vuetify.ts 的 theme.colors.warning）區分開來。
$talent-point-color: #ffd166;

.bottom-nav {
    position: relative;
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr auto 1fr 1fr;
    align-items: end;
    height: 54px;
    padding-bottom: 4px;
    background: rgb(var(--v-theme-background));
    border-top: 1px solid rgba(196, 203, 219, 0.12);

    &__item {
        gap: 5px;
        height: 100%;
        background: none;
        border: none;
        color: rgb(var(--v-theme-primary));
        opacity: 0.5;
        cursor: pointer;
        transition: opacity 0.08s ease-out;

        &:hover {
            opacity: 0.8;
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: -2px;
        }

        &--attention {
            opacity: 1;
            // 天賦點的主色統一用黃色（characterStage.vue 的 LV 標籤同色），
            // 與屬性點沿用的 warning（暗紅）區分開來。
            color: $talent-point-color;
        }
    }

    &__icon-wrap {
        position: relative;
    }

    &__badge {
        position: absolute;
        top: -6px;
        right: -10px;
        min-width: 15px;
        height: 15px;
        padding: 0 3px;
        border-radius: 8px;
        background: $talent-point-color;
        border: 1.5px solid rgb(var(--v-theme-background));
        color: #14171c;
        font-size: 9px;
        line-height: 1;
        white-space: nowrap;
        animation: bottom-nav-badge-pulse 1.4s ease-in-out infinite;
    }

    &__dot-badge {
        position: absolute;
        top: -2px;
        right: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgb(var(--v-theme-error));
        border: 1.5px solid rgb(var(--v-theme-background));
    }

    &__home-slot {
        gap: 2px;
    }

    &__home {
        width: 46px;
        height: 46px;
        margin-top: -23px;
        border-radius: 8px;
        border: 3px solid rgb(var(--v-theme-background));
        background: rgb(var(--v-theme-green));
        color: rgb(var(--v-theme-background));
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    }

    &__label {
        font-size: 10px;
        line-height: 1;

        &--home {
            color: rgb(var(--v-theme-green));
        }
    }
}

@keyframes bottom-nav-badge-pulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.12);
    }
}
</style>
