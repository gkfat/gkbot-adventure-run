/**
 * Character Skill Service (character-skills / skill-universal-star-upgrade) —
 * fragment/unlock/level/star/equip management for a character's skills.
 * Combat-time charge/trigger/effect resolution (deciding *whether* exp was
 * gained or a fragment/chip dropped) stays in combat-engine's own
 * CombatService; this service owns the actual persistence of that outcome
 * (recordSkillExpGained/grantFragments) plus the player-facing
 * unlock/star-up/use-exp-chip/equip actions and query-side view assembly.
 *
 * Skills are no longer exclusive to the archetype that originally defined
 * them (skill-universal-star-upgrade) — any character can unlock/equip any of
 * the 10 skills in `ALL_CHARACTER_SKILLS`.
 */
import { BaseService } from './base.service';
import { CharacterRepository } from '../repositories/character.repository';
import { getAdminFirestore } from '../utils/firebaseAdmin';
import {
    ALL_CHARACTER_SKILLS, getCharacterSkillById, applyStarBonus, applyStarBonusToChargeSec,
} from '../../shared/constants/characterSkills';
import {
    SKILL_MAX_LEVEL, SKILL_STAR_MAX, SKILL_STAR_UP_FRAGMENT_COST, SKILL_EXP_PER_CHIP,
    EXP_PER_SKILL_TRIGGER, getSkillLevelForExp, getUnlockedSkillSlotCount,
} from '../../shared/constants/skills';
import type {
    Character, SkillProgress,
} from '../../shared/types/character';
import type { SkillEntry } from '../../shared/schemas/api/character-skill.schema';
import type {
    Inventory, ItemInstance, 
} from '../../shared/types/item';
import {
    BusinessLogicError, NotFoundError,
} from '../../shared/types/errors';

/** Self-heal a possibly-legacy SkillProgress (written before `star` existed) to always carry `star`. */
function withStar(progress: SkillProgress): Required<SkillProgress> {
    return {
        exp: progress.exp, level: progress.level, star: progress.star ?? 1,
    };
}

export class CharacterSkillService extends BaseService {
    protected serviceName = 'character-skill';
    private characterRepo: CharacterRepository;
    private db = getAdminFirestore();

    constructor() {
        super();
        this.characterRepo = new CharacterRepository();
    }

    /**
     * Assemble the skills view for a character owned by the caller
     * (character-skills「查詢角色技能資料」) — the full 10-skill catalog,
     * not filtered by the character's archetype.
     */
    async getSkillsView(accountId: string, characterId: string): Promise<{
        skills: SkillEntry[];
        unlockedSlotCount: number;
        equippedSkillIds: Character['equippedSkillIds'];
    }> {
        const character = await this.getOwnedCharacter(accountId, characterId);

        const skills: SkillEntry[] = ALL_CHARACTER_SKILLS.map((skill) => {
            const fragmentCount = character.skillFragments[skill.skillId] ?? 0;
            const rawProgress = character.unlockedSkills[skill.skillId];
            const unlocked = Boolean(rawProgress);

            if (!unlocked) {
                return {
                    skillId: skill.skillId,
                    name: skill.name,
                    icon: skill.icon,
                    unlockFragmentCost: skill.unlockFragmentCost,
                    fragmentCount,
                    unlocked: false,
                };
            }

            const progress = withStar(rawProgress);
            const levelEffect = skill.effectByLevel[progress.level - 1];
            const effect = levelEffect ? applyStarBonus(levelEffect, progress.star) : undefined;
            const chargeSec = applyStarBonusToChargeSec(skill.chargeSec, progress.star);

            return {
                skillId: skill.skillId,
                name: skill.name,
                icon: skill.icon,
                unlockFragmentCost: skill.unlockFragmentCost,
                fragmentCount,
                description: skill.description,
                unlocked: true,
                level: progress.level,
                exp: progress.exp,
                star: progress.star,
                effect,
                effectByLevel: [...skill.effectByLevel],
                chargeSec,
                isEquipped: character.equippedSkillIds.includes(skill.skillId),
            };
        });

        return {
            skills,
            unlockedSlotCount: getUnlockedSkillSlotCount(character.level),
            equippedSkillIds: character.equippedSkillIds,
        };
    }

