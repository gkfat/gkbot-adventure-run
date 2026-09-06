import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { CharacterService } from './character.service';

const {
    listByAccountIdMock, createCharacterFromArchetypeMock, getByIdForAccountMock, characterDeleteMock,
    grantItemMock, equipItemMock, itemGetByIdsMock, itemDeleteByIdsMock,
    inventoryDeleteMock, getByCharacterIdMock, deleteAllByCharacterIdMock, deleteShopsForCharacterMock, updateTalentsMock,
    addEncounteredArchetypeSlugsMock, updateDefeatedArchetypeCountsMock, incrementProgressMock,
} = vi.hoisted(() => ({
    listByAccountIdMock: vi.fn(),
    createCharacterFromArchetypeMock: vi.fn(),
    getByIdForAccountMock: vi.fn(),
    characterDeleteMock: vi.fn(),
    grantItemMock: vi.fn(),
    equipItemMock: vi.fn(),
    itemGetByIdsMock: vi.fn(),
    itemDeleteByIdsMock: vi.fn(),
    inventoryDeleteMock: vi.fn(),
    getByCharacterIdMock: vi.fn(),
    deleteAllByCharacterIdMock: vi.fn(),
    deleteShopsForCharacterMock: vi.fn(),
    updateTalentsMock: vi.fn(),
    addEncounteredArchetypeSlugsMock: vi.fn(),
    updateDefeatedArchetypeCountsMock: vi.fn(),
    incrementProgressMock: vi.fn(),
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: vi.fn().mockImplementation(function CharacterRepositoryMock() {
        return {
            listByAccountId: listByAccountIdMock,
            createCharacterFromArchetype: createCharacterFromArchetypeMock,
            getByIdForAccount: getByIdForAccountMock,
            delete: characterDeleteMock,
            updateTalents: updateTalentsMock,
            addEncounteredArchetypeSlugs: addEncounteredArchetypeSlugsMock,
            updateDefeatedArchetypeCounts: updateDefeatedArchetypeCountsMock,
        };
    }),
    CHARACTER_ROSTER_MAX: 3,
}));

vi.mock('../repositories/item.repository', () => ({
    ItemRepository: vi.fn().mockImplementation(function ItemRepositoryMock() {
        return {
            getByIds: itemGetByIdsMock,
            deleteByIds: itemDeleteByIdsMock,
        };
    }),
}));

