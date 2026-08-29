import { getItemTemplate } from '../constants/templates';
import type { Stats } from '../../shared/types/common';
import { Rarity } from '../../shared/types/common';
import { ItemType } from '../../shared/types/item';
import type {
    ItemInstance, ItemStats, ItemTemplate, ItemGenerationContext, StatRange, RolledItem,
} from '../../shared/types/item';
import { NotFoundError } from '../../shared/types/errors';

/**
 * Rarity ordering from lowest to highest. Used for weighted rolls and
 * for capping a roll to a maximum rarity (e.g. shop tier limits).
 */
export const RARITY_ORDER: Rarity[] = [
    Rarity.N,
    Rarity.R,
    Rarity.SR,
    Rarity.SSR,
    Rarity.L,
];

/**
 * Roll a rarity for the given template, weighted by `rarityWeights`.
 * When `context.maxRarity` is set, rarities above it are excluded before weighting.
 */
export function rollRarity(templateId: string, context: ItemGenerationContext): Rarity {
    const template = getTemplateOrThrow(templateId);

    const maxRarityIndex = context.maxRarity
        ? RARITY_ORDER.indexOf(context.maxRarity)
        : RARITY_ORDER.length - 1;

    const eligibleRarities = RARITY_ORDER.filter(
        (rarity, index) => index <= maxRarityIndex && template.rarityWeights[rarity] > 0,
    );

    const totalWeight = eligibleRarities.reduce(
        (sum, rarity) => sum + template.rarityWeights[rarity], 0,
    );

    let roll = Math.random() * totalWeight;
    for (const rarity of eligibleRarities) {
        roll -= template.rarityWeights[rarity];
        if (roll <= 0) {
            return rarity;
        }
    }

    // Fallback for floating point edge cases: last eligible rarity
    return eligibleRarities[eligibleRarities.length - 1] as Rarity;
}

/**
 * Roll stats for a given template + rarity. Uses `baseStatsRange` for EQUIPMENT
 * and `healPercentRange` for POTION — the two never overlap on a single template.
 */
export function rollStats(templateId: string, rarity: Rarity): ItemStats {
    const template = getTemplateOrThrow(templateId);

    if (template.type === ItemType.POTION) {
        const range = template.healPercentRange?.[rarity];
        return { healPercent: range ? rollInRange(range) : 0 };
    }

    const statRanges = template.baseStatsRange?.[rarity] ?? {};
    const stats: ItemStats = {};
    for (const [key, range] of Object.entries(statRanges) as [keyof ItemStats, StatRange][]) {
        stats[key] = rollInRange(range);
    }
    return stats;
}

/**
 * Generate a full item instance: rolls rarity + stats and assigns a unique itemId.
 * Pure and Firestore-free — has no owner yet. A caller (e.g. InventoryService)
 * assigns `characterId` and persists it into the `items` collection.
 */
export function generateItemInstance(templateId: string, context: ItemGenerationContext): RolledItem {
    const template = getTemplateOrThrow(templateId);
    const rarity = rollRarity(templateId, context);
    const stats = rollStats(templateId, rarity);

    return {
        itemId: crypto.randomUUID(),
        templateId,
        type: template.type,
        // Omit rather than set `undefined` — Firestore rejects undefined field values
        ...(template.equipSlot ? { equipSlot: template.equipSlot } : {}),
        rarity,
        stats,
        source: context.source,
        createdAt: Date.now(),
    };
}

/**
 * Sum the rolled stats of a set of equipped items into the shape
 * `applyEquipmentStats` expects: ItemStats.HP maps to Stats.HP_MAX, and
 * ItemStats.actionSpeedMod maps to a delta on Stats.actionIntervalSec.
 */
export function sumEquipmentStats(items: ItemInstance[]): Partial<Stats> {
    return items.reduce<Partial<Stats>>((acc, item) => ({
        ATK: (acc.ATK ?? 0) + (item.stats.ATK ?? 0),
        DEF: (acc.DEF ?? 0) + (item.stats.DEF ?? 0),
        HP_MAX: (acc.HP_MAX ?? 0) + (item.stats.HP ?? 0),
        actionIntervalSec: (acc.actionIntervalSec ?? 0) + (item.stats.actionSpeedMod ?? 0),
    }), {});
}

function getTemplateOrThrow(templateId: string): ItemTemplate {
    const template = getItemTemplate(templateId);
    if (!template) {
        throw new NotFoundError(`item template '${templateId}'`);
    }
    return template;
}

function rollInRange(range: StatRange): number {
    return Math.round(range.min + Math.random() * (range.max - range.min));
}
