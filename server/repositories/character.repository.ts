/**
 * Character Repository
 * Handles Firestore operations for Character collection
 *
 * One account can own 0~3 characters (see CHARACTER_ROSTER_MAX). Characters created
 * before the multi-character roster shipped are identified by document ID === accountId
 * and lack accountId/archetypeId/className; they are self-healed into 'legacy'
 * characters the first time listByAccountId reads them (see listByAccountId).
 */

import { BaseRepository } from './base.repository';
import type { Character } from '../../shared/types/character';
import { EXP_TABLE } from '../../shared/types/character';
import {
    AdventureEndReason, rollChapterTotalLevels,
} from '../../shared/types/adventure';
import { characterSchema } from '../../shared/schemas/firestore/character.schema';
import {
    DatabaseError, NotFoundError,
} from '../../shared/types/errors';
import {
    RESOURCE_LIMITS, clamp, type Attributes,
} from '../../shared/types/common';
import {
    LEGACY_ARCHETYPE_ID, LEGACY_CLASS_NAME, type CharacterArchetype,
} from '../constants/templates/characterArchetypes';
import { random } from '../services/rng.service';
import { calculateAttributePower } from '../../shared/utils/calculateStats';

export const CHARACTER_ROSTER_MAX = 3;

/**
 * Backfill `nextChapterIndex` for character documents written before
 * `single-stage-run-settlement` shipped (same "不做資料回填" tolerance
 * pattern as AdventureRunRepository.withStageDefaults).
 */
function withNextChapterDefault(character: Character): Character {
    return {
        ...character, nextChapterIndex: character.nextChapterIndex ?? 0,
    };
}

/**
 * Deterministic roll for a chapter's total level count, from the character's
 * own id + the chapter index — no persisted seed needed, and stable across
 * repeated calls for the same (characterId, chapterIndex) pair (chapter-level-structure).
 */
function rollChapterTotalLevelsForCharacter(characterId: string, chapterIndex: number, attributes: Attributes): number {
    return rollChapterTotalLevels(calculateAttributePower(attributes), chapterIndex, random(characterId, chapterIndex));
}

/**
 * Backfill `currentLevelIndex`/`chapterTotalLevels` for character documents
 * written before `chapter-level-structure` shipped — same "不做資料回填"
 * tolerance pattern as withNextChapterDefault, made stable by deriving
 * `chapterTotalLevels` deterministically (see rollChapterTotalLevelsForCharacter)
 * instead of persisting a rolled value.
 */
function withLevelDefaults(character: Character): Character {
    return {
        ...character,
        currentLevelIndex: character.currentLevelIndex ?? 0,
        chapterTotalLevels: character.chapterTotalLevels
            ?? rollChapterTotalLevelsForCharacter(character.characterId, character.nextChapterIndex, character.attributes),
    };
}

/**
 * Backfill `talentPoints`/`talents` for character documents written before
 * `character-talent-tree` shipped — same "不做資料回填" tolerance pattern as
 * withNextChapterDefault/withLevelDefaults.
 */
function withTalentDefaults(character: Character): Character {
    return {
        ...character,
        talentPoints: character.talentPoints ?? 0,
        talents: character.talents ?? {},
    };
}

function withCharacterDefaults(character: Character): Character {
    return withTalentDefaults(withLevelDefaults(withNextChapterDefault(character)));
}

export class CharacterRepository extends BaseRepository<Character> {
    protected collectionName = 'characters';

    override async getById(id: string): Promise<Character | null> {
        const character = await super.getById(id);
        return character ? withCharacterDefaults(character) : null;
    }

    /**
     * Default display name for a newly created character, derived from its class
     * and the last 6 chars of its (already-unique) characterId — no uniqueness
     * check or counter needed, and it won't collide with the account's other characters.
     */
    generateArchetypeNickname(className: string, characterId: string): string {
        const suffix = characterId.slice(-6).toUpperCase();
        return `${className}${suffix}`;
    }

