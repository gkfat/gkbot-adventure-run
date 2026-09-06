import { BaseService } from './base.service';
import {
    CharacterRepository, CHARACTER_ROSTER_MAX,
} from '../repositories/character.repository';
import { ItemRepository } from '../repositories/item.repository';
import {
    calculateBaseStats, applyEquipmentStats, applyTalentStats,
} from '../constants/stats';
import { sumEquipmentStats } from './item.service';
import { InventoryService } from './inventory.service';
import { EquipmentService } from './equipment.service';
import { ShopService } from './shop.service';
import { AchievementService } from './achievement.service';
import { AchievementType } from '../../shared/types/quest';
import { InventoryRepository } from '../repositories/inventory.repository';
import { AdventureRunRepository } from '../repositories/adventure-run.repository';
import {
    SELECTABLE_CHARACTER_ARCHETYPES, getArchetypeById,
} from '../constants/templates/characterArchetypes';
import { getTalentTreeByArchetypeId } from '../constants/templates/talentTrees';
import {
    ENEMY_ARCHETYPES, GKBOT_BOSS_ARCHETYPES, HUMAN_ARCHETYPES, HUMAN_BOSS_ARCHETYPES,
    type EnemyArchetype,
} from '../constants/templates/enemies';
import {
    getEnemyPortraitUrl, type EnemyAvatarTier, 
} from '../../shared/utils/enemyAvatar';
import type { EnemyFaction } from '../../shared/types/adventure';
import type { BestiaryEntry } from '../../shared/schemas/api/bestiary.schema';
import {
    getStarterEquipmentTemplateIds, STARTER_POTION_TEMPLATE_ID,
} from '../../shared/constants/starterLoadout';
import type {
    Character, CharacterWithStats, CharacterSummary, AllocateAttributesInput, TalentTree,
} from '../../shared/types/character';
import {
    ItemSource, type ItemGenerationContext,
} from '../../shared/types/item';
import {
    Rarity, type Stats,
} from '../../shared/types/common';
import {
    BusinessLogicError, NotFoundError,
} from '../../shared/types/errors';

/**
 * All 32 bestiary entries (enemy-bestiary spec.md "查詢圖鑑 API"), each
 * paired with the faction/tier needed to resolve its portrait fallback.
 */
const BESTIARY_ARCHETYPES: { archetype: EnemyArchetype; faction: EnemyFaction; tier: EnemyAvatarTier }[] = [
    ...ENEMY_ARCHETYPES.map(archetype => ({
        archetype, faction: 'GKBOT' as const, tier: 'normal' as const,
    })),
    ...GKBOT_BOSS_ARCHETYPES.map(archetype => ({
        archetype, faction: 'GKBOT' as const, tier: 'boss' as const,
    })),
    ...HUMAN_ARCHETYPES.map(archetype => ({
        archetype, faction: 'HUMAN' as const, tier: 'normal' as const,
    })),
    ...HUMAN_BOSS_ARCHETYPES.map(archetype => ({
        archetype, faction: 'HUMAN' as const, tier: 'boss' as const,
    })),
];

export class CharacterService extends BaseService {
    protected serviceName = 'character';
    private characterRepo: CharacterRepository;
    private itemRepo: ItemRepository;
    private inventoryService: InventoryService;
    private equipmentService: EquipmentService;
    private inventoryRepo: InventoryRepository;
    private adventureRunRepo: AdventureRunRepository;
    private shopService: ShopService;
    private achievementService: AchievementService;

    constructor() {
        super();
        this.characterRepo = new CharacterRepository();
        this.itemRepo = new ItemRepository();
        this.inventoryService = new InventoryService();
        this.equipmentService = new EquipmentService();
        this.inventoryRepo = new InventoryRepository();
        this.adventureRunRepo = new AdventureRunRepository();
        this.shopService = new ShopService();
        this.achievementService = new AchievementService();
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
     * owns CHARACTER_ROSTER_MAX characters, or if the archetypeId is unknown.
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
        // A brand-new character already starts inside chapterIndex 0's
        // facility theme (getFacilityTheme) — that first chapter's "level
        // generation" happens right here at creation, not at the character's
        // first chapterAdvanced transition, so wasteland_cartographer must
        // count it too (see achievement.ts's targetCount, which now spans
        // the full FACILITY_THEMES list to match).
        await this.achievementService.incrementProgress(character.characterId, AchievementType.DISCOVER_FACILITIES, 1);

        const withLoadout = await this.characterRepo.getByIdForAccount(character.characterId, accountId);
        if (!withLoadout) {
            throw new NotFoundError('character');
        }
        return this.withStats(withLoadout);
    }

