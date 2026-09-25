<template>
    <div class="mailbox-menu pa-2">
        <div class="font-pixel text-caption mb-2" style="color: rgb(var(--v-theme-primary)); opacity: 0.85;">
            信箱
        </div>

        <div
            v-if="loading && !loaded"
            class="d-flex justify-center py-4"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="28"
                :width="3"
            />
        </div>

        <div
            v-else-if="error"
            class="text-caption text-medium-emphasis text-center py-4"
        >
            {{ error }}
        </div>

        <div
            v-else-if="mails.length === 0"
            class="text-caption text-medium-emphasis text-center py-4"
        >
            目前沒有信件
        </div>

        <div
            v-else
            class="mailbox-menu__list"
        >
            <button
                v-for="mail in mails"
                :key="mail.mailId"
                type="button"
                class="mailbox-menu__row mb-1 px-2 py-2 d-flex align-center ga-2"
                @click="detailDialogRef?.open(mail)"
            >
                <span class="mailbox-menu__title text-body-2 flex-grow-1">{{ mail.title }}</span>

                <GameCommonPixelIcon
                    v-if="hasReward(mail)"
                    name="treasureChest"
                    :size="18"
                    class="flex-shrink-0"
                />

                <span
                    class="mailbox-menu__status text-caption flex-shrink-0"
                    :class="{ 'mailbox-menu__status--unread': mail.status === 'unclaimed' }"
                >
                    {{ mail.status === 'unclaimed' ? '未讀' : '已讀' }}
                </span>
            </button>
        </div>

        <GameCommonMailDetailDialog ref="detailDialogRef" />
    </div>
</template>

<script setup lang="ts">
import type { MailMessageView } from '../../../composables/useMailbox';

const {
    mails, loading, loaded, error, fetchMailbox,
} = useMailbox();

onMounted(fetchMailbox);

const hasReward = (mail: MailMessageView) => mail.rewardGold > 0 || mail.rewardGems > 0 || mail.rewardItemIds.length > 0;

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type DetailDialogRef = { open: (mail: MailMessageView) => void };
const detailDialogRef = ref<DetailDialogRef | null>(null);
</script>

<style scoped lang="scss">
.mailbox-menu {
    width: 280px;
    max-height: 360px;
    overflow-y: auto;
    background: rgb(var(--v-theme-background));
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;

    &__list {
        display: flex;
        flex-direction: column;
    }
}

.mailbox-menu__row {
    background: #14171c;
    border: 1px solid rgba(196, 203, 219, 0.15);
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    color: inherit;
    transition: border-color 0.08s ease-out;

    &:hover {
        border-color: rgba(196, 203, 219, 0.35);
    }
}

.mailbox-menu__title {
    min-width: 0;
    white-space: normal;
    word-break: break-word;
}

.mailbox-menu__status {
    color: rgb(var(--v-theme-primary));
    opacity: 0.5;

    &--unread {
        opacity: 1;
        color: rgb(var(--v-theme-green));
    }
}
</style>
