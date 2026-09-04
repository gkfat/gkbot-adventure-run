import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { CharacterService } from './character.service';
import type { Character } from '../../shared/types/character';

const {
    getByIdForAccountMock, updateTalentsMock, itemGetByIdsMock,
} = vi.hoisted(() => ({
    getByIdForAccountMock: vi.fn(),
    updateTalentsMock: vi.fn(),
    itemGetByIdsMock: vi.fn(),
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: vi.fn().mockImplementation(function CharacterRepositoryMock() {
        return {
            getByIdForAccount: getByIdForAccountMock,
            updateTalents: updateTalentsMock,
        };
    }),
    CHARACTER_ROSTER_MAX: 3,
}));

vi.mock('../repositories/item.repository', () => ({
    ItemRepository: vi.fn().mockImplementation(function ItemRepositoryMock() {
        return { getByIds: itemGetByIdsMock };
    }),
}));

vi.mock('../repositories/inventory.repository', () => ({
    InventoryRepository: vi.fn().mockImplementation(function InventoryRepositoryMock() {
        return {};
    }),
}));

vi.mock('../repositories/adventure-run.repository', () => ({
    AdventureRunRepository: vi.fn().mockImplementation(function AdventureRunRepositoryMock() {
        return {};
    }),
}));

vi.mock('./inventory.service', () => ({
    InventoryService: vi.fn().mockImplementation(function InventoryServiceMock() {
        return {};
    }),
}));

vi.mock('./equipment.service', () => ({
    EquipmentService: vi.fn().mockImplementation(function EquipmentServiceMock() {
        return {};
    }),
}));

vi.mock('./shop.service', () => ({
    ShopService: vi.fn().mockImplementation(function ShopServiceMock() {
        return {};
    }),
}));

