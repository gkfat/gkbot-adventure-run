import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { CharacterService } from './character.service';

const {
    listByAccountIdMock, createCharacterFromArchetypeMock, getByIdForAccountMock, characterDeleteMock,
    grantItemMock, equipItemMock,
    inventoryDeleteMock, deleteAllByCharacterIdMock, deleteShopsForCharacterMock,
} = vi.hoisted(() => ({
    listByAccountIdMock: vi.fn(),
    createCharacterFromArchetypeMock: vi.fn(),
    getByIdForAccountMock: vi.fn(),
    characterDeleteMock: vi.fn(),
    grantItemMock: vi.fn(),
    equipItemMock: vi.fn(),
    inventoryDeleteMock: vi.fn(),
    deleteAllByCharacterIdMock: vi.fn(),
    deleteShopsForCharacterMock: vi.fn(),
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: vi.fn().mockImplementation(function CharacterRepositoryMock() {
        return {
            listByAccountId: listByAccountIdMock,
            createCharacterFromArchetype: createCharacterFromArchetypeMock,
            getByIdForAccount: getByIdForAccountMock,
            delete: characterDeleteMock,
        };
    }),
    CHARACTER_ROSTER_MAX: 3,
}));

vi.mock('../repositories/item.repository', () => ({
    ItemRepository: vi.fn().mockImplementation(function ItemRepositoryMock() {
        return { getByIds: vi.fn().mockResolvedValue([]) };
    }),
}));

vi.mock('../repositories/inventory.repository', () => ({
    InventoryRepository: vi.fn().mockImplementation(function InventoryRepositoryMock() {
        return { delete: inventoryDeleteMock };
    }),
}));

vi.mock('../repositories/adventure-run.repository', () => ({
    AdventureRunRepository: vi.fn().mockImplementation(function AdventureRunRepositoryMock() {
        return { deleteAllByCharacterId: deleteAllByCharacterIdMock };
    }),
}));

vi.mock('./inventory.service', () => ({
    InventoryService: vi.fn().mockImplementation(function InventoryServiceMock() {
        return { grantItem: grantItemMock };
    }),
}));

vi.mock('./equipment.service', () => ({
    EquipmentService: vi.fn().mockImplementation(function EquipmentServiceMock() {
        return { equipItem: equipItemMock };
    }),
}));

vi.mock('./shop.service', () => ({
    ShopService: vi.fn().mockImplementation(function ShopServiceMock() {
        return { deleteShopsForCharacter: deleteShopsForCharacterMock };
    }),
}));

describe('CharacterService.getRoster', () => {
    beforeEach(() => {
        listByAccountIdMock.mockReset();
    });

    it('only returns the 5 selectable archetypes for character creation', async () => {
        listByAccountIdMock.mockResolvedValue([]);
        const service = new CharacterService();

        const result = await service.getRoster('account-1');

        expect(result.archetypes).toHaveLength(5);
        expect(result.archetypes.map(a => a.archetypeId).sort()).toEqual(
            [
                'adventurer',
                'fighter',
                'gambler',
                'scholar',
                'tinkerer',
            ],
        );
        expect(result.archetypes.every(a => a.isSelectable)).toBe(true);
    });
});