    /**
     * Grant a newly created character its starter loadout (character-starter-loadout,
     * weapon/armor-by-class): two N-rarity equipment pieces themed to the
     * archetype (see getStarterEquipmentTemplateIds), each equipped straight
     * into its own slot, and one N-rarity potion left in the permanent inventory.
     */
    private async grantStarterLoadout(accountId: string, characterId: string, archetypeId: string): Promise<void> {
        const context: ItemGenerationContext = {
            source: ItemSource.STARTER, maxRarity: Rarity.N,
        };

        const equipmentTemplateIds = getStarterEquipmentTemplateIds(archetypeId);
        for (const equipmentTemplateId of equipmentTemplateIds) {
            const equipment = await this.inventoryService.grantItem(characterId, equipmentTemplateId, context);
            await this.equipmentService.equipItem(accountId, characterId, equipment.itemId);
        }
        await this.inventoryService.grantItem(characterId, STARTER_POTION_TEMPLATE_ID, context);
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
     * Invest 1 talent point into a node on a character owned by the caller
     * (character-talents). Validation order follows design.md decision 3:
     * node exists -> talentPoints available -> node not already maxRank ->
     * previous tier has a maxRank node (tier 1 always open) -> the opposing
     * branch (if any) hasn't been invested in.
     */
    async allocateTalentPoint(accountId: string, characterId: string, nodeId: string): Promise<Character> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        const tree = getTalentTreeByArchetypeId(character.archetypeId);
        const node = tree?.nodes.find(n => n.nodeId === nodeId);
        if (!tree || !node) {
            throw new BusinessLogicError('Unknown talent node');
        }

        if (character.talentPoints < 1) {
            throw new BusinessLogicError('Not enough talentPoints');
        }

        const currentRank = character.talents[nodeId] ?? 0;
        if (currentRank >= node.maxRank) {
            throw new BusinessLogicError('Talent node is already at maxRank');
        }

        if (node.tier > 1) {
            const previousTierNodes = tree.nodes.filter(n => n.tier === node.tier - 1);
            const previousTierOpened = previousTierNodes.some(n => (character.talents[n.nodeId] ?? 0) >= n.maxRank);
            if (!previousTierOpened) {
                throw new BusinessLogicError('Previous talent tier is not fully invested yet');
            }
        }

        if (node.branchGroup) {
            const opposingBranchNode = tree.nodes.find(
                n => n.tier === node.tier && n.branchGroup === node.branchGroup && n.nodeId !== node.nodeId,
            );
            if (opposingBranchNode && (character.talents[opposingBranchNode.nodeId] ?? 0) > 0) {
                throw new BusinessLogicError('Opposing talent branch is already locked in');
            }
        }

        const talents = {
            ...character.talents, [nodeId]: currentRank + 1,
        };
        const talentPoints = character.talentPoints - 1;

        return this.characterRepo.updateTalents(characterId, {
            talents,
            talentPoints,
        });
    }

    /**
     * Merge newly-seen archetype slugs into a character's bestiary progress
     * (enemy-bestiary). `existingSlugs` is the caller's already-fetched
     * character.encounteredArchetypeSlugs, so this only issues a Firestore
     * write when at least one slug in `archetypeSlugs` isn't already there
     * (design.md Risks: avoid a write on every repeat encounter).
     */
    async recordEncounteredArchetypes(characterId: string, existingSlugs: string[], archetypeSlugs: string[]): Promise<void> {
        const newSlugs = archetypeSlugs.filter(slug => !existingSlugs.includes(slug));
        if (newSlugs.length === 0) {
            return;
        }
        await this.characterRepo.addEncounteredArchetypeSlugs(characterId, [...existingSlugs, ...newSlugs]);
    }

    /**
     * Tally newly-defeated archetype slugs into a character's kill counts
     * (enemy-bestiary kill-count tracking). `existingCounts` is the caller's
     * already-fetched character.defeatedArchetypeCounts; `defeatedSlugs` is
     * one entry per unit actually defeated in the combat (so a slug killed
     * twice in one fight appears twice). No-ops when nothing was defeated.
     */
    async recordDefeatedArchetypes(characterId: string, existingCounts: Record<string, number>, defeatedSlugs: string[]): Promise<void> {
        if (defeatedSlugs.length === 0) {
            return;
        }
        const counts = { ...existingCounts };
        for (const slug of defeatedSlugs) {
            counts[slug] = (counts[slug] ?? 0) + 1;
        }
        await this.characterRepo.updateDefeatedArchetypeCounts(characterId, counts);
    }

