import { BaseService } from './base.service';
import { CharacterRepository } from '../repositories/character.repository';
import {
    calculateBaseStats, applyEquipmentStats,
} from '../constants/stats';
import type {
    Character, CharacterWithStats, AllocateAttributesInput,
} from '../../shared/types/character';
import { BusinessLogicError } from '../../shared/types/errors';

export class CharacterService extends BaseService {
    protected serviceName = 'character';
    private characterRepo: CharacterRepository;

    constructor() {
        super();
        this.characterRepo = new CharacterRepository();
    }

    /**
     * Get character with server-computed stats (attributes + equipment bonus,
     * equipment bonus is empty until items-and-equipment change wires it in)
     */
    async getCharacterWithStats(accountId: string): Promise<CharacterWithStats> {
        let character = await this.characterRepo.getByAccountId(accountId);
        if (!character) {
            // Repairs the inconsistent state where an account exists but its character is missing
            this.logWarn('Character missing for existing account, creating character', {
                action: 'getCharacterWithStats',
                userId: accountId,
            });
            character = await this.characterRepo.createCharacter({ accountId });
        }

        const baseStats = await calculateBaseStats(character.attributes, character.level);
        const stats = applyEquipmentStats(baseStats, {});

        return {
            ...character,
            stats: {
                ...stats,
                HP_CURRENT: stats.HP_MAX,
            },
        };
    }

    /**
     * Allocate unspent attribute points
     * Rejects when the requested total exceeds unspentAttributePoints
     */
    async allocateAttributes(accountId: string, patch: AllocateAttributesInput): Promise<Character> {
        const character = await this.characterRepo.getByAccountId(accountId);
        if (!character) {
            throw new BusinessLogicError('Character not found');
        }

        const total = (patch.STR || 0) + (patch.AGI || 0) + (patch.CON || 0) + (patch.LUCK || 0);
        if (total > character.unspentAttributePoints) {
            throw new BusinessLogicError('Requested attribute points exceed unspentAttributePoints');
        }

        const attributes = {
            STR: character.attributes.STR + (patch.STR || 0),
            AGI: character.attributes.AGI + (patch.AGI || 0),
            CON: character.attributes.CON + (patch.CON || 0),
            LUCK: character.attributes.LUCK + (patch.LUCK || 0),
        };
        const unspentAttributePoints = character.unspentAttributePoints - total;

        return this.characterRepo.updateAttributes(accountId, {
            attributes,
            unspentAttributePoints,
        });
    }

    /**
     * Set (or overwrite) the character's leaderboard display name
     */
    async setNickname(accountId: string, nickname: string): Promise<Character> {
        return this.characterRepo.updateNickname(accountId, nickname);
    }
}
