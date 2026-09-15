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

vi.mock('./achievement.service', () => ({
    AchievementService: vi.fn().mockImplementation(function AchievementServiceMock() {
        return {};
    }),
}));

vi.mock('../repositories/achievement.repository', () => ({
    AchievementRepository: vi.fn().mockImplementation(function AchievementRepositoryMock() {
        return {};
    }),
}));

vi.mock('../repositories/quest.repository', () => ({
    QuestRepository: vi.fn().mockImplementation(function QuestRepositoryMock() {
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
        weaponProficiency: {},
        dualWieldProficiency: {
            exp: 0, level: 1,
        },
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

        // base 10 + (STR(2) + CON(3)) * 2 = 20, + talent carryCapacity (+1/rank * 3 ranks = 3) = 23
        expect(result.stats.carryCapacity).toBe(23);
    });
});

describe('CharacterService.getCharacterWithStats — weapon proficiency & weight overload', () => {
    function weaponItem(itemId: string, weaponType: string, overrides: Record<string, unknown> = {}) {
        return {
            itemId, templateId: `tmpl-${itemId}`, type: 'EQUIPMENT', equipSlot: 'RIGHT_HAND',
            weaponType, weight: 0, rarity: 'N', stats: {}, name: itemId, description: '', source: 'DROP',
            characterId: 'char-1', createdAt: Date.now(), ...overrides,
        };
    }

    it('applies the weaponType\'s ATK% bonus when a single weapon is equipped', async () => {
        const withoutWeapon = fighterCharacter({ equipment: {} });
        getByIdForAccountMock.mockResolvedValue(withoutWeapon);
        const service = new CharacterService();
        const baseline = await service.getCharacterWithStats('account-1', 'char-1');

        const withWeapon = fighterCharacter({
            equipment: { RIGHT_HAND: 'w1' },
            weaponProficiency: {
                FIST: {
                    exp: 3600, level: 5, 
                }, 
            },
        });
        getByIdForAccountMock.mockResolvedValue(withWeapon);
        itemGetByIdsMock.mockResolvedValue([weaponItem('w1', 'FIST')]);

        const result = await service.getCharacterWithStats('account-1', 'char-1');

        // Lv.5 FIST bonus: ATK +4% (see shared/constants/weaponProficiency.ts)
        expect(result.stats.ATK).toBe(Math.floor(baseline.stats.ATK * 1.04));
    });

    it('does not apply the dualWieldProficiency bonus when only one hand is a weapon', async () => {
        const single = fighterCharacter({
            equipment: { RIGHT_HAND: 'w1' },
            weaponProficiency: {
                FIST: {
                    exp: 0, level: 1, 
                }, 
            },
            dualWieldProficiency: {
                exp: 42000, level: 10, 
            },
        });
        getByIdForAccountMock.mockResolvedValue(single);
        itemGetByIdsMock.mockResolvedValue([weaponItem('w1', 'FIST')]);
        const service = new CharacterService();
        const singleHanded = await service.getCharacterWithStats('account-1', 'char-1');

        const noWeapon = fighterCharacter({ equipment: {} });
        getByIdForAccountMock.mockResolvedValue(noWeapon);
        itemGetByIdsMock.mockResolvedValue([]);
        const baseline = await service.getCharacterWithStats('account-1', 'char-1');

        // Lv.1 FIST bonus is 0, and the maxed-out dualWieldProficiency must
        // NOT apply since the character isn't actually dual-wielding.
        expect(singleHanded.stats.ATK).toBe(baseline.stats.ATK);
    });

    it('applies both the weaponType and dualWieldProficiency bonuses when both hands are weapons', async () => {
        const noWeapon = fighterCharacter({ equipment: {} });
        getByIdForAccountMock.mockResolvedValue(noWeapon);
        itemGetByIdsMock.mockResolvedValue([]);
        const service = new CharacterService();
        const baseline = await service.getCharacterWithStats('account-1', 'char-1');

        const dualWielding = fighterCharacter({
            equipment: {
                RIGHT_HAND: 'w1', LEFT_HAND: 'w2', 
            },
            weaponProficiency: {
                FIST: {
                    exp: 0, level: 1, 
                }, 
            },
            dualWieldProficiency: {
                exp: 300, level: 2, 
            },
        });
        getByIdForAccountMock.mockResolvedValue(dualWielding);
        itemGetByIdsMock.mockResolvedValue([weaponItem('w1', 'FIST'), weaponItem('w2', 'FIST')]);
        const result = await service.getCharacterWithStats('account-1', 'char-1');

        // FIST Lv.1 contributes 0%; dualWieldProficiency Lv.2 contributes +1% ATK.
        expect(result.stats.ATK).toBe(Math.floor(baseline.stats.ATK * 1.01));
    });

    it('applies the full-body weight-overload penalty when equipped weight exceeds carryCapacity', async () => {
        const noOverload = fighterCharacter({
            equipment: {}, attributes: {
                STR: 1, AGI: 1, CON: 1, LUCK: 1,
            },
        });
        getByIdForAccountMock.mockResolvedValue(noOverload);
        itemGetByIdsMock.mockResolvedValue([]);
        const service = new CharacterService();
        const baseline = await service.getCharacterWithStats('account-1', 'char-1');

        // carryCapacity = 10 + (STR(1)+CON(1)) * 2 = 14; one item weighing 15 overshoots by 1.
        const overloaded = fighterCharacter({
            equipment: { RIGHT_HAND: 'w1' }, attributes: {
                STR: 1, AGI: 1, CON: 1, LUCK: 1,
            },
        });
        getByIdForAccountMock.mockResolvedValue(overloaded);
        itemGetByIdsMock.mockResolvedValue([weaponItem('w1', 'FIST', { weight: 15 })]);
        const result = await service.getCharacterWithStats('account-1', 'char-1');

        expect(result.stats.actionIntervalSec).toBeCloseTo(baseline.stats.actionIntervalSec + 0.5);
    });

    it('lifts the weight-overload penalty once equipped weight no longer exceeds carryCapacity', async () => {
        const overloaded = fighterCharacter({
            equipment: { RIGHT_HAND: 'w1' }, attributes: {
                STR: 1, AGI: 1, CON: 1, LUCK: 1,
            },
        });
        getByIdForAccountMock.mockResolvedValue(overloaded);
        itemGetByIdsMock.mockResolvedValue([weaponItem('w1', 'FIST', { weight: 25 })]);
        const service = new CharacterService();
        const withPenalty = await service.getCharacterWithStats('account-1', 'char-1');
        expect(withPenalty.stats.actionIntervalSec).toBeGreaterThan(3 - 1 * 0.02);

        const unequipped = fighterCharacter({
            equipment: {}, attributes: {
                STR: 1, AGI: 1, CON: 1, LUCK: 1,
            },
        });
        getByIdForAccountMock.mockResolvedValue(unequipped);
        itemGetByIdsMock.mockResolvedValue([]);
        const withoutPenalty = await service.getCharacterWithStats('account-1', 'char-1');

        expect(withoutPenalty.stats.actionIntervalSec).toBeLessThan(withPenalty.stats.actionIntervalSec);
    });
});
