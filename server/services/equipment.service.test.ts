import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { EquipmentService } from './equipment.service';
import { EquipmentSlot } from '../../shared/types/common';
import { ItemType } from '../../shared/types/item';
import type { Character } from '../../shared/types/character';
import type { ItemInstance } from '../../shared/types/item';

const {
    docMock, collectionMock, runTransactionMock, txGetMock, txUpdateMock,
} = vi.hoisted(() => {
    const docMock = vi.fn((id: string) => ({ id }));
    const collectionMock = vi.fn(() => ({ doc: docMock }));
    const txGetMock = vi.fn();
    const txUpdateMock = vi.fn();
    const runTransactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, update: txUpdateMock,
    }));
    return {
        docMock, collectionMock, runTransactionMock, txGetMock, txUpdateMock,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock,
        runTransaction: runTransactionMock,
    }),
}));

function baseCharacter(overrides: Partial<Character> = {}): Character {
    return {
        characterId: 'char-1',
        accountId: 'account-1',
        archetypeId: 'engineer',
        className: '工匠',
        level: 1,
        exp: 0,
        gold: 0,
        gems: 0,
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
        itemId: 'item-1',
        templateId: 'salvaged_wrench',
        type: ItemType.EQUIPMENT,
        equipSlot: EquipmentSlot.RIGHT_HAND,
        rarity: 'N' as ItemInstance['rarity'],
        stats: { ATK: 5 },
        name: '維修殘骸扳手',
        description: '從維修設施殘骸堆挖出的重型扳手。',
        source: 'DROP' as ItemInstance['source'],
        characterId: 'char-1',
        createdAt: Date.now(),
        ...overrides,
    };
}

function mockDocs(character: Character, item: ItemInstance, previousItem?: ItemInstance) {
    txGetMock.mockImplementation(async (ref: { id: string }) => {
        if (ref.id === character.characterId) {
            return {
                exists: true, data: () => character,
            };
        }
        if (ref.id === item.itemId) {
            return {
                exists: true, data: () => item,
            };
        }
        if (previousItem && ref.id === previousItem.itemId) {
            return {
                exists: true, data: () => previousItem,
            };
        }
        return { exists: false };
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    runTransactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, update: txUpdateMock,
    }));
});

describe('EquipmentService.equipItem — HAND_SLOTS swap', () => {
    it('equips a hand item into the requested opposite hand', async () => {
        const character = baseCharacter();
        const item = baseItem({ equipSlot: EquipmentSlot.RIGHT_HAND });
        mockDocs(character, item);

        const service = new EquipmentService();
        const result = await service.equipItem('account-1', 'char-1', 'item-1', EquipmentSlot.LEFT_HAND);

        expect(result.equipped.itemId).toBe('item-1');
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'char-1' }),
            expect.objectContaining({ equipment: { [EquipmentSlot.LEFT_HAND]: 'item-1' } }),
        );
    });

    it('allows dual-wielding two weapons across both hands', async () => {
        const character = baseCharacter({ equipment: { [EquipmentSlot.RIGHT_HAND]: 'weapon-existing' } });
        const item = baseItem({
            itemId: 'item-2', equipSlot: EquipmentSlot.RIGHT_HAND, 
        });
        mockDocs(character, item);

        const service = new EquipmentService();
        const result = await service.equipItem('account-1', 'char-1', 'item-2', EquipmentSlot.LEFT_HAND);

        expect(result.unequipped).toBeUndefined();
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'char-1' }),
            expect.objectContaining({
                equipment: {
                    [EquipmentSlot.RIGHT_HAND]: 'weapon-existing', [EquipmentSlot.LEFT_HAND]: 'item-2',
                },
            }),
        );
    });

    it('allows dual-wielding two shields (armor) across both hands', async () => {
        const character = baseCharacter({ equipment: { [EquipmentSlot.LEFT_HAND]: 'shield-existing' } });
        const item = baseItem({
            itemId: 'item-3', templateId: 'riot_shield_scrap', equipSlot: EquipmentSlot.LEFT_HAND,
        });
        mockDocs(character, item);

        const service = new EquipmentService();
        const result = await service.equipItem('account-1', 'char-1', 'item-3', EquipmentSlot.RIGHT_HAND);

        expect(result.unequipped).toBeUndefined();
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'char-1' }),
            expect.objectContaining({
                equipment: {
                    [EquipmentSlot.LEFT_HAND]: 'shield-existing', [EquipmentSlot.RIGHT_HAND]: 'item-3',
                },
            }),
        );
    });

    it('uses the item\'s own equipSlot when requestedSlot is omitted', async () => {
        const character = baseCharacter();
        const item = baseItem({ equipSlot: EquipmentSlot.RIGHT_HAND });
        mockDocs(character, item);

        const service = new EquipmentService();
        const result = await service.equipItem('account-1', 'char-1', 'item-1');

        expect(result.equipped.itemId).toBe('item-1');
        expect(txUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'char-1' }),
            expect.objectContaining({ equipment: { [EquipmentSlot.RIGHT_HAND]: 'item-1' } }),
        );
    });

    it('rejects a requestedSlot outside HAND_SLOTS', async () => {
        const character = baseCharacter();
        const item = baseItem({ equipSlot: EquipmentSlot.RIGHT_HAND });
        mockDocs(character, item);

        const service = new EquipmentService();
        await expect(
            service.equipItem('account-1', 'char-1', 'item-1', EquipmentSlot.HEAD),
        ).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
    });

    it('rejects a requestedSlot on a non-hand item', async () => {
        const character = baseCharacter();
        const item = baseItem({
            itemId: 'item-4', templateId: 'gkbot_faceplate', equipSlot: EquipmentSlot.HEAD,
        });
        mockDocs(character, item);

        const service = new EquipmentService();
        await expect(
            service.equipItem('account-1', 'char-1', 'item-4', EquipmentSlot.LEFT_HAND),
        ).rejects.toThrow();
        expect(txUpdateMock).not.toHaveBeenCalled();
    });
});
