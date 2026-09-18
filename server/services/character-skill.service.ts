/**
 * Character Skill Service (character-skills) — fragment/unlock/level/equip
 * management for a character's skills. Combat-time charge/trigger/effect
 * resolution (deciding *whether* exp was gained or a fragment dropped) stays
 * in combat-engine's own CombatService; this service owns the actual
 * persistence of that outcome (recordSkillExpGained/grantFragments) plus the
 * player-facing unlock/strengthen/equip actions and query-side view assembly.
 */
import { BaseService } from './base.service';
import { CharacterRepository } from '../repositories/character.repository';
import {
    getCharacterSkillsByArchetypeId, getCharacterSkillById, 
} from '../../shared/constants/characterSkills';
import {
    SKILL_MAX_LEVEL, FRAGMENT_TO_EXP_RATE, EXP_PER_SKILL_TRIGGER, getSkillLevelForExp, getUnlockedSkillSlotCount,
} from '../../shared/constants/skills';
import type {
    Character, SkillProgress, 
} from '../../shared/types/character';
import type { SkillEntry } from '../../shared/schemas/api/character-skill.schema';
import {
    BusinessLogicError, NotFoundError,
} from '../../shared/types/errors';

export class CharacterSkillService extends BaseService {
    protected serviceName = 'character-skill';
    private characterRepo: CharacterRepository;

    constructor() {
        super();
        this.characterRepo = new CharacterRepository();
    }

    /**
     * Assemble the skills view for a character owned by the caller
     * (character-skills「查詢角色技能資料」). Skills the character hasn't
     * taken any fragments of and hasn't unlocked only expose
     * skillId/name/icon/unlockFragmentCost/fragmentCount(0) — no
     * description/effect detail leak.
     */
    async getSkillsView(accountId: string, characterId: string): Promise<{
        skills: SkillEntry[];
        unlockedSlotCount: number;
        equippedSkillIds: Character['equippedSkillIds'];
    }> {
        const character = await this.getOwnedCharacter(accountId, characterId);
        const catalog = getCharacterSkillsByArchetypeId(character.archetypeId);

        const skills: SkillEntry[] = catalog.map((skill) => {
            const fragmentCount = character.skillFragments[skill.skillId] ?? 0;
            const progress = character.unlockedSkills[skill.skillId];
            const unlocked = Boolean(progress);

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
                effect: skill.effectByLevel[progress.level - 1],
                effectByLevel: [...skill.effectByLevel],
                chargeSec: skill.chargeSec,
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
     * (character-skills「解鎖技能」).
     */
    async unlockSkill(accountId: string, characterId: string, skillId: string): Promise<Character> {
        const character = await this.getOwnedCharacter(accountId, characterId);
        const skill = this.requireOwnArchetypeSkill(character, skillId);

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
                exp: 0, level: 1, 
            },
        };

        return this.characterRepo.updateSkills(characterId, {
            skillFragments, unlockedSkills,
        });
    }

    /**
     * Consume `fragmentsToSpend` fragments of an already-unlocked skill,
     * converting them to exp at FRAGMENT_TO_EXP_RATE and applying the level-up
     * check (character-skills「消耗碎片主動強化技能」).
     */
    async strengthenSkill(accountId: string, characterId: string, skillId: string, fragmentsToSpend: number): Promise<Character> {
        const character = await this.getOwnedCharacter(accountId, characterId);
        this.requireOwnArchetypeSkill(character, skillId);

        const progress = character.unlockedSkills[skillId];
        if (!progress) {
            throw new BusinessLogicError('Skill is not unlocked yet');
        }

        const fragmentCount = character.skillFragments[skillId] ?? 0;
        if (fragmentsToSpend > fragmentCount) {
            throw new BusinessLogicError('Not enough skill fragments');
        }

        const exp = progress.exp + fragmentsToSpend * FRAGMENT_TO_EXP_RATE;
        const level = Math.min(SKILL_MAX_LEVEL, getSkillLevelForExp(exp));

        const skillFragments = {
            ...character.skillFragments, [skillId]: fragmentCount - fragmentsToSpend,
        };
        const unlockedSkills: Record<string, SkillProgress> = {
            ...character.unlockedSkills, [skillId]: {
                exp, level, 
            },
        };

        return this.characterRepo.updateSkills(characterId, {
            skillFragments, unlockedSkills,
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
            const progress = unlockedSkills[skillId];
            if (!progress || !count) continue;
            const exp = progress.exp + count * EXP_PER_SKILL_TRIGGER;
            const level = Math.min(SKILL_MAX_LEVEL, getSkillLevelForExp(exp));
            unlockedSkills[skillId] = {
                exp, level, 
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

    private requireOwnArchetypeSkill(character: Character, skillId: string) {
        const skill = getCharacterSkillById(skillId);
        if (!skill || skill.archetypeId !== character.archetypeId) {
            throw new BusinessLogicError('Unknown skill for this character');
        }
        return skill;
    }
}