    /**
     * Legacy default nickname format used before the roster shipped (accountId-derived).
     * Only used to backfill pre-roster characters that never got a nickname.
     */
    generateLegacyDefaultNickname(accountId: string): string {
        const suffix = accountId.slice(-6).toUpperCase();
        return `玩家${suffix}`;
    }

    /**
     * Build a new character document for a given archetype
     */
    private prepareCharacterData(params: {
        accountId: string;
        characterId: string;
        archetype: CharacterArchetype;
    }): Character {
        const timestamp = Date.now();
        const {
            accountId, characterId, archetype, 
        } = params;

        const characterData = {
            characterId,
            accountId,

            archetypeId: archetype.archetypeId,
            className: archetype.className,

            level: 1,
            exp: 0,

            gold: 0,
            gems: 0,

            attributes: { ...archetype.attributes },
            unspentAttributePoints: 0,

            talentPoints: 0,
            talents: {},

            equipment: {},

            nextChapterIndex: 0,
            currentLevelIndex: 0,
            chapterTotalLevels: rollChapterTotalLevelsForCharacter(characterId, 0, archetype.attributes),

            nickname: this.generateArchetypeNickname(archetype.className, characterId),

            createdAt: timestamp,
            updatedAt: timestamp,
        };

        const validated = characterSchema.parse(characterData);
        return validated as Character;
    }