function fighterCharacter(overrides: Partial<Character> = {}): Character {
    return {
        characterId: 'char-1',
        accountId: 'account-1',
        archetypeId: 'fighter',
        className: '戰士',
        level: 5,
        exp: 0,
        gold: 0,
        gems: 0,
        attributes: {
            STR: 4, AGI: 1, CON: 4, LUCK: 1,
        },
        unspentAttributePoints: 0,
        talentPoints: 5,
        talents: {},
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

beforeEach(() => {
    getByIdForAccountMock.mockReset();
    updateTalentsMock.mockReset();
    itemGetByIdsMock.mockReset();
    itemGetByIdsMock.mockResolvedValue([]);
});

describe('CharacterService.allocateTalentPoint', () => {
    it('allows investing in a tier-1 node (always open)', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        updateTalentsMock.mockResolvedValue(character);
        const service = new CharacterService();

        await service.allocateTalentPoint('account-1', 'char-1', 'fighter_t1');

        expect(updateTalentsMock).toHaveBeenCalledWith('char-1', {
            talents: { fighter_t1: 1 },
            talentPoints: 4,
        });
    });

    it('rejects when talentPoints is 0', async () => {
        const character = fighterCharacter({ talentPoints: 0 });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        await expect(service.allocateTalentPoint('account-1', 'char-1', 'fighter_t1')).rejects.toThrow();
        expect(updateTalentsMock).not.toHaveBeenCalled();
    });

    it('rejects when the node is already at maxRank', async () => {
        const character = fighterCharacter({ talents: { fighter_t1: 3 } });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        await expect(service.allocateTalentPoint('account-1', 'char-1', 'fighter_t1')).rejects.toThrow();
        expect(updateTalentsMock).not.toHaveBeenCalled();
    });

    it('rejects investing in a tier-2 node before tier-1 is maxed', async () => {
        const character = fighterCharacter({ talents: { fighter_t1: 2 } });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        await expect(service.allocateTalentPoint('account-1', 'char-1', 'fighter_t2a')).rejects.toThrow();
        expect(updateTalentsMock).not.toHaveBeenCalled();
    });

    it('allows investing in a tier-2 node once tier-1 is maxed', async () => {
        const character = fighterCharacter({ talents: { fighter_t1: 3 } });
        getByIdForAccountMock.mockResolvedValue(character);
        updateTalentsMock.mockResolvedValue(character);
        const service = new CharacterService();

        await service.allocateTalentPoint('account-1', 'char-1', 'fighter_t2a');

        expect(updateTalentsMock).toHaveBeenCalledWith('char-1', {
            talents: {
                fighter_t1: 3, fighter_t2a: 1, 
            },
            talentPoints: 4,
        });
    });

    it('permanently locks the opposing branch once one branch has been invested in', async () => {
        const character = fighterCharacter({
            talents: {
                fighter_t1: 3, fighter_t2a: 1, 
            }, 
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        await expect(service.allocateTalentPoint('account-1', 'char-1', 'fighter_t2b')).rejects.toThrow();
        expect(updateTalentsMock).not.toHaveBeenCalled();
    });

    it('allows continuing to invest in the already-chosen branch up to maxRank', async () => {
        const character = fighterCharacter({
            talents: {
                fighter_t1: 3, fighter_t2a: 1, 
            }, 
        });
        getByIdForAccountMock.mockResolvedValue(character);
        updateTalentsMock.mockResolvedValue(character);
        const service = new CharacterService();

        await service.allocateTalentPoint('account-1', 'char-1', 'fighter_t2a');

        expect(updateTalentsMock).toHaveBeenCalledWith('char-1', {
            talents: {
                fighter_t1: 3, fighter_t2a: 2, 
            },
            talentPoints: 4,
        });
    });

    it('rejects allocating on a character not owned by the caller', async () => {
        getByIdForAccountMock.mockResolvedValue(null);
        const service = new CharacterService();

        await expect(service.allocateTalentPoint('account-1', 'char-1', 'fighter_t1')).rejects.toThrow();
        expect(updateTalentsMock).not.toHaveBeenCalled();
    });

    it('rejects an unknown nodeId', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        await expect(service.allocateTalentPoint('account-1', 'char-1', 'does_not_exist')).rejects.toThrow();
        expect(updateTalentsMock).not.toHaveBeenCalled();
    });
});

describe('CharacterService.getCharacterWithStats — talentBonus', () => {
    it('reflects invested talent ranks in stats and talentBonus (DEF +2/rank at rank 2)', async () => {
        // fighter_t3 effect: ATK +2, DEF +1 per rank
        const character = fighterCharacter({ talents: { fighter_t3: 2 } });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        const before = await service.getCharacterWithStats('account-1', 'char-1');

        const withoutTalents = fighterCharacter({ talents: {} });
        getByIdForAccountMock.mockResolvedValue(withoutTalents);
        const baseline = await service.getCharacterWithStats('account-1', 'char-1');

        expect(before.stats.DEF).toBe(baseline.stats.DEF + 2);
        expect(before.talentBonus.DEF).toBe(2);
        expect(before.stats.ATK).toBe(baseline.stats.ATK + 4);
        expect(before.talentBonus.ATK).toBe(4);
    });

    it('leaves stats unchanged and talentBonus empty when no talents are invested', async () => {
        const character = fighterCharacter({ talents: {} });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        const result = await service.getCharacterWithStats('account-1', 'char-1');

        expect(result.talentBonus).toEqual({});
    });

    it('adds talent carryCapacity bonus on top of attributes (STR+CON)', async () => {
        // fighter_t1 effect includes carryCapacity +1/rank
        const character = fighterCharacter({
            attributes: {
                STR: 2, AGI: 1, CON: 3, LUCK: 1,
            },
            talents: { fighter_t1: 3 },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterService();

        const result = await service.getCharacterWithStats('account-1', 'char-1');

        // STR(2) + CON(3) = 5, + talent carryCapacity (+1/rank * 3 ranks = 3) = 8
        expect(result.stats.carryCapacity).toBe(8);
    });
});
