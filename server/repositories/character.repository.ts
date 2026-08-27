/**
 * Character Repository
 * Handles Firestore operations for Character collection
 */

import { BaseRepository } from './base.repository';
import type { Character } from '../../shared/types/character';
import { characterSchema } from '../../shared/schemas/firestore/character.schema';
import { DatabaseError } from '../../shared/types/errors';

export class CharacterRepository extends BaseRepository<Character> {
    protected collectionName = 'characters';

    /**
     * Generate the default leaderboard display name for a newly created character.
     * Derived deterministically from accountId (last 6 chars, uppercased) so it
     * needs no uniqueness check or counter document.
     *
     * @param accountId - Account ID
     * @returns Default nickname, e.g. "玩家A1B2C3"
     */
    generateDefaultNickname(accountId: string): string {
        const suffix = accountId.slice(-6).toUpperCase();
        return `玩家${suffix}`;
    }

    /**
     * Prepare initial character data (DRY principle)
     * This ensures all character creation uses the same initial values
     *
     * @param accountId - Account ID (used as character ID for 1:1 mapping)
     * @returns Initial character data
     */
    prepareInitialCharacterData(accountId: string): Character {
        const timestamp = Date.now();

        const characterData = {
            characterId: accountId,
            accountId: accountId,

            // Initial progression
            level: 1,
            exp: 0,

            // Initial currency
            gold: 0,
            gems: 0,

            // Initial attributes (all set to 1)
            attributes: {
                STR: 1,
                AGI: 1,
                CON: 1,
                LUCK: 1,
            },
            unspentAttributePoints: 0,

            // No equipment initially
            equipment: {},

            // Leaderboard display name (player can override via nickname endpoint)
            nickname: this.generateDefaultNickname(accountId),

            // Timestamps
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        // Validate against schema (development safety check)
        const validated = characterSchema.parse(characterData);
        return validated as Character;
    }

    /**
     * Get character by account ID (1:1 relationship)
     * 
     * @param accountId - Account ID
     * @returns Character or null if not found
     * @throws DatabaseError if data integrity violation detected
     */
    async getByAccountId(accountId: string): Promise<Character | null> {
        try {
            const character = await this.getById(accountId);
            if (!character) return null;

            // Explicit validation: ensure characterId matches accountId
            if (character.characterId !== accountId) {
                throw new DatabaseError(
                    `Data integrity violation: character.characterId (${character.characterId}) !== accountId (${accountId})`,
                );
            }

            // Backfill nickname for characters created before it became required
            if (!character.nickname) {
                return this.updateNickname(accountId, this.generateDefaultNickname(accountId));
            }

            return character;
        } catch (error: unknown) {
            if (error instanceof DatabaseError) throw error;
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to get character: ${message}`);
        }
    }

    /**
     * Create new character with initial values
     * 
     * @param data - Object containing accountId
     * @returns Created character
     * @throws DatabaseError if creation fails
     */
    async createCharacter(data: {
        accountId: string;
    }): Promise<Character> {
        try {
            const characterData = this.prepareInitialCharacterData(data.accountId);

            // Use accountId as document ID (ensures 1:1 mapping)
            const docRef = this.getDocumentRef(data.accountId);
            await docRef.set(characterData);

            return characterData;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new DatabaseError(`Failed to create character: ${message}`);
        }
    }

    /**
     * Update character attributes and unspent points
     *
     * @param accountId - Account ID
     * @param patch - New attributes and unspentAttributePoints
     * @returns Updated character
     * @throws DatabaseError if update fails
     */
    async updateAttributes(
        accountId: string,
        patch: { attributes: Character['attributes']; unspentAttributePoints: number },
    ): Promise<Character> {
        return this.update(accountId, patch);
    }

    /**
     * Update character nickname
     *
     * @param accountId - Account ID
     * @param nickname - New nickname (1~20 chars)
     * @returns Updated character
     * @throws DatabaseError if update fails
     */
    async updateNickname(accountId: string, nickname: string): Promise<Character> {
        return this.update(accountId, { nickname });
    }
}