describe('CharacterService.createCharacterFromArchetype', () => {
    beforeEach(() => {
        listByAccountIdMock.mockReset();
        createCharacterFromArchetypeMock.mockReset();
        getByIdForAccountMock.mockReset();
        grantItemMock.mockReset();
        equipItemMock.mockReset();
    });

    it('rejects a retired archetype', async () => {
        listByAccountIdMock.mockResolvedValue([]);
        const service = new CharacterService();

        await expect(service.createCharacterFromArchetype('account-1', 'barbarian')).rejects.toThrow('Unknown archetype');
        expect(createCharacterFromArchetypeMock).not.toHaveBeenCalled();
    });

    it('rejects an unknown archetypeId', async () => {
        listByAccountIdMock.mockResolvedValue([]);
        const service = new CharacterService();

        await expect(service.createCharacterFromArchetype('account-1', 'does_not_exist')).rejects.toThrow('Unknown archetype');
        expect(createCharacterFromArchetypeMock).not.toHaveBeenCalled();
    });

    it('grants a starter weapon (equipped) and a starter potion to a newly created character', async () => {
        const character = {
            characterId: 'char-1',
            accountId: 'account-1',
            archetypeId: 'fighter',
            className: '戰士',
            attributes: {
                STR: 3, AGI: 1, CON: 3, LUCK: 1,
            },
            equipment: {},
        };

        listByAccountIdMock.mockResolvedValue([]);
        createCharacterFromArchetypeMock.mockResolvedValue(character);
        getByIdForAccountMock.mockResolvedValue(character);
        grantItemMock.mockResolvedValue({ itemId: 'item-weapon-1' });

        const service = new CharacterService();
        await service.createCharacterFromArchetype('account-1', 'fighter');

        expect(grantItemMock).toHaveBeenCalledTimes(2);
        expect(grantItemMock.mock.calls[0]?.[0]).toBe('char-1');
        expect(equipItemMock).toHaveBeenCalledWith('account-1', 'char-1', 'item-weapon-1');
        expect(getByIdForAccountMock).toHaveBeenCalledWith('char-1', 'account-1');
    });

    it.each([
        ['fighter', 'riot_shield_scrap'],
        ['adventurer', 'scrap_daggers'],
        ['scholar', 'gkbot_faceplate'],
        ['tinkerer', 'salvaged_wrench'],
        ['gambler', 'research_chip_ring'],
    ])('grants the %s-themed starter equipment for archetype %s', async (archetypeId, expectedTemplateId) => {
        const character = {
            characterId: 'char-1',
            accountId: 'account-1',
            archetypeId,
            attributes: {
                STR: 1, AGI: 1, CON: 1, LUCK: 1,
            },
            equipment: {},
        };

        listByAccountIdMock.mockResolvedValue([]);
        createCharacterFromArchetypeMock.mockResolvedValue(character);
        getByIdForAccountMock.mockResolvedValue(character);
        grantItemMock.mockResolvedValue({ itemId: 'item-1' });

        const service = new CharacterService();
        await service.createCharacterFromArchetype('account-1', archetypeId);

        expect(grantItemMock.mock.calls[0]).toEqual(
            [
                'char-1',
                expectedTemplateId,
                {
                    source: 'STARTER', maxRarity: 'N', 
                },
            ],
        );
        expect(grantItemMock.mock.calls[1]).toEqual(
            [
                'char-1',
                'engine_oil_basic',
                {
                    source: 'STARTER', maxRarity: 'N', 
                },
            ],
        );
    });
});

describe('CharacterService.deleteCharacter', () => {
    beforeEach(() => {
        getByIdForAccountMock.mockReset();
        characterDeleteMock.mockReset();
        inventoryDeleteMock.mockReset();
        deleteAllByCharacterIdMock.mockReset();
        deleteShopsForCharacterMock.mockReset();
    });

    it('rejects deleting a character that does not belong to the caller', async () => {
        getByIdForAccountMock.mockResolvedValue(null);
        const service = new CharacterService();

        await expect(service.deleteCharacter('account-1', 'char-1')).rejects.toThrow();
        expect(characterDeleteMock).not.toHaveBeenCalled();
        expect(inventoryDeleteMock).not.toHaveBeenCalled();
        expect(deleteAllByCharacterIdMock).not.toHaveBeenCalled();
        expect(deleteShopsForCharacterMock).not.toHaveBeenCalled();
    });

    it('deletes adventure runs, the inventory reference list, the shop documents, then the character document — without touching item documents', async () => {
        getByIdForAccountMock.mockResolvedValue({
            characterId: 'char-1', accountId: 'account-1',
        });
        const service = new CharacterService();

        await service.deleteCharacter('account-1', 'char-1');

        expect(deleteAllByCharacterIdMock).toHaveBeenCalledWith('char-1');
        expect(inventoryDeleteMock).toHaveBeenCalledWith('char-1');
        expect(deleteShopsForCharacterMock).toHaveBeenCalledWith('char-1');
        expect(characterDeleteMock).toHaveBeenCalledWith('char-1');
    });
});
