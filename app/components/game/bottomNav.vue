<template>
    <nav class="bottom-nav">
        <button
            v-for="item in leftItems"
            :key="item.key"
            type="button"
            class="bottom-nav__item"
            :aria-label="item.label"
            @click="handleTap(item)"
        >
            <v-icon
                :icon="item.icon"
                size="22"
            />
            <span class="bottom-nav__label">{{ item.label }}</span>
        </button>

        <div class="bottom-nav__home-slot">
            <button
                type="button"
                class="bottom-nav__home"
                aria-label="首頁"
                aria-current="page"
            >
                <v-icon
                    icon="mdi-sword-cross"
                    size="24"
                />
            </button>
            <span class="bottom-nav__label bottom-nav__label--home">首頁</span>
        </div>

        <button
            v-for="item in rightItems"
            :key="item.key"
            type="button"
            class="bottom-nav__item"
            :aria-label="item.label"
            @click="handleTap(item)"
        >
            <v-icon
                :icon="item.icon"
                size="22"
            />
            <span class="bottom-nav__label">{{ item.label }}</span>
        </button>

        <v-snackbar
            v-model="snackbar"
            timeout="1600"
            location="top"
            color="dark"
            class="mt-13"
        >
            {{ snackbarText }}
        </v-snackbar>
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
    { key: 'character', label: '角色', icon: 'mdi-account-circle-outline' },
];

const rightItems: NavItem[] = [
    { key: 'quest', label: '任務', icon: 'mdi-scroll-text-outline' },
    { key: 'leaderboard', label: '排行', icon: 'mdi-trophy-outline' },
];

const snackbar = ref(false);
const snackbarText = ref('');

const handleTap = (item: NavItem) => {
    snackbarText.value = `${item.label}即將推出`;
    snackbar.value = true;
};
</script>

<style scoped lang="scss">
.bottom-nav {
    position: relative;
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr auto 1fr 1fr;
    align-items: end;
    height: 62px;
    padding-bottom: 6px;
    background: rgb(var(--v-theme-background));
    border-top: 1px solid rgba(196, 203, 219, 0.12);

    &__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
        height: 100%;
        background: none;
        border: none;
        color: rgb(var(--v-theme-primary));
        opacity: 0.5;
        cursor: pointer;
        transition: opacity 0.15s ease, transform 0.15s ease;

        &:hover {
            opacity: 0.8;
        }

        &:active {
            transform: scale(0.94);
        }

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: -2px;
        }
    }

    &__home-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    &__home {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        margin-top: -26px;
        border-radius: 50%;
        border: 3px solid rgb(var(--v-theme-background));
        background: rgb(var(--v-theme-green));
        color: rgb(var(--v-theme-background));
        cursor: default;
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
</style>
