import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { ShopService } from './shop.service';
import { PurchaseDestination } from '../../shared/types/shop';
import type {
    DailyShop, ShopItem,
} from '../../shared/types/shop';
import { EquipmentSlot } from '../../shared/types/common';
import {
    ItemType, ItemSource, 
} from '../../shared/types/item';
import type { Character } from '../../shared/types/character';
import type { ItemInstance } from '../../shared/types/item';

const {
    collectionMock, txGetMock, txSetMock, txUpdateMock, runTransactionMock, docs, deleteMock, incrementProgressMock,
} = vi.hoisted(() => {
    const docs = new Map<string, { exists: boolean; data?: () => unknown }>();
    const deleteMock = vi.fn((key: string) => {
        docs.delete(key);
        return Promise.resolve();
    });
    const incrementProgressMock = vi.fn().mockResolvedValue(undefined);

    const makeRef = (collectionName: string, id: string) => ({
        collectionName,
        id,
        get: () => Promise.resolve(docs.get(`${collectionName}:${id}`) ?? { exists: false }),
        delete: () => deleteMock(`${collectionName}:${id}`),
    });

    const collectionMock = vi.fn((collectionName: string) => ({ doc: (id: string) => makeRef(collectionName, id) }));

    const txGetMock = vi.fn((ref: { collectionName: string; id: string }) => (
        Promise.resolve(docs.get(`${ref.collectionName}:${ref.id}`) ?? { exists: false })
    ));
    const txSetMock = vi.fn();
    const txUpdateMock = vi.fn();
    const runTransactionMock = vi.fn(async (callback: (_tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock,
    }));

    return {
        collectionMock, txGetMock, txSetMock, txUpdateMock, runTransactionMock, docs, deleteMock, incrementProgressMock,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock,
        runTransaction: runTransactionMock,
    }),
}));

vi.mock('./progress-tracker.service', () => ({
    QuestAchievementProgressTracker: vi.fn().mockImplementation(function QuestAchievementProgressTrackerMock() {
        return { incrementProgress: incrementProgressMock };
    }),
}));

function setDoc(collectionName: string, id: string, data: unknown) {
    docs.set(`${collectionName}:${id}`, {
        exists: true, data: () => data,
    });
}

function todayUtcDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function yesterdayUtcDate(): string {
    const date = new Date(`${todayUtcDate()}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

function baseCharacter(overrides: Partial<Character> = {}): Character {
    return {
        characterId: 'char-1',
        accountId: 'account-1',
        archetypeId: 'engineer',
        className: '工匠',
        level: 1,
        exp: 0,
        gold: 1000,
        gems: 100,
        attributes: {
            STR: 1, AGI: 1, CON: 1, LUCK: 1,
        },
        unspentAttributePoints: 0,
        equipment: {},
        nextChapterIndex: 0,
        currentLevelIndex: 0,
        chapterTotalLevels: 5,
        nickname: '玩家A1B2C3',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

function baseItem(overrides: Partial<ItemInstance> = {}): ItemInstance {
    return {
        itemId: 'shop-item-1',
        templateId: 'salvaged_wrench',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        rarity: 'N' as ItemInstance['rarity'],
        stats: { ATK: 5 },
        name: '維修殘骸扳手',
        description: '從維修設施殘骸堆挖出的重型扳手。',
        source: ItemSource.SHOP,
        characterId: 'char-1',
        createdAt: Date.now(),
        ...overrides,
    };
}

function baseSlot(overrides: Partial<ShopItem> = {}): ShopItem {
    return {
        slotId: 'slot-0',
        item: baseItem(),
        currency: 'GOLD',
        price: 150,
        sold: false,
        ...overrides,
    };
}

function baseShop(overrides: Partial<DailyShop> = {}): DailyShop {
    return {
        characterId: 'char-1',
        date: todayUtcDate(),
        items: [baseSlot()],
        generatedAt: Date.now(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    docs.clear();
    runTransactionMock.mockImplementation(async (callback: (_tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock,
    }));
});

describe('ShopService.purchaseItem', () => {
    it('delivers the exact pre-rolled item into the permanent inventory (INVENTORY destination)', async () => {
        setDoc('characters', 'char-1', baseCharacter());
        setDoc('dailyShops', `char-1_${todayUtcDate()}`, baseShop());

        const service = new ShopService();
        const result = await service.purchaseItem(
            'account-1', 'char-1', 'slot-0', PurchaseDestination.INVENTORY,
        );

        expect(result.item.itemId).toBe('shop-item-1');
        expect(result.goldSpent).toBe(150);
        expect(result.gemsSpent).toBeUndefined();

        expect(incrementProgressMock).toHaveBeenCalledWith({
            accountId: 'account-1', characterId: 'char-1', type: 'PURCHASE_SHOP', amount: 1,
        });

        expect(txSetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'items', id: 'shop-item-1', 
            }),
            expect.objectContaining({ itemId: 'shop-item-1' }),
        );
        expect(txSetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'inventories', id: 'char-1', 
            }),
            expect.objectContaining({ items: ['shop-item-1'] }),
        );
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'characters', id: 'char-1', 
            }),
            expect.objectContaining({ gold: 850 }),
        );
        expect(txSetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'dailyShops', id: `char-1_${todayUtcDate()}`,
            }),
            expect.objectContaining({
                items: [
                    expect.objectContaining({
                        slotId: 'slot-0', sold: true,
                    }),
                ],
            }),
        );
    });

    it('delivers into the permanent inventory AND the equipment slot (EQUIP destination)', async () => {
        setDoc('characters', 'char-1', baseCharacter());
        setDoc('dailyShops', `char-1_${todayUtcDate()}`, baseShop());

        const service = new ShopService();
        const result = await service.purchaseItem(
            'account-1', 'char-1', 'slot-0', PurchaseDestination.EQUIP,
        );

        expect(result.unequipped).toBeUndefined();
        expect(txSetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'inventories', id: 'char-1', 
            }),
            expect.objectContaining({ items: ['shop-item-1'] }),
        );
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionName: 'characters', id: 'char-1', 
            }),
            expect.objectContaining({ equipment: { [EquipmentSlot.RIGHT_HAND]: 'shop-item-1' } }),
        );
    });

    it('returns the previously-equipped item as `unequipped` when the slot is occupied', async () => {
        setDoc('characters', 'char-1', baseCharacter({ equipment: { [EquipmentSlot.RIGHT_HAND]: 'old-item' } }));
        setDoc('items', 'old-item', baseItem({
            itemId: 'old-item', name: '舊扳手',
        }));
        setDoc('dailyShops', `char-1_${todayUtcDate()}`, baseShop());

        const service = new ShopService();
        const result = await service.purchaseItem(
            'account-1', 'char-1', 'slot-0', PurchaseDestination.EQUIP,
        );

        expect(result.unequipped?.itemId).toBe('old-item');
    });

    it('rejects purchasing an already-sold slot without charging', async () => {
        setDoc('characters', 'char-1', baseCharacter());
        setDoc('dailyShops', `char-1_${todayUtcDate()}`, baseShop({ items: [baseSlot({ sold: true })] }));

        const service = new ShopService();
        await expect(
            service.purchaseItem('account-1', 'char-1', 'slot-0', PurchaseDestination.INVENTORY),
        ).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
        expect(txSetMock).not.toHaveBeenCalled();
    });

    it('rejects when the character cannot afford the price', async () => {
        setDoc('characters', 'char-1', baseCharacter({ gold: 50 }));
        setDoc('dailyShops', `char-1_${todayUtcDate()}`, baseShop());

        const service = new ShopService();
        await expect(
            service.purchaseItem('account-1', 'char-1', 'slot-0', PurchaseDestination.INVENTORY),
        ).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
        expect(txSetMock).not.toHaveBeenCalled();
    });

    it('rejects when the permanent inventory is already full, leaving the shop/character untouched', async () => {
        setDoc('characters', 'char-1', baseCharacter());
        setDoc('inventories', 'char-1', {
            characterId: 'char-1',
            items: Array.from({ length: 500 }, (_, i) => `existing-${i}`),
            updatedAt: Date.now(),
        });
        setDoc('dailyShops', `char-1_${todayUtcDate()}`, baseShop());

        const service = new ShopService();
        await expect(
            service.purchaseItem('account-1', 'char-1', 'slot-0', PurchaseDestination.INVENTORY),
        ).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
        expect(txSetMock).not.toHaveBeenCalled();
    });
});

describe('ShopService.deleteShopsForCharacter', () => {
    it('best-effort deletes today\'s and yesterday\'s shop documents, plus legacy gold/gems shop documents, for the character', async () => {
        const service = new ShopService();
        await service.deleteShopsForCharacter('char-1');

        expect(deleteMock).toHaveBeenCalledWith(`dailyShops:char-1_${todayUtcDate()}`);
        expect(deleteMock).toHaveBeenCalledWith(`dailyShops:char-1_${yesterdayUtcDate()}`);
        expect(deleteMock).toHaveBeenCalledWith(`shopsGold:char-1_${todayUtcDate()}`);
        expect(deleteMock).toHaveBeenCalledWith(`shopsGold:char-1_${yesterdayUtcDate()}`);
        expect(deleteMock).toHaveBeenCalledWith(`shopsGems:char-1_${todayUtcDate()}`);
        expect(deleteMock).toHaveBeenCalledWith(`shopsGems:char-1_${yesterdayUtcDate()}`);
    });

    it('does not throw when none of the documents exist', async () => {
        const service = new ShopService();
        await expect(service.deleteShopsForCharacter('char-without-shops')).resolves.toBeUndefined();
    });
});
