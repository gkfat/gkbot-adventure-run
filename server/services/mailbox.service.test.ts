import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { MailboxService } from './mailbox.service';
import type { MailMessage } from '../../shared/types/mailbox';
import type { Character } from '../../shared/types/character';
import {
    NotFoundError, ConflictError, BusinessLogicError,
} from '../../shared/types/errors';

const {
    getByIdForAccountMock,
    createMailMock, listByCharacterMock, getMailRefMock,
    txGetMock, txSetMock, txUpdateMock, runTransactionMock,
    collectionMock,
} = vi.hoisted(() => {
    const getByIdForAccountMock = vi.fn();
    const createMailMock = vi.fn();
    const listByCharacterMock = vi.fn();
    const getMailRefMock = vi.fn((mailId: string) => ({
        tag: 'mail', mailId, 
    }));

    const txGetMock = vi.fn();
    const txSetMock = vi.fn();
    const txUpdateMock = vi.fn();
    const runTransactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock,
    }));

    const collectionMock = vi.fn((name: string) => ({
        doc: (id: string) => ({
            tag: name === 'characters' ? 'character' : 'inventory', id,
        }),
    }));

    return {
        getByIdForAccountMock,
        createMailMock, listByCharacterMock, getMailRefMock,
        txGetMock, txSetMock, txUpdateMock, runTransactionMock,
        collectionMock,
    };
});

vi.mock('../repositories/mailbox.repository', () => ({
    MailboxRepository: class {
        createMail = createMailMock;
        listByCharacter = listByCharacterMock;
        getMailRef = getMailRefMock;
    },
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: class {
        getByIdForAccount = getByIdForAccountMock;
    },
}));

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock, runTransaction: runTransactionMock,
    }),
}));

function mail(overrides: Partial<MailMessage> = {}): MailMessage {
    return {
        mailId: 'mail-1',
        characterId: 'char-1',
        title: '季結算獎勵',
        body: '恭喜上榜！',
        rewardGold: 100,
        rewardGems: 5,
        rewardItemIds: [],
        status: 'unclaimed',
        createdAt: Date.now(),
        ...overrides,
    };
}

function character(overrides: Partial<Character> = {}): Character {
    return {
        characterId: 'char-1',
        accountId: 'account-1',
        archetypeId: 'engineer',
        className: '工匠',
        level: 1,
        exp: 0,
        gold: 50,
        gems: 2,
        attributes: {
            STR: 1, AGI: 1, CON: 1, LUCK: 1,
        },
        unspentAttributePoints: 0,
        talentPoints: 0,
        talents: {},
        equipment: {},
        nextChapterIndex: 0,
        currentLevelIndex: 0,
        chapterTotalLevels: 5,
        nickname: '玩家A1B2C3',
        hasRenamed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    } as Character;
}

beforeEach(() => {
    vi.clearAllMocks();
    runTransactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock,
    }));
});

describe('MailboxService.send (mailbox)', () => {
    it('delegates to MailboxRepository.createMail', async () => {
        createMailMock.mockResolvedValue(mail());

        const service = new MailboxService();
        await service.send('char-1', '標題', '內文', {
            gold: 100, gems: 5, 
        });

        expect(createMailMock).toHaveBeenCalledWith('char-1', '標題', '內文', {
            gold: 100, gems: 5, 
        });
    });
});

describe('MailboxService.getMailbox (mailbox)', () => {
    it('throws NotFoundError when the character does not belong to the account', async () => {
        getByIdForAccountMock.mockResolvedValue(null);

        const service = new MailboxService();
        await expect(service.getMailbox('account-1', 'char-1')).rejects.toBeInstanceOf(NotFoundError);
        expect(listByCharacterMock).not.toHaveBeenCalled();
    });

    it('returns the character\'s mail when ownership checks out', async () => {
        getByIdForAccountMock.mockResolvedValue(character());
        listByCharacterMock.mockResolvedValue([mail()]);

        const service = new MailboxService();
        const result = await service.getMailbox('account-1', 'char-1');

        expect(result).toHaveLength(1);
    });
});

