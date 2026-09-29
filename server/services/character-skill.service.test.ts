import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';

import { CharacterSkillService } from './character-skill.service';
import type { Character } from '../../shared/types/character';
import type {
    Inventory, ItemInstance, 
} from '../../shared/types/item';

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

const {
    docs, txGetMock, txSetMock, txUpdateMock, txDeleteMock, runTransactionMock, collectionMock,
} = vi.hoisted(() => {
    const docs = new Map<string, { exists: boolean; data?: () => unknown }>();

    const makeRef = (collectionName: string, id: string) => ({
        collectionName, id, 
    });

    const collectionMock = vi.fn((collectionName: string) => ({ doc: (id: string) => makeRef(collectionName, id) }));

    const txGetMock = vi.fn((ref: { collectionName: string; id: string }) => (
        Promise.resolve(docs.get(`${ref.collectionName}:${ref.id}`) ?? { exists: false })
    ));
    const txSetMock = vi.fn((ref: { collectionName: string; id: string }, data: unknown) => {
        docs.set(`${ref.collectionName}:${ref.id}`, {
            exists: true, data: () => data,
        });
    });
    const txUpdateMock = vi.fn((ref: { collectionName: string; id: string }, data: unknown) => {
        const key = `${ref.collectionName}:${ref.id}`;
        const existing = docs.get(key);
        docs.set(key, {
            exists: true, data: () => ({
                ...(existing?.data?.() as object ?? {}), ...(data as object), 
            }),
        });
    });
    const txDeleteMock = vi.fn((ref: { collectionName: string; id: string }) => {
        docs.delete(`${ref.collectionName}:${ref.id}`);
    });
    const runTransactionMock = vi.fn(async (callback: (tx: unknown) => unknown) => callback({
        get: txGetMock, set: txSetMock, update: txUpdateMock, delete: txDeleteMock,
    }));

    return {
        docs, txGetMock, txSetMock, txUpdateMock, txDeleteMock, runTransactionMock, collectionMock,
    };
});

vi.mock('../utils/firebaseAdmin', () => ({
    getAdminFirestore: () => ({
        collection: collectionMock,
        runTransaction: runTransactionMock,
    }),
}));

function setDoc(collectionName: string, id: string, data: unknown) {
    docs.set(`${collectionName}:${id}`, {
        exists: true, data: () => data,
    });
}

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
    docs.clear();
    txGetMock.mockClear();
    txSetMock.mockClear();
    txUpdateMock.mockClear();
    txDeleteMock.mockClear();
    runTransactionMock.mockClear();
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

    it('returns the full 10-skill catalog regardless of the character\'s archetype', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        const view = await service.getSkillsView('account-1', 'char-1');

        expect(view.skills).toHaveLength(10);
        expect(view.skills.some(skill => skill.skillId === 'scholar_weak_point_mark')).toBe(true);
    });

    it('reveals full detail for an unlocked skill and marks it equipped', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1, star: 1,
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
        expect(entry?.star).toBe(1);
        expect(entry?.isEquipped).toBe(true);
        expect(entry?.description).toBeTruthy();
        expect(entry?.effect?.kind).toBe('DAMAGE_SINGLE');
    });

    it('self-heals a legacy unlockedSkills entry missing star to star 1', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                // Cast through `as` since legacy Firestore docs predate `star`.
                fighter_crushing_blow: {
                    exp: 0, level: 1, 
                } as never,
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        const view = await service.getSkillsView('account-1', 'char-1');

        const entry = view.skills.find(skill => skill.skillId === 'fighter_crushing_blow');
        expect(entry?.star).toBe(1);
    });

    it('applies the star bonus to a skill\'s effective effect and chargeSec', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1, star: 3,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        const view = await service.getSkillsView('account-1', 'char-1');

        const entry = view.skills.find(skill => skill.skillId === 'fighter_crushing_blow');
        // Lv.1 base multiplier is 1.5; star 3 -> x1.2.
        expect(entry?.effect?.multiplier).toBeCloseTo(1.8);
        // Base chargeSec is 16; star 3 -> x0.9.
        expect(entry?.chargeSec).toBeCloseTo(14.4);
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
                    exp: 0, level: 1, star: 1,
                },
            },
        });
    });

    it('allows unlocking a skill that does not belong to the character\'s own archetype', async () => {
        const character = fighterCharacter({ skillFragments: { adventurer_second_wind: 100 } });
        getByIdForAccountMock.mockResolvedValue(character);
        updateSkillsMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await service.unlockSkill('account-1', 'char-1', 'adventurer_second_wind');

        expect(updateSkillsMock).toHaveBeenCalledWith('char-1', expect.objectContaining({
            unlockedSkills: {
                adventurer_second_wind: {
                    exp: 0, level: 1, star: 1,
                },
            },
        }));
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
                    exp: 0, level: 1, star: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.unlockSkill('account-1', 'char-1', 'fighter_crushing_blow')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects an unknown skillId', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.unlockSkill('account-1', 'char-1', 'not_a_real_skill')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });
});