    /**
     * Get the full enemy bestiary for a character owned by the caller
     * (enemy-bestiary). Every archetype is included; `name`/`description`/
     * `portraitUrl` are only attached when the character has encountered it
     * (spec.md "查詢圖鑑 API 依遭遇狀態決定資料揭露程度") — the server, not the
     * frontend, is the disclosure boundary.
     */
    async getBestiary(accountId: string, characterId: string): Promise<BestiaryEntry[]> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        const entries = BESTIARY_ARCHETYPES.map(({
            archetype, faction, tier,
        }) => {
            const encountered = character.encounteredArchetypeSlugs.includes(archetype.slug);
            if (!encountered) {
                return {
                    slug: archetype.slug, encountered,
                };
            }
            return {
                slug: archetype.slug,
                encountered,
                name: archetype.name,
                description: archetype.description,
                portraitUrl: getEnemyPortraitUrl(archetype.slug, faction, tier),
                defeatedCount: character.defeatedArchetypeCounts[archetype.slug] ?? 0,
            };
        });

        // 已遇過的敵人排在最前面 — Array.prototype.sort is stable, so each
        // group (encountered / un-encountered) keeps BESTIARY_ARCHETYPES' order.
        return entries.sort((a, b) => Number(b.encountered) - Number(a.encountered));
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
     * Permanently delete a character owned by the caller. All items it owns
     * (equipped + permanent inventory) are permanently deleted from the
     * top-level `items` collection, along with the character's `equipment`
     * map and the character-owned `inventories/{characterId}` reference
     * list, every adventure run the character has ever started, and its
     * per-character shop documents — see ShopService.deleteShopsForCharacter,
     * since once the character is gone the shop's own lazy-destroy on next
     * generation will never run for it again — before the character
     * document itself is removed.
     */
    async deleteCharacter(accountId: string, characterId: string): Promise<void> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }

        const inventory = await this.inventoryRepo.getByCharacterId(characterId);
        const ownedItemIds = [...new Set([...Object.values(character.equipment), ...inventory.items])];

        await this.itemRepo.deleteByIds(ownedItemIds);
        await this.adventureRunRepo.deleteAllByCharacterId(characterId);
        await this.inventoryRepo.delete(characterId);
        await this.shopService.deleteShopsForCharacter(characterId);
        await this.characterRepo.delete(characterId);
    }

    private async withStats(character: Character): Promise<CharacterWithStats> {
        const baseStats = calculateBaseStats(character.attributes);
        const equipmentBonus = await this.getEquipmentBonus(character);
        const afterEquipment = applyEquipmentStats(baseStats, equipmentBonus);
        // Legacy (pre-roster) characters have no talent tree — treat as empty.
        const talentTree: TalentTree = getTalentTreeByArchetypeId(character.archetypeId)
            ?? {
                archetypeId: character.archetypeId, nodes: [], 
            };
        const talentBonus = this.getTalentBonus(character, talentTree);
        const stats = applyTalentStats(afterEquipment, talentBonus);

        // Only report keys equipment/talents actually contribute to —
        // sumEquipmentStats/getTalentBonus always fill in every key they touch
        // (0 for uninvested ones), which would otherwise show up as a
        // misleading "+0" in the UI.
        const nonZeroBonus = Object.fromEntries(
            Object.entries(equipmentBonus).filter(([, value]) => value),
        );
        const nonZeroTalentBonus = Object.fromEntries(
            Object.entries(talentBonus).filter(([, value]) => value),
        );

        return {
            ...character,
            spriteUrl: getArchetypeById(character.archetypeId)?.spriteUrl ?? '/images/hero-sprite.png',
            stats: {
                ...stats,
                HP_CURRENT: stats.HP_MAX,
            },
            equipmentBonus: nonZeroBonus,
            talentBonus: nonZeroTalentBonus,
            talentTree,
        };
    }

    /**
     * Sum the stat effects of every invested talent node (rank > 0) on the
     * character's archetype tree (character-talents) — the talent-tree
     * equivalent of sumEquipmentStats.
     */
    private getTalentBonus(character: Character, talentTree: TalentTree): Partial<Stats> {
        const bonus: Partial<Stats> = {};

        for (const node of talentTree.nodes) {
            const rank = character.talents[node.nodeId] ?? 0;
            if (rank <= 0) continue;

            for (const effect of node.effect) {
                bonus[effect.stat] = (bonus[effect.stat] ?? 0) + effect.perRank * rank;
            }
        }

        return bonus;
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
