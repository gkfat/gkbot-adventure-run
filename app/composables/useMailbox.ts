export type MailMessageView = {
    mailId: string;
    characterId: string;
    title: string;
    body: string;
    rewardGold: number;
    rewardGems: number;
    rewardItemIds: string[];
    status: 'unclaimed' | 'claimed';
    createdAt: number;
    claimedAt?: number;
};

interface GetMailboxResponse {
    success: boolean;
    data: { mails: MailMessageView[] };
}

export type ClaimMailResult = { goldEarned: number; gemsEarned: number; itemIdsAdded: string[] };

interface ClaimMailResponse {
    success: boolean;
    data: ClaimMailResult;
}

const mails = ref<MailMessageView[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const claimingMailId = ref<string | null>(null);

/**
 * Mailbox Composable
 * 管理目前選定角色的信件列表（GET .../mailbox）與領取流程
 * （見 openspec/changes/mailbox）
 */
export const useMailbox = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const fetchMailbox = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetMailboxResponse>(
                `/api/character/${selectedCharacterId.value}/mailbox`,
            );
            mails.value = response.data.mails;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useMailbox] Failed to fetch mailbox:', err);
            error.value = err.message || '無法取得信箱';
        } finally {
            loading.value = false;
        }
    };

    /**
     * 領取一封信的獎勵；成功後在本地樂觀更新該信件為已領取，
     * 並重新整理角色資料（gold/gems 可能已變動）。
     */
    const claim = async (mailId: string): Promise<ClaimMailResult | null> => {
        if (!selectedCharacterId.value) return null;

        claimingMailId.value = mailId;

        try {
            const response = await api.post<ClaimMailResponse>(
                `/api/character/${selectedCharacterId.value}/mailbox/${mailId}/claim`,
            );

            const target = mails.value.find(m => m.mailId === mailId);
            if (target) {
                target.status = 'claimed';
                target.claimedAt = Date.now();
            }

            await useCharacter().fetchCharacter();
            return response.data;
        } catch (err: any) {
            console.error('[useMailbox] Failed to claim mail:', err);
            return null;
        } finally {
            claimingMailId.value = null;
        }
    };

    return {
        mails: computed(() => mails.value),
        loading: computed(() => loading.value),
        loaded: computed(() => loaded.value),
        error: computed(() => error.value),
        claimingMailId: computed(() => claimingMailId.value),
        hasUnclaimed: computed(() => mails.value.some(m => m.status === 'unclaimed')),
        fetchMailbox,
        claim,
    };
};
