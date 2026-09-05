import { getItemTemplate } from '../constants/templates';
import type {
    Attributes, Stats, 
} from '../../shared/types/common';
import {
    Rarity, WeaponWeightClass,
} from '../../shared/types/common';
import { COMBAT_CONFIG } from '../../shared/types/adventure';
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
 * When `context.maxRarity`/`context.minRarity` are set, rarities outside that
 * range are excluded before weighting.
 */
export function rollRarity(templateId: string, context: ItemGenerationContext): Rarity {
    const template = getTemplateOrThrow(templateId);
    const rarityWeights = context.rarityWeightsOverride ?? template.rarityWeights;

    const maxRarityIndex = context.maxRarity
        ? RARITY_ORDER.indexOf(context.maxRarity)
        : RARITY_ORDER.length - 1;
    const minRarityIndex = context.minRarity
        ? RARITY_ORDER.indexOf(context.minRarity)
        : 0;

    const eligibleRarities = RARITY_ORDER.filter(
        (rarity, index) => index >= minRarityIndex && index <= maxRarityIndex && (rarityWeights[rarity] ?? 0) > 0,
    );

    const totalWeight = eligibleRarities.reduce(
        (sum, rarity) => sum + (rarityWeights[rarity] ?? 0), 0,
    );

    let roll = Math.random() * totalWeight;
    for (const rarity of eligibleRarities) {
        roll -= rarityWeights[rarity] ?? 0;
        if (roll <= 0) {
            return rarity;
        }
    }

    // Fallback for floating point edge cases: last eligible rarity
    return eligibleRarities[eligibleRarities.length - 1] as Rarity;
}

/**
 * How many of the template's pool stat keys are rolled as positive bonuses,
 * per rarity — counts are clamped to the pool size when the pool is smaller.
 * Higher rarities guarantee more simultaneous bonus stats.
 */
const RARITY_STAT_PICK_COUNT: Partial<Record<Rarity, StatRange>> = {
    [Rarity.N]: {
        min: 1, max: 2, 
    },
    [Rarity.R]: {
        min: 1, max: 2, 
    },
    [Rarity.SR]: {
        min: 2, max: 2, 
    },
    [Rarity.SSR]: {
        min: 2, max: 3, 
    },
    [Rarity.L]: {
        min: 3, max: 4, 
    },
};

/**
 * Chance of an extra negative "拖累" stat being rolled alongside the positive
 * bonuses — only low rarities carry this risk; SR and above never roll one.
 */
const RARITY_DEBUFF_CHANCE: Partial<Record<Rarity, number>> = {
    [Rarity.N]: 0.3,
    [Rarity.R]: 0.3,
    [Rarity.SR]: 0,
    [Rarity.SSR]: 0,
    [Rarity.L]: 0,
};

/** A debuff shaves off this fraction of the rolled rarity's own min value for that key. */
const DEBUFF_MAGNITUDE_RATIO = 0.35;

/**
 * A weapon's ATK / an armor piece's DEF is the item's defining stat — it must
 * always be present and always positive, at every rarity, so gear never reads
 * as "worse than bare-handed". Only HP may carry a debuff.
 */
const PRIMARY_STAT_KEYS = new Set<keyof ItemStats>(['ATK', 'DEF']);
const DEBUFFABLE_STAT_KEYS = new Set<keyof ItemStats>(['HP']);

/**
 * Roll stats for a given template + rarity. Uses `baseStatsRange` for EQUIPMENT
 * and `healPercentRange` for POTION — the two never overlap on a single template.
 *
 * For EQUIPMENT, `baseStatsRange[rarity]` is a *pool* of possible stat keys —
 * the pool's ATK/DEF entry (whichever the template has) is always rolled as a
 * guaranteed positive bonus, a further random subset (sized by
 * `RARITY_STAT_PICK_COUNT`) is rolled from the rest of the pool, and low
 * rarities may additionally roll one negative "拖累" to HP
 * (`RARITY_DEBUFF_CHANCE`) — never to ATK/DEF.
 */
export function rollStats(templateId: string, rarity: Rarity): ItemStats {
    const template = getTemplateOrThrow(templateId);

    if (template.type === ItemType.POTION) {
        const range = template.healPercentRange?.[rarity];
        return { healPercent: range ? rollInRange(range) : 0 };
    }

    const statRanges = template.baseStatsRange?.[rarity] ?? {};
    const pool = Object.entries(statRanges) as [keyof ItemStats, StatRange][];

    const guaranteedEntries = pool.filter(([key]) => PRIMARY_STAT_KEYS.has(key));
    const restPool = pool.filter(([key]) => !PRIMARY_STAT_KEYS.has(key));

    const pickCountRange = RARITY_STAT_PICK_COUNT[rarity];
    const totalPickCount = pickCountRange ? Math.min(rollInRange(pickCountRange), pool.length) : pool.length;
    const restPickCount = Math.max(0, totalPickCount - guaranteedEntries.length);

    const shuffledRest = shuffle(restPool);
    const pickedEntries = [...guaranteedEntries, ...shuffledRest.slice(0, restPickCount)];
    const remainingEntries = shuffledRest.slice(restPickCount);

    const stats: ItemStats = {};
    for (const [key, range] of pickedEntries) {
        stats[key] = FRACTIONAL_STAT_KEYS.has(key) ? rollInRangeFractional(range) : rollInRange(range);
    }

    const debuffChance = RARITY_DEBUFF_CHANCE[rarity] ?? 0;
    if (debuffChance > 0 && Math.random() < debuffChance) {
        // Only drawn from keys NOT already picked as a bonus — stacking a debuff
        // onto an already-buffed stat would just muddy that stat's own roll range.
        const candidates = remainingEntries.filter(([key]) => DEBUFFABLE_STAT_KEYS.has(key));

        if (candidates.length > 0) {
            const [key, range] = candidates[Math.floor(Math.random() * candidates.length)] as [keyof ItemStats, StatRange];
            const magnitude = Math.max(1, Math.round(range.min * DEBUFF_MAGNITUDE_RATIO));
            stats[key] = -magnitude;
        }
    }

    return stats;
}