vi.mock('../repositories/inventory.repository', () => ({
    InventoryRepository: vi.fn().mockImplementation(function InventoryRepositoryMock() {
        return {
            delete: inventoryDeleteMock,
            getByCharacterId: getByCharacterIdMock,
        };
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

vi.mock('./achievement.service', () => ({
    AchievementService: vi.fn().mockImplementation(function AchievementServiceMock() {
        return { incrementProgress: incrementProgressMock };
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
        incrementProgressMock.mockReset();
    });

    it('credits DISCOVER_FACILITIES for the starting chapter\'s facility theme', async () => {
        const character = {
            characterId: 'char-1',
            accountId: 'account-1',
            archetypeId: 'fighter',
            className: '戰士',
            attributes: {
                STR: 4, AGI: 1, CON: 4, LUCK: 1,
            },
            talentPoints: 0,
            talents: {},
            equipment: {},
        };

        listByAccountIdMock.mockResolvedValue([]);
        createCharacterFromArchetypeMock.mockResolvedValue(character);
        getByIdForAccountMock.mockResolvedValue(character);
        grantItemMock.mockResolvedValue({ itemId: 'item-1' });

        const service = new CharacterService();
        await service.createCharacterFromArchetype('account-1', 'fighter');

        expect(incrementProgressMock).toHaveBeenCalledWith('char-1', 'DISCOVER_FACILITIES', 1);
    });

    it('rejects an unknown archetypeId', async () => {
        listByAccountIdMock.mockResolvedValue([]);
        const service = new CharacterService();

        await expect(service.createCharacterFromArchetype('account-1', 'does_not_exist')).rejects.toThrow('Unknown archetype');
        expect(createCharacterFromArchetypeMock).not.toHaveBeenCalled();
    });

    it('grants 2 starter equipment pieces (each equipped) and a starter potion to a newly created character', async () => {
        const character = {
            characterId: 'char-1',
            accountId: 'account-1',
            archetypeId: 'fighter',
            className: '戰士',
            attributes: {
                STR: 4, AGI: 1, CON: 4, LUCK: 1,
            },
            talentPoints: 0,
            talents: {},
            equipment: {},
        };

        listByAccountIdMock.mockResolvedValue([]);
        createCharacterFromArchetypeMock.mockResolvedValue(character);
        getByIdForAccountMock.mockResolvedValue(character);
        grantItemMock
            .mockResolvedValueOnce({ itemId: 'item-weapon-1' })
            .mockResolvedValueOnce({ itemId: 'item-armor-1' })
            .mockResolvedValueOnce({ itemId: 'item-potion-1' });

        const service = new CharacterService();
        await service.createCharacterFromArchetype('account-1', 'fighter');

        expect(grantItemMock).toHaveBeenCalledTimes(3);
        expect(grantItemMock.mock.calls[0]?.[0]).toBe('char-1');
        expect(equipItemMock).toHaveBeenCalledTimes(2);
        expect(equipItemMock).toHaveBeenCalledWith('account-1', 'char-1', 'item-weapon-1');
        expect(equipItemMock).toHaveBeenCalledWith('account-1', 'char-1', 'item-armor-1');
        expect(getByIdForAccountMock).toHaveBeenCalledWith('char-1', 'account-1');
    });

    it.each([
        ['fighter', ['riot_shield_scrap', 'supply_crate_vest']],
        ['adventurer', ['scrap_daggers', 'servo_greaves']],
        ['scholar', ['gkbot_faceplate', 'maintenance_terminal_gloves']],
        ['tinkerer', ['salvaged_wrench', 'hydraulic_arm_guard']],
        ['gambler', ['research_chip_ring', 'tech_goggles']],
    ])('grants the %s-themed starter equipment for archetype %s', async (archetypeId, expectedTemplateIds) => {
        const character = {
            characterId: 'char-1',
            accountId: 'account-1',
            archetypeId,
            attributes: {
                STR: 1, AGI: 1, CON: 1, LUCK: 1,
            },
            talentPoints: 0,
            talents: {},
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
                expectedTemplateIds[0],
                {
                    source: 'STARTER', maxRarity: 'N',
                },
            ],
        );
        expect(grantItemMock.mock.calls[1]).toEqual(
            [
                'char-1',
                expectedTemplateIds[1],
                {
                    source: 'STARTER', maxRarity: 'N',
                },
            ],
        );
        expect(grantItemMock.mock.calls[2]).toEqual(
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
        itemDeleteByIdsMock.mockReset();
        inventoryDeleteMock.mockReset();
        getByCharacterIdMock.mockReset();
        deleteAllByCharacterIdMock.mockReset();
        deleteShopsForCharacterMock.mockReset();
    });

    it('rejects deleting a character that does not belong to the caller', async () => {
        getByIdForAccountMock.mockResolvedValue(null);
        const service = new CharacterService();

        await expect(service.deleteCharacter('account-1', 'char-1')).rejects.toThrow();
        expect(characterDeleteMock).not.toHaveBeenCalled();
        expect(itemDeleteByIdsMock).not.toHaveBeenCalled();
        expect(inventoryDeleteMock).not.toHaveBeenCalled();
        expect(deleteAllByCharacterIdMock).not.toHaveBeenCalled();
        expect(deleteShopsForCharacterMock).not.toHaveBeenCalled();
    });

    it('deletes equipped/inventory item documents, adventure runs, the inventory reference list, the shop documents, then the character document', async () => {
        getByIdForAccountMock.mockResolvedValue({
            characterId: 'char-1',
            accountId: 'account-1',
            equipment: {
                WEAPON: 'item-weapon-1', ARMOR: 'item-armor-1',
            },
        });
        getByCharacterIdMock.mockResolvedValue({
            characterId: 'char-1', items: ['item-potion-1', 'item-armor-1'],
        });
        const service = new CharacterService();

        await service.deleteCharacter('account-1', 'char-1');

        expect(itemDeleteByIdsMock).toHaveBeenCalledTimes(1);
        expect(itemDeleteByIdsMock.mock.calls[0]?.[0]).toEqual(
            expect.arrayContaining([
                'item-weapon-1',
                'item-armor-1',
                'item-potion-1',
            ]),
        );
        expect(itemDeleteByIdsMock.mock.calls[0]?.[0]).toHaveLength(3);
        expect(deleteAllByCharacterIdMock).toHaveBeenCalledWith('char-1');
        expect(inventoryDeleteMock).toHaveBeenCalledWith('char-1');
        expect(deleteShopsForCharacterMock).toHaveBeenCalledWith('char-1');
        expect(characterDeleteMock).toHaveBeenCalledWith('char-1');
    });
});

describe('CharacterService.getBestiary', () => {
    beforeEach(() => {
        getByIdForAccountMock.mockReset();
    });

    it('rejects querying a character that does not belong to the caller', async () => {
        getByIdForAccountMock.mockResolvedValue(null);
        const service = new CharacterService();

        await expect(service.getBestiary('account-1', 'char-1')).rejects.toThrow();
    });

    it('includes all 32 archetypes, marking encountered vs un-encountered and gating name/description/portraitUrl/defeatedCount', async () => {
        getByIdForAccountMock.mockResolvedValue({
            characterId: 'char-1',
            accountId: 'account-1',
            encounteredArchetypeSlugs: ['gkbot-repair'],
            defeatedArchetypeCounts: { 'gkbot-repair': 4 },
        });
        const service = new CharacterService();

        const bestiary = await service.getBestiary('account-1', 'char-1');

        expect(bestiary).toHaveLength(32);

        const encounteredEntry = bestiary.find(entry => entry.slug === 'gkbot-repair');
        expect(encounteredEntry?.encountered).toBe(true);
        expect(encounteredEntry?.name).toBeTruthy();
        expect(encounteredEntry?.description).toBeTruthy();
        expect(encounteredEntry?.portraitUrl).toBe('/images/enemies/gkbot-repair.png');
        expect(encounteredEntry?.defeatedCount).toBe(4);

        const unencounteredEntry = bestiary.find(entry => entry.slug !== 'gkbot-repair');
        expect(unencounteredEntry?.encountered).toBe(false);
        expect(unencounteredEntry?.name).toBeUndefined();
        expect(unencounteredEntry?.description).toBeUndefined();
        expect(unencounteredEntry?.portraitUrl).toBeUndefined();
        expect(unencounteredEntry?.defeatedCount).toBeUndefined();
    });

    it('reports defeatedCount 0 for an encountered archetype with no recorded kills yet', async () => {
        getByIdForAccountMock.mockResolvedValue({
            characterId: 'char-1',
            accountId: 'account-1',
            encounteredArchetypeSlugs: ['gkbot-repair'],
            defeatedArchetypeCounts: {},
        });
        const service = new CharacterService();

        const bestiary = await service.getBestiary('account-1', 'char-1');

        expect(bestiary.find(entry => entry.slug === 'gkbot-repair')?.defeatedCount).toBe(0);
    });

    it('sorts encountered archetypes before un-encountered ones, regardless of their position in the static template arrays', async () => {
        getByIdForAccountMock.mockResolvedValue({
            characterId: 'char-1',
            accountId: 'account-1',
            // 'last-stand-maniac' is the very last entry across all 4 template
            // arrays — if sorting worked it must still land at index 0.
            encounteredArchetypeSlugs: ['last-stand-maniac'],
            defeatedArchetypeCounts: {},
        });
        const service = new CharacterService();

        const bestiary = await service.getBestiary('account-1', 'char-1');

        expect(bestiary[0]?.slug).toBe('last-stand-maniac');
        expect(bestiary[0]?.encountered).toBe(true);
        expect(bestiary.slice(1).every(entry => !entry.encountered)).toBe(true);
    });
});

describe('CharacterService.recordEncounteredArchetypes', () => {
    beforeEach(() => {
        addEncounteredArchetypeSlugsMock.mockReset();
    });

    it('writes the union of existing and newly-seen slugs when a new slug appears', async () => {
        const service = new CharacterService();

        await service.recordEncounteredArchetypes('char-1', ['gkbot-repair'], ['gkbot-repair', 'gkbot-security-unit']);

        expect(addEncounteredArchetypeSlugsMock).toHaveBeenCalledWith('char-1', ['gkbot-repair', 'gkbot-security-unit']);
    });

    it('does not write when every slug is already recorded', async () => {
        const service = new CharacterService();

        await service.recordEncounteredArchetypes('char-1', ['gkbot-repair'], ['gkbot-repair']);

        expect(addEncounteredArchetypeSlugsMock).not.toHaveBeenCalled();
    });
});

describe('CharacterService.recordDefeatedArchetypes', () => {
    beforeEach(() => {
        updateDefeatedArchetypeCountsMock.mockReset();
    });

    it('increments the count for a slug already on record', async () => {
        const service = new CharacterService();

        await service.recordDefeatedArchetypes('char-1', { 'gkbot-repair': 2 }, ['gkbot-repair']);

        expect(updateDefeatedArchetypeCountsMock).toHaveBeenCalledWith('char-1', { 'gkbot-repair': 3 });
    });

    it('starts a new slug at 1 the first time it is defeated', async () => {
        const service = new CharacterService();

        await service.recordDefeatedArchetypes('char-1', {}, ['gkbot-security-unit']);

        expect(updateDefeatedArchetypeCountsMock).toHaveBeenCalledWith('char-1', { 'gkbot-security-unit': 1 });
    });

    it('adds one count per occurrence when the same slug appears multiple times in one combat', async () => {
        const service = new CharacterService();

        await service.recordDefeatedArchetypes('char-1', { 'gkbot-repair': 1 }, ['gkbot-repair', 'gkbot-repair']);

        expect(updateDefeatedArchetypeCountsMock).toHaveBeenCalledWith('char-1', { 'gkbot-repair': 3 });
    });

    it('does not write when nothing was defeated', async () => {
        const service = new CharacterService();

        await service.recordDefeatedArchetypes('char-1', { 'gkbot-repair': 2 }, []);

        expect(updateDefeatedArchetypeCountsMock).not.toHaveBeenCalled();
    });
});
