import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { CharacterSkillService } from './character-skill.service';
import type { Character } from '../../shared/types/character';

const {
    getByIdForAccountMock, updateSkillsMock, 
} = vi.hoisted(() => ({
    getByIdForAccountMock: vi.fn(),
    updateSkillsMock: vi.fn(),
}));

vi.mock('../repositories/character.repository', () => ({
    CharacterRepository: vi.fn().mockImplementation(function CharacterRepositoryMock() {
        return {
            getByIdForAccount: getByIdForAccountMock,
            updateSkills: updateSkillsMock,
        };
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
        talentPoints: 0,
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
        hasRenamed: false,
        encounteredArchetypeSlugs: [],
        defeatedArchetypeCounts: {},
        skillFragments: {},
        unlockedSkills: {},
        equippedSkillIds: [
            null,
            null,
            null,
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

beforeEach(() => {
    getByIdForAccountMock.mockReset();
    updateSkillsMock.mockReset();
});

describe('CharacterSkillService.getSkillsView', () => {
    it('hides description/effect for skills with no fragments and not unlocked', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        const view = await service.getSkillsView('account-1', 'char-1');

        const entry = view.skills.find(skill => skill.skillId === 'fighter_crushing_blow');
        expect(entry).toBeDefined();
        expect(entry?.unlocked).toBe(false);
        expect(entry?.fragmentCount).toBe(0);
        expect(entry).not.toHaveProperty('description');
        expect(entry).not.toHaveProperty('effect');
    });

    it('reveals full detail for an unlocked skill and marks it equipped', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
            equippedSkillIds: [
                'fighter_crushing_blow',
                null,
                null,
            ],
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        const view = await service.getSkillsView('account-1', 'char-1');

        const entry = view.skills.find(skill => skill.skillId === 'fighter_crushing_blow');
        expect(entry?.unlocked).toBe(true);
        expect(entry?.level).toBe(1);
        expect(entry?.isEquipped).toBe(true);
        expect(entry?.description).toBeTruthy();
        expect(entry?.effect?.kind).toBe('DAMAGE_SINGLE');
    });

    it('derives unlockedSlotCount from character level', async () => {
        getByIdForAccountMock.mockResolvedValue(fighterCharacter({ level: 7 }));
        const service = new CharacterSkillService();

        const view = await service.getSkillsView('account-1', 'char-1');

        expect(view.unlockedSlotCount).toBe(2);
    });
});

describe('CharacterSkillService.unlockSkill', () => {
    it('unlocks a skill and spends exactly unlockFragmentCost fragments', async () => {
        const character = fighterCharacter({ skillFragments: { fighter_crushing_blow: 25 } });
        getByIdForAccountMock.mockResolvedValue(character);
        updateSkillsMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await service.unlockSkill('account-1', 'char-1', 'fighter_crushing_blow');

        expect(updateSkillsMock).toHaveBeenCalledWith('char-1', {
            skillFragments: { fighter_crushing_blow: 5 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
        });
    });

    it('rejects when fragments are insufficient', async () => {
        const character = fighterCharacter({ skillFragments: { fighter_crushing_blow: 5 } });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.unlockSkill('account-1', 'char-1', 'fighter_crushing_blow')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects unlocking an already-unlocked skill', async () => {
        const character = fighterCharacter({
            skillFragments: { fighter_crushing_blow: 100 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.unlockSkill('account-1', 'char-1', 'fighter_crushing_blow')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects a skill that does not belong to the character\'s archetype', async () => {
        const character = fighterCharacter({ skillFragments: { adventurer_second_wind: 100 } });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.unlockSkill('account-1', 'char-1', 'adventurer_second_wind')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });
});

describe('CharacterSkillService.strengthenSkill', () => {
    it('converts spent fragments to exp and applies level-up', async () => {
        const character = fighterCharacter({
            skillFragments: { fighter_crushing_blow: 10 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        updateSkillsMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        // FRAGMENT_TO_EXP_RATE=10, 10 fragments -> 100 exp, Lv.3 threshold is 100.
        await service.strengthenSkill('account-1', 'char-1', 'fighter_crushing_blow', 10);

        expect(updateSkillsMock).toHaveBeenCalledWith('char-1', {
            skillFragments: { fighter_crushing_blow: 0 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 100, level: 3,
                },
            },
        });
    });

    it('rejects strengthening a skill that is not unlocked', async () => {
        const character = fighterCharacter({ skillFragments: { fighter_crushing_blow: 10 } });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.strengthenSkill('account-1', 'char-1', 'fighter_crushing_blow', 5)).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects spending more fragments than held', async () => {
        const character = fighterCharacter({
            skillFragments: { fighter_crushing_blow: 3 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.strengthenSkill('account-1', 'char-1', 'fighter_crushing_blow', 5)).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });
});

describe('CharacterSkillService.equipSkill', () => {
    it('equips an unlocked skill into an open slot', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        updateSkillsMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await service.equipSkill('account-1', 'char-1', 'fighter_crushing_blow', 0);

        expect(updateSkillsMock).toHaveBeenCalledWith('char-1', {
            equippedSkillIds: [
                'fighter_crushing_blow',
                null,
                null,
            ], 
        });
    });

    it('rejects equipping into a slot beyond unlockedSlotCount', async () => {
        const character = fighterCharacter({
            level: 3,
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.equipSkill('account-1', 'char-1', 'fighter_crushing_blow', 1)).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects equipping a skill not yet unlocked', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.equipSkill('account-1', 'char-1', 'fighter_crushing_blow', 0)).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects equipping a skill already equipped in another slot', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1,
                },
            },
            equippedSkillIds: [
                'fighter_crushing_blow',
                null,
                null,
            ],
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.equipSkill('account-1', 'char-1', 'fighter_crushing_blow', 1)).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('unequips a skill by passing skillId null', async () => {
        const character = fighterCharacter({
            equippedSkillIds: [
                'fighter_crushing_blow',
                null,
                null,
            ], 
        });
        getByIdForAccountMock.mockResolvedValue(character);
        updateSkillsMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await service.equipSkill('account-1', 'char-1', null, 0);

        expect(updateSkillsMock).toHaveBeenCalledWith('char-1', {
            equippedSkillIds: [
                null,
                null,
                null,
            ], 
        });
    });
});