/**
 * ATK/DEF/HP/healPercent are whole numbers, but actionSpeedMod/dodgeChanceMod
 * are small fractional modifiers (e.g. -0.05..-0.02) — rounding those with
 * `rollInRange` would collapse every roll to 0.
 */
const FRACTIONAL_STAT_KEYS = new Set<keyof ItemStats>(['actionSpeedMod', 'dodgeChanceMod']);

function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
        ...(template.weaponWeightClass ? { weaponWeightClass: template.weaponWeightClass } : {}),
        rarity,
        stats,
        name: template.name,
        description: template.description,
        source: context.source,
        createdAt: Date.now(),
    };
}

/**
 * Carry-capacity discount (weapon-weight-class): STR+CON shrinks the
 * magnitude of a HEAVY item's actionSpeedMod/dodgeChanceMod penalty, capped
 * so it's never fully negated. Sign-agnostic — actionSpeedMod penalties are
 * positive (slower), dodgeChanceMod penalties are negative (less dodge);
 * scaling by a factor in (0, 1] shrinks either toward zero without flipping it.
 */
function getHeavyPenaltyMitigation(attributes: Attributes): number {
    const carryScore = attributes.STR + attributes.CON;
    const discount = Math.min(
        COMBAT_CONFIG.MAX_HEAVY_PENALTY_MITIGATION,
        carryScore * COMBAT_CONFIG.HEAVY_PENALTY_MITIGATION_PER_POINT,
    );
    return 1 - discount;
}

/**
 * Sum the rolled stats of a set of equipped items into the shape
 * `applyEquipmentStats` expects: ItemStats.HP maps to Stats.HP_MAX,
 * ItemStats.actionSpeedMod maps to a delta on Stats.actionIntervalSec, and
 * ItemStats.dodgeChanceMod maps to a delta on Stats.dodgeChance. HEAVY items'
 * actionSpeedMod/dodgeChanceMod are shrunk by the character's carry-capacity
 * discount (STR+CON) before being summed in.
 */
export function sumEquipmentStats(items: ItemInstance[], attributes: Attributes): Partial<Stats> {
    const mitigation = getHeavyPenaltyMitigation(attributes);

    return items.reduce<Partial<Stats>>((acc, item) => {
        const isHeavy = item.weaponWeightClass === WeaponWeightClass.HEAVY;
        const actionSpeedMod = (item.stats.actionSpeedMod ?? 0) * (isHeavy ? mitigation : 1);
        const dodgeChanceMod = (item.stats.dodgeChanceMod ?? 0) * (isHeavy ? mitigation : 1);

        return {
            ATK: (acc.ATK ?? 0) + (item.stats.ATK ?? 0),
            DEF: (acc.DEF ?? 0) + (item.stats.DEF ?? 0),
            HP_MAX: (acc.HP_MAX ?? 0) + (item.stats.HP ?? 0),
            actionIntervalSec: (acc.actionIntervalSec ?? 0) + actionSpeedMod,
            dodgeChance: (acc.dodgeChance ?? 0) + dodgeChanceMod,
        };
    }, {});
}

/**
 * Selling always pays out this fraction of the item's shop gold price
 * (midpoint of its rarity's `priceRangeByRarity.gold` range) — half, so
 * repeatedly buying-then-selling the same item is a net loss.
 */
const SELL_PRICE_RATIO = 0.5;

/**
 * Gold payout for selling an item back — half of its rarity's gold price
 * midpoint. Every rarity has a `gold` range in `priceRangeByRarity` (SSR/L
 * have one purely for this purpose, since their shop buy price is gems-only —
 * see EQUIPMENT_PRICE_RANGE/POTION_PRICE_RANGE in constants/templates.ts).
 */
export function getSellPriceGold(templateId: string, rarity: Rarity): number {
    const template = getTemplateOrThrow(templateId);
    const goldRange = template.priceRangeByRarity[rarity]?.gold;
    if (!goldRange) {
        throw new NotFoundError(`gold price range for template '${templateId}' rarity ${rarity}`);
    }
    const midpoint = (goldRange.min + goldRange.max) / 2;
    return Math.round(midpoint * SELL_PRICE_RATIO);
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

function rollInRangeFractional(range: StatRange): number {
    return range.min + Math.random() * (range.max - range.min);
}
