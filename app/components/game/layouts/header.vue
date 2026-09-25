<template>
    <div class="game-header d-flex align-center justify-space-between px-4">
        <div class="d-flex align-center ga-2">
            <v-icon
                icon="mdi-robot"
                size="18"
                color="primary"
            />
            <span class="font-pixel text-caption game-header__wordmark">GKBOT</span>
        </div>

        <div class="d-flex align-center">
            <v-menu
                v-model="mailboxOpen"
                :close-on-content-click="false"
                location="bottom end"
                offset="8"
            >
                <template #activator="{ props: menuProps }">
                    <button
                        type="button"
                        class="game-header__mailbox d-flex align-center justify-center pixel-press"
                        :aria-label="hasUnclaimed ? '開啟信箱（有未領取信件）' : '開啟信箱'"
                        v-bind="menuProps"
                    >
                        <v-icon
                            icon="mdi-email-outline"
                            size="20"
                            color="primary"
                        />
                        <span
                            v-if="hasUnclaimed"
                            class="game-header__mailbox-dot-badge"
                            aria-hidden="true"
                        />
                    </button>
                </template>

                <GameCommonMailboxMenu />
            </v-menu>

            <button
                type="button"
                class="game-header__leaderboard d-flex align-center justify-center pixel-press"
                aria-label="開啟排行榜"
                @click="navigateTo('/leaderboard')"
            >
                <v-icon
                    icon="mdi-trophy-outline"
                    size="20"
                    color="primary"
                />
            </button>

            <button
                type="button"
                class="game-header__config d-flex align-center justify-center pixel-press"
                aria-label="開啟設定選單"
                @click="$emit('open-drawer')"
            >
                <v-icon
                    icon="mdi-cog-outline"
                    size="20"
                    color="primary"
                />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
defineEmits<{ 'open-drawer': [] }>();

const mailboxOpen = ref(false);

// 未領取信件的紅點提示需要在下拉選單開啟前就知道，進頁面就先抓一次信箱狀態
// （比照 bottomNav.vue 的任務紅點：先 fetch 才能在圖示上顯示提示）。header.vue
// 掛載時 selectedCharacterId 通常還沒從 fetchRoster() resolve（onMounted 在
// main.vue 的 roster fetch 完成前就先跑了），用 onMounted 會抓到 null 而直接
// 放棄；改成 watch selectedCharacterId（含 immediate）才能在它就緒的當下、
// 以及之後每次切換角色時都重新抓取。
const { hasUnclaimed, fetchMailbox } = useMailbox();
const { selectedCharacterId } = useCharacter();
watch(selectedCharacterId, fetchMailbox, { immediate: true });
</script>

<style scoped lang="scss">
.game-header {
    flex: 0 0 auto;
    height: 44px;
    border-bottom: 1px solid rgba(196, 203, 219, 0.12);

    &__wordmark {
        letter-spacing: 0.08em;
        color: rgb(var(--v-theme-primary));
        opacity: 0.85;
    }

    &__config,
    &__mailbox,
    &__leaderboard {
        width: 34px;
        height: 34px;
        background: none;
        border: none;
        cursor: pointer;

        &:focus-visible {
            outline: 2px solid rgb(var(--v-theme-primary));
            outline-offset: 2px;
        }
    }

    &__mailbox {
        position: relative;
    }

    // 未領取信件提示，比照 bottomNav.vue 的 __dot-badge
    &__mailbox-dot-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgb(var(--v-theme-error));
        border: 1.5px solid rgb(var(--v-theme-background));
    }
}
</style>
