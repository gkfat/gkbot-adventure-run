import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { MailboxRepository } from './mailbox.repository';
import type { MailMessage } from '../../shared/types/mailbox';

const {
    autoDocSetMock,
    docMock,
    orderByGetMock, orderByMock, whereMock,
    collectionMock,
} = vi.hoisted(() => {
    const autoDocSetMock = vi.fn();
    const autoDocMock = vi.fn(() => ({
        id: 'mail-generated-1', set: autoDocSetMock,
    }));

    const docMock = vi.fn((id: string) => ({ id }));

    const orderByGetMock = vi.fn();
    const orderByMock = vi.fn(() => ({ get: orderByGetMock }));
    const whereMock = vi.fn(() => ({ orderBy: orderByMock }));

    const collectionMock = vi.fn(() => ({
        doc: (id?: string) => (id === undefined ? autoDocMock() : docMock(id)),
        where: whereMock,
    }));

    return {
        autoDocSetMock,
        docMock,
        orderByGetMock, orderByMock, whereMock,
        collectionMock,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({ getAdminFirestore: () => ({ collection: collectionMock }) }));

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

beforeEach(() => {
    vi.clearAllMocks();
});

describe('MailboxRepository.createMail (mailbox)', () => {
    it('writes a new unclaimed mail with an auto-generated id', async () => {
        const repo = new MailboxRepository();
        const result = await repo.createMail('char-1', '標題', '內文', {
            gold: 100, gems: 5, itemIds: ['item-1'],
        });

        expect(autoDocSetMock).toHaveBeenCalledWith(expect.objectContaining({
            mailId: 'mail-generated-1',
            characterId: 'char-1',
            title: '標題',
            body: '內文',
            rewardGold: 100,
            rewardGems: 5,
            rewardItemIds: ['item-1'],
            status: 'unclaimed',
        }));
        expect(result.mailId).toBe('mail-generated-1');
        expect(result.status).toBe('unclaimed');
    });

    it('defaults missing rewards to zero/empty', async () => {
        const repo = new MailboxRepository();
        const result = await repo.createMail('char-1', '標題', '內文', {});

        expect(result.rewardGold).toBe(0);
        expect(result.rewardGems).toBe(0);
        expect(result.rewardItemIds).toEqual([]);
    });
});

describe('MailboxRepository.listByCharacter (mailbox)', () => {
    it('queries by characterId ordered newest first', async () => {
        const mails = [mail({ mailId: 'a' }), mail({ mailId: 'b' })];
        orderByGetMock.mockResolvedValue({ docs: mails.map(m => ({ data: () => m })) });

        const repo = new MailboxRepository();
        const result = await repo.listByCharacter('char-1');

        expect(whereMock).toHaveBeenCalledWith('characterId', '==', 'char-1');
        expect(orderByMock).toHaveBeenCalledWith('createdAt', 'desc');
        expect(result).toEqual(mails);
    });
});

describe('MailboxRepository.getMailRef (mailbox)', () => {
    it('returns a doc reference for the given mailId', () => {
        const repo = new MailboxRepository();
        const ref = repo.getMailRef('mail-1');

        expect(docMock).toHaveBeenCalledWith('mail-1');
        expect(ref).toEqual({ id: 'mail-1' });
    });
});