    /**
     * Create a new character for an account using the given archetype.
     * Uses a Firestore auto-generated document ID (accounts can own multiple characters).
     *
     * @throws DatabaseError if creation fails
     */
    async createCharacterFromArchetype(accountId: string, archetype: CharacterArchetype): Promise<Character> {
        try {
            const docRef = this.collection.doc();
            const characterData = this.prepareCharacterData({
                accountId,
                characterId: docRef.id,
                archetype,
            });

            await docRef.set(characterData);
            return characterData;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create character: ${message}`);
        }
    }

    /**
     * List all characters owned by an account.
     *
     * Self-heals the pre-roster single-character shape: if no character has an
     * `accountId` field matching this account, checks the legacy document path
     * (`characters/{accountId}`) and backfills accountId/archetypeId/className
     * (and nickname if it was somehow missing) onto that same document in place.
     */
    async listByAccountId(accountId: string): Promise<Character[]> {
        try {
            const snapshot = await this.collection.where('accountId', '==', accountId).get();
            const characters = this.snapshotToArray(snapshot);

            if (characters.length > 0) {
                return characters;
            }

            const legacyCharacter = await this.getById(accountId);
            if (!legacyCharacter) {
                return [];
            }

            const migrated = await this.update(accountId, {
                accountId,
                archetypeId: LEGACY_ARCHETYPE_ID,
                className: LEGACY_CLASS_NAME,
                nickname: legacyCharacter.nickname || this.generateLegacyDefaultNickname(accountId),
            });

            return [migrated];
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to list characters: ${message}`);
        }
    }

    /**
     * Get a character by ID, but only if it belongs to the given account.
     * Returns null both when the character doesn't exist and when it belongs
     * to someone else, so callers can't distinguish "not found" from "not yours".
     */
    async getByIdForAccount(characterId: string, accountId: string): Promise<Character | null> {
        try {
            const character = await this.getById(characterId);
            if (!character || character.accountId !== accountId) {
                return null;
            }
            return character;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get character: ${message}`);
        }
    }

    /**
     * Update character attributes and unspent points
     */
    async updateAttributes(
        characterId: string,
        patch: { attributes: Character['attributes']; unspentAttributePoints: number },
    ): Promise<Character> {
        return this.update(characterId, patch);
    }

    /**
     * Update character talents and remaining talentPoints (character-talents).
     * A single update, not a transaction — see design.md decision 3: talent
     * allocation doesn't touch gold/exp-style fields that need
     * read-modify-write protection, and the frontend refetches after every
     * allocation, making rapid concurrent requests unlikely.
     */
    async updateTalents(
        characterId: string,
        patch: { talents: Character['talents']; talentPoints: number },
    ): Promise<Character> {
        return this.update(characterId, patch);
    }

    /**
     * Update character nickname
     */
    async updateNickname(characterId: string, nickname: string): Promise<Character> {
        return this.update(characterId, { nickname });
    }

    /**
     * Apply an adventure run's settlement rewards: clamp gold/gems into the
     * character's totals, grant EXP, and roll any level-ups (ASSUMPTION,
     * undocumented elsewhere: +1 unspentAttributePoint per level — see
     * adventure-run-core/design.md). `goldEarned`/`gemsEarned` are 0 when the
     * caller already decided the run failed (single-stage-run-settlement:
     * only a `COMPLETED` run keeps gold/gems — that decision is made by the
     * caller, not here).
     *
     * Chapter/Level advance (chapter-level-structure): a `COMPLETED` run only
     * advances `currentLevelIndex` (same chapter, same facility theme) unless
     * it just cleared the chapter's last level — only then does
     * `nextChapterIndex` advance, `currentLevelIndex` reset to 0, and a new
     * `chapterTotalLevels` get rolled for the new chapter. DEAD/DISCONNECT
     * touch neither. Runs inside a transaction since it's a read-modify-write
     * on the same document a concurrent equip/attribute allocation could also
     * be touching.
     */
    async settleRunRewards(characterId: string, rewards: {
        goldEarned: number;
        gemsEarned: number;
        expGained: number;
        endReason: AdventureEndReason;
    }): Promise<{
        character: Character; leveledUp: boolean; unspentAttributePointsGained: number; chapterAdvanced: boolean;
    }> {
        const docRef = this.getDocumentRef(characterId);

        try {
            return await this.db.runTransaction(async (tx) => {
                const doc = await tx.get(docRef);
                if (!doc.exists) {
                    throw new NotFoundError('character');
                }
                const character = withCharacterDefaults(doc.data() as Character);

                const gold = clamp(character.gold + rewards.goldEarned, 0, RESOURCE_LIMITS.GOLD_MAX - 1);
                const gems = clamp(character.gems + rewards.gemsEarned, 0, RESOURCE_LIMITS.GEMS_MAX - 1);

                let { level } = character;
                let exp = character.exp + rewards.expGained;
                let unspentAttributePoints = character.unspentAttributePoints;
                let { talentPoints } = character;

                while (level < RESOURCE_LIMITS.LEVEL_MAX && exp >= (EXP_TABLE[level] ?? Infinity)) {
                    exp -= EXP_TABLE[level] as number;
                    level += 1;
                    unspentAttributePoints += 1;
                    talentPoints += 1;
                }
                if (level >= RESOURCE_LIMITS.LEVEL_MAX) {
                    exp = 0;
                }

                let {
                    nextChapterIndex, currentLevelIndex, chapterTotalLevels, 
                } = character;
                let chapterAdvanced = false;

                if (rewards.endReason === AdventureEndReason.COMPLETED) {
                    const nextLevelIndex = character.currentLevelIndex + 1;
                    if (nextLevelIndex < character.chapterTotalLevels) {
                        currentLevelIndex = nextLevelIndex;
                    } else {
                        nextChapterIndex = character.nextChapterIndex + 1;
                        currentLevelIndex = 0;
                        chapterTotalLevels = rollChapterTotalLevelsForCharacter(characterId, nextChapterIndex, character.attributes);
                        chapterAdvanced = true;
                    }
                }

                const updated: Character = {
                    ...character, gold, gems, level, exp, unspentAttributePoints, talentPoints, nextChapterIndex, currentLevelIndex, chapterTotalLevels,
                };
                tx.update(docRef, {
                    gold, gems, level, exp, unspentAttributePoints, talentPoints, nextChapterIndex, currentLevelIndex, chapterTotalLevels, updatedAt: Date.now(),
                });

                return {
                    character: updated,
                    leveledUp: level > character.level,
                    unspentAttributePointsGained: level - character.level,
                    chapterAdvanced,
                };
            });
        } catch (error: unknown) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to settle run rewards: ${message}`);
        }
    }
}
