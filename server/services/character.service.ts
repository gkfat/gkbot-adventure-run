import { BaseService } from './base.service';
import {
    CharacterRepository, CHARACTER_ROSTER_MAX,
} from '../repositories/character.repository';
import { ItemRepository } from '../repositories/item.repository';
import {
    calculateBaseStats, applyEquipmentStats,
} from '../constants/stats';
import { sumEquipmentStats } from './item.service';
import { InventoryService } from './inventory.service';
import { EquipmentService } from './equipment.service';
import { ShopService } from './shop.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { AdventureRunRepository } from '../repositories/adventure-run.repository';
import {
    SELECTABLE_CHARACTER_ARCHETYPES, getArchetypeById,
} from '../constants/characterArchetypes';
import {
    getStarterEquipmentTemplateId, STARTER_POTION_TEMPLATE_ID,
} from '../../shared/constants/starterLoadout';
import type {
    Character, CharacterWithStats, CharacterSummary, AllocateAttributesInput,
} from '../../shared/types/character';
import {
    ItemSource, type ItemGenerationContext,
} from '../../shared/types/item';
import { Rarity } from '../../shared/types/common';
import {
    BusinessLogicError, NotFoundError,
} from '../../shared/types/errors';

export class CharacterService extends BaseService {
    protected serviceName = 'character';
    private characterRepo: CharacterRepository;
    private itemRepo: ItemRepository;
    private inventoryService: InventoryService;
    private equipmentService: EquipmentService;
    private inventoryRepo: InventoryRepository;
    private adventureRunRepo: AdventureRunRepository;
    private shopService: ShopService;

    constructor() {
        super();
        this.characterRepo = new CharacterRepository();
        this.itemRepo = new ItemRepository();
        this.inventoryService = new InventoryService();
        this.equipmentService = new EquipmentService();
        this.inventoryRepo = new InventoryRepository();
        this.adventureRunRepo = new AdventureRunRepository();
        this.shopService = new ShopService();
    }

    /**
     * List the caller's characters plus the available archetypes to create new ones from
     */
    async getRoster(accountId: string): Promise<{ characters: CharacterSummary[]; archetypes: typeof SELECTABLE_CHARACTER_ARCHETYPES }> {
        const characters = await this.characterRepo.listByAccountId(accountId);

        return {
            characters: characters.map(character => ({
                characterId: character.characterId,
                nickname: character.nickname,
                level: character.level,
                gold: character.gold,
                gems: character.gems,
                archetypeId: character.archetypeId,
                className: character.className,
                spriteUrl: getArchetypeById(character.archetypeId)?.spriteUrl ?? '/images/hero-sprite.png',
            })),
            archetypes: SELECTABLE_CHARACTER_ARCHETYPES,
        };
    }

    /**
     * Create a new character from an archetype. Rejects once the account already
     * owns CHARACTER_ROSTER_MAX characters, or if the archetypeId is unknown or retired.
     */
    async createCharacterFromArchetype(accountId: string, archetypeId: string): Promise<CharacterWithStats> {
        const archetype = getArchetypeById(archetypeId);
        if (!archetype || !archetype.isSelectable) {
            throw new BusinessLogicError('Unknown archetype');
        }

        const existing = await this.characterRepo.listByAccountId(accountId);
        if (existing.length >= CHARACTER_ROSTER_MAX) {
            throw new BusinessLogicError(`A character roster can have at most ${CHARACTER_ROSTER_MAX} characters`);
        }

        const character = await this.characterRepo.createCharacterFromArchetype(accountId, archetype);
        await this.grantStarterLoadout(accountId, character.characterId, archetype.archetypeId);

        const withLoadout = await this.characterRepo.getByIdForAccount(character.characterId, accountId);
        if (!withLoadout) {
            throw new NotFoundError('character');
        }
        return this.withStats(withLoadout);
    }

