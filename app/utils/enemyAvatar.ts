import {
    NodeType, type EnemyFaction, 
} from '../../shared/types/adventure';

/**
 * Enemies don't have per-enemy sprites (30+ named enemies would be too much
 * art to produce); avatar is resolved purely from faction + a coarse threat
 * tier instead, at `public/images/enemies/{faction}-{tier}.png` (lowercased
 * faction, e.g. `gkbot-elite.png`).
 */
export type EnemyAvatarTier = 'normal' | 'elite' | 'boss';

export const getEnemyAvatarTier = (isBoss: boolean, currentNodeType?: NodeType): EnemyAvatarTier => {
    if (isBoss) return 'boss';
    if (currentNodeType === NodeType.ELITE || currentNodeType === NodeType.STRONG_ELITE) return 'elite';
    return 'normal';
};

export const getEnemyAvatarUrl = (factionType: EnemyFaction, tier: EnemyAvatarTier): string => (
    `/images/enemies/${factionType.toLowerCase()}-${tier}.png`
);

/**
 * Archetype slugs with dedicated portrait art (enemy-portrait-resolution).
 * Static allowlist, not a build-time scan of public/images/enemies/ (design.md
 * D3) — add a line here whenever art for a new archetype ships.
 */
const ARCHETYPES_WITH_PORTRAIT = new Set<string>([
    'gkbot-repair',
    'gkbot-security-unit',
    'gkbot-runaway-hauler',
    'gkbot-scrap-pile',
    'assembly-arm',
    'synth-observer',
    'phantom-projector',
    'dealer-gkbot',
    // GKBOT_BOSS_ARCHETYPES (頭目 x8)
    'guard-hound-gkbot',
    'recon-drone',
    'core-repair-officer',
    'assembly-overseer',
    'illusion-mage-unit',
    'dealer-boss',
    'warehouse-hauler-overlord',
    'mall-security-core',
    // HUMAN_ARCHETYPES (小兵 x8)
    'guard-dog',
    'human-scout',
    'gang-enforcer',
    'rabble-raider',
    'synth-soldier',
    'sniper-raider',
    'private-guard',
    'casino-bouncer',
    // HUMAN_BOSS_ARCHETYPES (頭目 x8)
    'centurion',
    'vault-keeper',
    'berserker-boss',
    'synth-legion-commander',
    'shadow-assassin',
    'casino-kingpin',
    'bandit-strategist',
    'last-stand-maniac',
]);

/**
 * Resolves an enemy's portrait: the archetype's own art if it exists in
 * ARCHETYPES_WITH_PORTRAIT, otherwise the existing faction+tier fallback
 * (enemy-portrait-resolution) — never both requested, so no 404 round-trip.
 */
export const getEnemyPortraitUrl = (
    archetypeSlug: string | undefined, faction: EnemyFaction, tier: EnemyAvatarTier,
): string => {
    if (archetypeSlug && ARCHETYPES_WITH_PORTRAIT.has(archetypeSlug)) {
        return `/images/enemies/${archetypeSlug}.png`;
    }
    return getEnemyAvatarUrl(faction, tier);
};
