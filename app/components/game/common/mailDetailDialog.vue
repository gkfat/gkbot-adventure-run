<template>
    <GameCommonDialogFrame
        v-model="open"
        max-width="320"
        content-class="mail-detail-dialog"
    >
        <template v-if="mail">
            <div class="font-pixel text-subtitle-2 mb-2">
                {{ mail.title }}
            </div>
            <p class="text-body-2 text-medium-emphasis mail-detail-dialog__body mb-3">
                {{ mail.body }}
            </p>

            <div
                v-if="hasRewards"
                class="text-caption mail-detail-dialog__reward-label mb-1"
                :class="{ 'mail-detail-dialog__reward-label--claimed': mail.status === 'claimed' }"
            >
                {{ mail.status === 'unclaimed' ? '可領取獎勵' : '已領取獎勵' }}
            </div>

            <div
                v-if="hasRewards"
                class="d-flex align-center ga-3 mb-4"
            >
                <span
                    v-if="mail.rewardGold > 0"
                    class="d-flex align-center ga-1"
                >
                    <GameCommonCurrencyIcon
                        type="GOLD"
                        :size="14"
                    />
                    <span class="font-pixel text-body-2">{{ mail.rewardGold }}</span>
                </span>
                <span
                    v-if="mail.rewardGems > 0"
                    class="d-flex align-center ga-1"
                >
                    <GameCommonCurrencyIcon
                        type="GEMS"
                        :size="14"
                    />
                    <span class="font-pixel text-body-2">{{ mail.rewardGems }}</span>
                </span>
                <span
                    v-if="mail.rewardItemIds.length > 0"
                    class="text-caption text-medium-emphasis"
                >
                    +{{ mail.rewardItemIds.length }} 件道具
                </span>
            </div>

            <SystemBtn
                v-if="mail.status === 'unclaimed'"
                block
                color="primary"
                class="text-none mb-2"
                :disabled="claiming"
                @click="handleClaim"
            >
                領取獎勵
            </SystemBtn>

            <SystemBtn
                block
                variant="outlined"
                color="primary"
                class="text-none"
                @click="open = false"
            >
                關閉
            </SystemBtn>
        </template>
    </GameCommonDialogFrame>

    <GameCommonRewardClaimedDialog ref="rewardDialogRef" />
</template>

<script setup lang="ts">
import type { MailMessageView } from '../../../composables/useMailbox';

const {
    claimingMailId, claim,
} = useMailbox();

const open = ref(false);
const mail = ref<MailMessageView | null>(null);
const claiming = computed(() => !!mail.value && claimingMailId.value === mail.value.mailId);
const hasRewards = computed(() => !!mail.value && (mail.value.rewardGold > 0 || mail.value.rewardGems > 0 || mail.value.rewardItemIds.length > 0));

// eslint-disable-next-line no-unused-vars -- named param is required TS function-type syntax, not a real binding
type RewardDialogRef = { open: (rewards: { gold?: number; gems?: number; itemCount?: number }) => void };
const rewardDialogRef = ref<RewardDialogRef | null>(null);

defineExpose({
    open: (target: MailMessageView) => {
        mail.value = target;
        open.value = true;
    },
});

const handleClaim = async () => {
    if (!mail.value) return;
    const result = await claim(mail.value.mailId);
    if (!result) return;

    open.value = false;
    useAudio().playSfx('gold.mp3');
    rewardDialogRef.value?.open({
        gold: result.goldEarned,
        gems: result.gemsEarned,
        itemCount: result.itemIdsAdded.length,
    });
};
</script>

<style scoped lang="scss">
.mail-detail-dialog__body {
    white-space: normal;
    word-break: break-word;
}

.mail-detail-dialog__reward-label {
    color: rgb(var(--v-theme-green));
    font-weight: 500;

    &--claimed {
        color: rgb(var(--v-theme-primary));
        opacity: 0.6;
        font-weight: 400;
    }
}
</style>
