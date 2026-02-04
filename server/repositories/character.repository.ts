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
     * Prepare initial character data (DRY principle)
     * This ensures all character creation uses the same initial values
     * 
     * @param accountId - Account ID (used as character ID for 1:1 mapping)
     * @returns Initial character data
     */
    prepareInitialCharacterData(accountId: string): Omit<Character, 'equipment' | 'nickname'> & Partial<Pick<Character, 'equipment' | 'nickname'>> {
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
            
            // Initial healing potion (level 1, no cooldown)
            healingPotion: {
                level: 1,
                coolDownUntil: 0,
            },
            
            // Timestamps
            createdAt: timestamp,
            updatedAt: timestamp,
        } as const;
        
        // Note: equipment and nickname are optional fields
        // We don't include them initially (Firestore doesn't accept undefined)

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
}
