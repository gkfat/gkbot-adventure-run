import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { CharacterService } from './character.service';

const {
    listByAccountIdMock, createCharacterFromArchetypeMock, 
} = vi.hoisted(() => ({
    listByAccountIdMock: vi.fn(),
    createCharacterFromArchetypeMock: vi.fn(),
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: vi.fn().mockImplementation(function CharacterRepositoryMock() {
        return {
            listByAccountId: listByAccountIdMock,
            createCharacterFromArchetype: createCharacterFromArchetypeMock,
        };
    }),
    CHARACTER_ROSTER_MAX: 3,
}));

vi.mock('../repositories/item.repository', () => ({
    ItemRepository: vi.fn().mockImplementation(function ItemRepositoryMock() {
        return { getByIds: vi.fn().mockResolvedValue([]) };
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
});