    /**
     * Unlock a skill by spending `unlockFragmentCost` fragments
     * (character-skills「解鎖技能」) — any of the 10 skills, not restricted to
     * the character's own archetype.
     */
    async unlockSkill(accountId: string, characterId: string, skillId: string): Promise<Character> {
        const character = await this.getOwnedCharacter(accountId, characterId);
        const skill = this.requireKnownSkill(skillId);

        if (character.unlockedSkills[skillId]) {
            throw new BusinessLogicError('Skill is already unlocked');
        }

        const fragmentCount = character.skillFragments[skillId] ?? 0;
        if (fragmentCount < skill.unlockFragmentCost) {
            throw new BusinessLogicError('Not enough skill fragments');
        }

        const skillFragments = {
            ...character.skillFragments, [skillId]: fragmentCount - skill.unlockFragmentCost,
        };
        const unlockedSkills: Record<string, SkillProgress> = {
            ...character.unlockedSkills, [skillId]: {
                exp: 0, level: 1, star: 1,
            },
        };

        return this.characterRepo.updateSkills(characterId, {
            skillFragments, unlockedSkills,
        });
    }

    /**
     * Star-up an already-Lv.10 skill (character-skills「技能星等」): consumes
     * `SKILL_STAR_UP_FRAGMENT_COST[star + 1]` fragments, then resets the
     * skill back to `{ level: 1, exp: 0 }` at the new star rank.
     */
    async starUpSkill(accountId: string, characterId: string, skillId: string): Promise<Character> {
        const character = await this.getOwnedCharacter(accountId, characterId);
        this.requireKnownSkill(skillId);

        const rawProgress = character.unlockedSkills[skillId];
        if (!rawProgress) {
            throw new BusinessLogicError('Skill is not unlocked yet');
        }
        const progress = withStar(rawProgress);

        if (progress.level < SKILL_MAX_LEVEL) {
            throw new BusinessLogicError('Skill must reach max level before it can be star-upped');
        }
        if (progress.star >= SKILL_STAR_MAX) {
            throw new BusinessLogicError('Skill has already reached the max star rank');
        }

        const nextStar = progress.star + 1;
        const fragmentCost = SKILL_STAR_UP_FRAGMENT_COST[nextStar];
        if (fragmentCost === undefined) {
            throw new BusinessLogicError('Unknown star rank cost');
        }

        const fragmentCount = character.skillFragments[skillId] ?? 0;
        if (fragmentCount < fragmentCost) {
            throw new BusinessLogicError('Not enough skill fragments');
        }

        const skillFragments = {
            ...character.skillFragments, [skillId]: fragmentCount - fragmentCost,
        };
        const unlockedSkills: Record<string, SkillProgress> = {
            ...character.unlockedSkills, [skillId]: {
                exp: 0, level: 1, star: nextStar,
            },
        };

        return this.characterRepo.updateSkills(characterId, {
            skillFragments, unlockedSkills,
        });
    }

    /**
     * Consume one or more Skill Exp Chip item instances from the character's
     * permanent inventory to add `itemIds.length * SKILL_EXP_PER_CHIP` exp to
     * an unlocked skill (character-skills「技能經驗值晶片直接升級」). Runs as a
     * single Firestore transaction across the character/inventory/items
     * aggregates (same pattern as InventoryService.sellItem) — either every
     * chip is consumed and exp applied, or nothing changes.
     */
    async useSkillExpChip(accountId: string, characterId: string, skillId: string, itemIds: string[]): Promise<Character> {
        const ownedCharacter = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!ownedCharacter) {
            throw new NotFoundError('character');
        }
        this.requireKnownSkill(skillId);

        const characterRef = this.db.collection('characters').doc(characterId);
        const inventoryRef = this.db.collection('inventories').doc(characterId);

