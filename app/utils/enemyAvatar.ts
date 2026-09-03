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