describe('MailboxService.claim (mailbox)', () => {
    beforeEach(() => {
        getByIdForAccountMock.mockResolvedValue(character());
    });

    it('throws NotFoundError when the character is not the account\'s', async () => {
        getByIdForAccountMock.mockResolvedValue(null);

        const service = new MailboxService();
        await expect(service.claim('account-1', 'char-1', 'mail-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError when the mail does not exist', async () => {
        txGetMock.mockImplementation(async (ref: { tag: string }) => {
            if (ref.tag === 'mail') return { exists: false };
            throw new Error('unexpected read');
        });

        const service = new MailboxService();
        await expect(service.claim('account-1', 'char-1', 'mail-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError when the mail belongs to a different character', async () => {
        txGetMock.mockImplementation(async (ref: { tag: string }) => {
            if (ref.tag === 'mail') return {
                exists: true, data: () => mail({ characterId: 'other-char' }), 
            };
            throw new Error('unexpected read');
        });

        const service = new MailboxService();
        await expect(service.claim('account-1', 'char-1', 'mail-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ConflictError when the mail is already claimed, without re-crediting', async () => {
        txGetMock.mockImplementation(async (ref: { tag: string }) => {
            if (ref.tag === 'mail') return {
                exists: true, data: () => mail({ status: 'claimed' }), 
            };
            throw new Error('unexpected read');
        });

        const service = new MailboxService();
        await expect(service.claim('account-1', 'char-1', 'mail-1')).rejects.toBeInstanceOf(ConflictError);
        expect(txUpdateMock).not.toHaveBeenCalled();
    });

    it('credits gold/gems and marks the mail claimed', async () => {
        txGetMock.mockImplementation(async (ref: { tag: string }) => {
            if (ref.tag === 'mail') return {
                exists: true, data: () => mail({
                    rewardGold: 100, rewardGems: 5, rewardItemIds: [], 
                }), 
            };
            if (ref.tag === 'character') return {
                exists: true, data: () => character({
                    gold: 50, gems: 2, 
                }), 
            };
            throw new Error('unexpected read');
        });

        const service = new MailboxService();
        const result = await service.claim('account-1', 'char-1', 'mail-1');

        expect(result).toEqual({
            goldEarned: 100, gemsEarned: 5, itemIdsAdded: [],
        });
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ tag: 'character' }), expect.objectContaining({
            gold: 150, gems: 7,
        }));
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ tag: 'mail' }), expect.objectContaining({ status: 'claimed' }));
    });

    it('adds items to an existing inventory when there is room', async () => {
        txGetMock.mockImplementation(async (ref: { tag: string }) => {
            if (ref.tag === 'mail') return {
                exists: true, data: () => mail({
                    rewardGold: 0, rewardGems: 0, rewardItemIds: ['item-2'], 
                }), 
            };
            if (ref.tag === 'inventory') return {
                exists: true, data: () => ({
                    characterId: 'char-1', items: ['item-1'], updatedAt: Date.now(), 
                }), 
            };
            throw new Error('unexpected read');
        });

        const service = new MailboxService();
        const result = await service.claim('account-1', 'char-1', 'mail-1');

        expect(result.itemIdsAdded).toEqual(['item-2']);
        expect(txSetMock).toHaveBeenCalledWith(expect.objectContaining({ tag: 'inventory' }), expect.objectContaining({ items: ['item-1', 'item-2'] }));
    });

    it('rejects without any writes when the inventory is full', async () => {
        const fullItems = Array.from({ length: 500 }, (_, i) => `item-${i}`);
        txGetMock.mockImplementation(async (ref: { tag: string }) => {
            if (ref.tag === 'mail') return {
                exists: true, data: () => mail({
                    rewardGold: 0, rewardGems: 0, rewardItemIds: ['item-new'], 
                }), 
            };
            if (ref.tag === 'inventory') return {
                exists: true, data: () => ({
                    characterId: 'char-1', items: fullItems, updatedAt: Date.now(), 
                }), 
            };
            throw new Error('unexpected read');
        });

        const service = new MailboxService();
        await expect(service.claim('account-1', 'char-1', 'mail-1')).rejects.toBeInstanceOf(BusinessLogicError);
        expect(txSetMock).not.toHaveBeenCalled();
        expect(txUpdateMock).not.toHaveBeenCalled();
    });

    it('claims a no-reward mail as read-only (no currency/inventory writes)', async () => {
        txGetMock.mockImplementation(async (ref: { tag: string }) => {
            if (ref.tag === 'mail') return {
                exists: true, data: () => mail({
                    rewardGold: 0, rewardGems: 0, rewardItemIds: [], 
                }), 
            };
            throw new Error('unexpected read');
        });

        const service = new MailboxService();
        const result = await service.claim('account-1', 'char-1', 'mail-1');

        expect(result).toEqual({
            goldEarned: 0, gemsEarned: 0, itemIdsAdded: [],
        });
        expect(txSetMock).not.toHaveBeenCalled();
        expect(txUpdateMock).toHaveBeenCalledTimes(1);
        expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ tag: 'mail' }), expect.objectContaining({ status: 'claimed' }));
    });
});