describe('CharacterSkillService.starUpSkill', () => {
    it('stars up a Lv.10 skill, spending the star rank\'s fragment cost and resetting level/exp', async () => {
        const character = fighterCharacter({
            skillFragments: { fighter_crushing_blow: 60 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 3100, level: 10, star: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        updateSkillsMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        // Star 1 -> 2 costs 50 fragments.
        await service.starUpSkill('account-1', 'char-1', 'fighter_crushing_blow');

        expect(updateSkillsMock).toHaveBeenCalledWith('char-1', {
            skillFragments: { fighter_crushing_blow: 10 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1, star: 2,
                },
            },
        });
    });

    it('rejects star-up below max level', async () => {
        const character = fighterCharacter({
            skillFragments: { fighter_crushing_blow: 999 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 5, star: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.starUpSkill('account-1', 'char-1', 'fighter_crushing_blow')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects star-up at the max star rank', async () => {
        const character = fighterCharacter({
            skillFragments: { fighter_crushing_blow: 999 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 3100, level: 10, star: 5,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.starUpSkill('account-1', 'char-1', 'fighter_crushing_blow')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects star-up with insufficient fragments', async () => {
        const character = fighterCharacter({
            skillFragments: { fighter_crushing_blow: 10 },
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 3100, level: 10, star: 2,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        // Star 2 -> 3 costs 200 fragments.
        await expect(service.starUpSkill('account-1', 'char-1', 'fighter_crushing_blow')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });

    it('rejects star-up on a skill that is not unlocked', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        const service = new CharacterSkillService();

        await expect(service.starUpSkill('account-1', 'char-1', 'fighter_crushing_blow')).rejects.toThrow();
        expect(updateSkillsMock).not.toHaveBeenCalled();
    });
});

function chipItem(itemId: string): ItemInstance {
    return {
        itemId,
        templateId: 'skill_exp_chip',
        type: 'MATERIAL' as ItemInstance['type'],
        name: '技能經驗值晶片',
        description: '...',
        rarity: 'N' as ItemInstance['rarity'],
        stats: {},
        source: 'DROP' as ItemInstance['source'],
        characterId: 'char-1',
        createdAt: Date.now(),
    };
}

describe('CharacterSkillService.useSkillExpChip', () => {
    it('consumes chips, adds exp, applies level-up, and deletes the item docs', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 2, star: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        setDoc('characters', 'char-1', character);
        const inventory: Inventory = {
            characterId: 'char-1', items: ['item-1', 'item-2'], updatedAt: Date.now(),
        };
        setDoc('inventories', 'char-1', inventory);
        setDoc('items', 'item-1', chipItem('item-1'));
        setDoc('items', 'item-2', chipItem('item-2'));

        const service = new CharacterSkillService();
        // 2 chips * 50 exp = 100 exp -> Lv.3 threshold.
        const result = await service.useSkillExpChip('account-1', 'char-1', 'fighter_crushing_blow', ['item-1', 'item-2']);

        expect(result.unlockedSkills.fighter_crushing_blow).toEqual({
            exp: 100, level: 3, star: 1,
        });
        expect(txDeleteMock).toHaveBeenCalledTimes(2);
        expect(docs.has('items:item-1')).toBe(false);
        expect(docs.has('items:item-2')).toBe(false);
        expect((docs.get('inventories:char-1')?.data?.() as Inventory).items).toEqual([]);
    });

    it('rejects when the target skill is not unlocked', async () => {
        const character = fighterCharacter();
        getByIdForAccountMock.mockResolvedValue(character);
        setDoc('characters', 'char-1', character);
        setDoc('inventories', 'char-1', {
            characterId: 'char-1', items: ['item-1'], updatedAt: Date.now(),
        });
        setDoc('items', 'item-1', chipItem('item-1'));
        const service = new CharacterSkillService();

        await expect(service.useSkillExpChip('account-1', 'char-1', 'fighter_crushing_blow', ['item-1'])).rejects.toThrow();
        expect(docs.has('items:item-1')).toBe(true);
    });

    it('rejects when an itemId does not belong to the character\'s inventory', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 2, star: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        setDoc('characters', 'char-1', character);
        setDoc('inventories', 'char-1', {
            characterId: 'char-1', items: [], updatedAt: Date.now(),
        });
        setDoc('items', 'item-1', chipItem('item-1'));
        const service = new CharacterSkillService();

        await expect(service.useSkillExpChip('account-1', 'char-1', 'fighter_crushing_blow', ['item-1'])).rejects.toThrow();
        expect(docs.has('items:item-1')).toBe(true);
    });

    it('rejects when an item is not a Skill Exp Chip', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 2, star: 1,
                },
            },
        });
        getByIdForAccountMock.mockResolvedValue(character);
        setDoc('characters', 'char-1', character);
        setDoc('inventories', 'char-1', {
            characterId: 'char-1', items: ['item-1'], updatedAt: Date.now(),
        });
        setDoc('items', 'item-1', {
            ...chipItem('item-1'), templateId: 'engine_oil_basic', 
        });
        const service = new CharacterSkillService();

        await expect(service.useSkillExpChip('account-1', 'char-1', 'fighter_crushing_blow', ['item-1'])).rejects.toThrow();
        expect(docs.has('items:item-1')).toBe(true);
    });
});

describe('CharacterSkillService.equipSkill', () => {
    it('equips an unlocked skill into an open slot', async () => {
        const character = fighterCharacter({
            unlockedSkills: {
                fighter_crushing_blow: {
                    exp: 0, level: 1, star: 1,
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
                    exp: 0, level: 1, star: 1,
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
                    exp: 0, level: 1, star: 1,
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