        return this.db.runTransaction(async (tx) => {
            const characterDoc = await tx.get(characterRef);
            if (!characterDoc.exists) {
                throw new NotFoundError('character');
            }
            const character = characterDoc.data() as Character;

            const rawProgress = character.unlockedSkills[skillId];
            if (!rawProgress) {
                throw new BusinessLogicError('Skill is not unlocked yet');
            }

            const inventoryDoc = await tx.get(inventoryRef);
            const inventory: Inventory = inventoryDoc.exists
                ? (inventoryDoc.data() as Inventory)
                : {
                    characterId, items: [], updatedAt: Date.now(),
                };

            const itemRefs = itemIds.map(itemId => this.db.collection('items').doc(itemId));
            const itemDocs = await Promise.all(itemRefs.map(ref => tx.get(ref)));

            for (let i = 0; i < itemIds.length; i++) {
                const itemId = itemIds[i] as string;
                if (!inventory.items.includes(itemId)) {
                    throw new BusinessLogicError('One or more chips do not belong to this character\'s inventory');
                }
                const itemDoc = itemDocs[i];
                if (!itemDoc || !itemDoc.exists) {
                    throw new NotFoundError('item');
                }
                const item = itemDoc.data() as ItemInstance;
                if (item.templateId !== 'skill_exp_chip') {
                    throw new BusinessLogicError('One or more items are not a Skill Exp Chip');
                }
            }

            const progress = withStar(rawProgress);
            const exp = progress.exp + itemIds.length * SKILL_EXP_PER_CHIP;
            const level = Math.min(SKILL_MAX_LEVEL, getSkillLevelForExp(exp));
            const unlockedSkills: Record<string, SkillProgress> = {
                ...character.unlockedSkills, [skillId]: {
                    exp, level, star: progress.star,
                },
            };

            tx.update(characterRef, {
                unlockedSkills, updatedAt: Date.now(),
            });
            tx.set(inventoryRef, {
                characterId,
                items: inventory.items.filter(itemId => !itemIds.includes(itemId)),
                updatedAt: Date.now(),
            });
            for (const itemRef of itemRefs) {
                tx.delete(itemRef);
            }

            return {
                ...character, unlockedSkills, updatedAt: Date.now(),
            };
        });
    }

    /**
     * Place (or clear, when `skillId` is null) an unlocked skill into
     * `slotIndex` of the character's equip loadout (character-skills
     * 「裝備與卸下技能」).
     */
    async equipSkill(accountId: string, characterId: string, skillId: string | null, slotIndex: 0 | 1 | 2): Promise<Character> {
        const character = await this.getOwnedCharacter(accountId, characterId);

        const equippedSkillIds: Character['equippedSkillIds'] = [...character.equippedSkillIds];

        if (skillId === null) {
            equippedSkillIds[slotIndex] = null;
            return this.characterRepo.updateSkills(characterId, { equippedSkillIds });
        }

        const unlockedSlotCount = getUnlockedSkillSlotCount(character.level);
        if (slotIndex >= unlockedSlotCount) {
            throw new BusinessLogicError('This skill slot is not unlocked yet');
        }

        if (!character.unlockedSkills[skillId]) {
            throw new BusinessLogicError('Skill is not unlocked yet');
        }

        if (character.equippedSkillIds.some((id, index) => id === skillId && index !== slotIndex)) {
            throw new BusinessLogicError('Skill is already equipped in another slot');
        }

        equippedSkillIds[slotIndex] = skillId;
        return this.characterRepo.updateSkills(characterId, { equippedSkillIds });
    }

    /**
     * Tally this combat's skill-trigger exp gains into `unlockedSkills`
     * (character-skills「戰鬥觸發累積技能 exp」) — a one-time write at combat
     * resolution, same pattern as CharacterService.recordWeaponProficiency.
     * `existingUnlockedSkills`/`triggerCounts` are the caller's (CombatService)
     * already-fetched character progress and already-tallied per-skill
     * trigger counts for this fight; a call with no triggers no-ops without a
     * Firestore write. Only already-unlocked skillIds in `triggerCounts` are
     * applied — an enemy-only skill or a stale id is silently skipped.
     */
    async recordSkillExpGained(
        characterId: string,
        existingUnlockedSkills: Character['unlockedSkills'],
        triggerCounts: Record<string, number>,
    ): Promise<void> {
        const unlockedSkills: Record<string, SkillProgress> = { ...existingUnlockedSkills };
        let changed = false;

        for (const [skillId, count] of Object.entries(triggerCounts)) {
            const rawProgress = unlockedSkills[skillId];
            if (!rawProgress || !count) continue;
            const progress = withStar(rawProgress);
            const exp = progress.exp + count * EXP_PER_SKILL_TRIGGER;
            const level = Math.min(SKILL_MAX_LEVEL, getSkillLevelForExp(exp));
            unlockedSkills[skillId] = {
                exp, level, star: progress.star,
            };
            changed = true;
        }

        if (!changed) return;
        await this.characterRepo.updateSkills(characterId, { unlockedSkills });
    }

    /**
     * Grant `amount` fragments of `skillId` to a character (character-skills
     * 「戰鬥掉落」/商店購買技能碎片) — no ownership check, called internally by
     * trusted server-side flows (CombatService/ShopService) that already
     * fetched the character themselves.
     */
    async grantFragments(characterId: string, existingFragments: Character['skillFragments'], skillId: string, amount: number): Promise<void> {
        if (amount <= 0) return;
        const skillFragments = {
            ...existingFragments, [skillId]: (existingFragments[skillId] ?? 0) + amount,
        };
        await this.characterRepo.updateSkills(characterId, { skillFragments });
    }

    private async getOwnedCharacter(accountId: string, characterId: string): Promise<Character> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }
        return character;
    }

    private requireKnownSkill(skillId: string) {
        const skill = getCharacterSkillById(skillId);
        if (!skill) {
            throw new BusinessLogicError('Unknown skill');
        }
        return skill;
    }
}