    /**
     * Grant a newly created character its starter loadout (character-starter-loadout,
     * weapon/armor-by-class): one N-rarity equipment piece themed to the
     * archetype (see getStarterEquipmentTemplateId), equipped straight into
     * its slot, and one N-rarity potion left in the permanent inventory.
     */
    private async grantStarterLoadout(accountId: string, characterId: string, archetypeId: string): Promise<void> {
        const context: ItemGenerationContext = {
            source: ItemSource.STARTER, maxRarity: Rarity.N,
        };

        const equipmentTemplateId = getStarterEquipmentTemplateId(archetypeId);
        const equipment = await this.inventoryService.grantItem(characterId, equipmentTemplateId, context);
        await this.inventoryService.grantItem(characterId, STARTER_POTION_TEMPLATE_ID, context);
        await this.equipmentService.equipItem(accountId, characterId, equipment.itemId);
    }

    /**
     * Get a character (must belong to the caller's account) with server-computed stats
     */
    async getCharacterWithStats(accountId: string, characterId: string): Promise<CharacterWithStats> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        return this.withStats(character);
    }

    /**
     * Allocate unspent attribute points on a character owned by the caller.
     * Rejects when the requested total exceeds unspentAttributePoints.
     */
    async allocateAttributes(accountId: string, characterId: string, patch: AllocateAttributesInput): Promise<Character> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
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

        return this.characterRepo.updateAttributes(characterId, {
            attributes,
            unspentAttributePoints,
        });
    }

    /**
     * Set (or overwrite) the display name of a character owned by the caller
     */
    async setNickname(accountId: string, characterId: string, nickname: string): Promise<Character> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        return this.characterRepo.updateNickname(characterId, nickname);
    }

    /**
     * Permanently delete a character owned by the caller. Equipped/inventory
     * items are released (their `items/{itemId}` documents are left intact —
     * only the character's `equipment` map and the character-owned
     * `inventories/{characterId}` reference list are removed, along with
     * every adventure run the character has ever started, and its per-character
     * shop documents — see ShopService.deleteShopsForCharacter, since once the
     * character is gone the shop's own lazy-destroy on next generation will
     * never run for it again) before the character document itself is removed.
     */
    async deleteCharacter(accountId: string, characterId: string): Promise<void> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        await this.adventureRunRepo.deleteAllByCharacterId(characterId);
        await this.inventoryRepo.delete(characterId);
        await this.shopService.deleteShopsForCharacter(characterId);
        await this.characterRepo.delete(characterId);
    }

    private async withStats(character: Character): Promise<CharacterWithStats> {
        const baseStats = calculateBaseStats(character.attributes);
        const equipmentBonus = await this.getEquipmentBonus(character);
        const stats = applyEquipmentStats(baseStats, equipmentBonus);

        // Only report keys equipment actually contributes to — sumEquipmentStats
        // always fills in all four keys (0 for unaffected ones), which would
        // otherwise show up as a misleading "+0" in the UI.
        const nonZeroBonus = Object.fromEntries(
            Object.entries(equipmentBonus).filter(([, value]) => value),
        );

        return {
            ...character,
            spriteUrl: getArchetypeById(character.archetypeId)?.spriteUrl ?? '/images/hero-sprite.png',
            stats: {
                ...stats,
                HP_CURRENT: stats.HP_MAX,
            },
            equipmentBonus: nonZeroBonus,
        };
    }

    /**
     * Look up the character's currently equipped items in the `items` collection
     * and sum their rolled stats into an equipment bonus for stat calculation.
     */
    private async getEquipmentBonus(character: Character) {
        const equippedItemIds = Object.values(character.equipment).filter((id): id is string => Boolean(id));
        if (equippedItemIds.length === 0) {
            return {};
        }

        const equippedItems = await this.itemRepo.getByIds(equippedItemIds);
        return sumEquipmentStats(equippedItems, character.attributes);
    }
}
