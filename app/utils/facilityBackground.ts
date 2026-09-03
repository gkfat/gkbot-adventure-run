import type { FacilitySeverity } from '../../shared/types/adventure';

/**
 * Background art is keyed by severity tier (`DEEP_WRECK` / `PARTIAL_ACTIVE` /
 * `HIGHLY_ACTIVE`) at `public/images/backgrounds/{severity}.png`. A per-node-type
 * override (e.g. a dedicated BOSS backdrop) can be added later the same way —
 * this stays a single-purpose lookup until that art actually exists.
 */
export const getFacilityBackgroundUrl = (severityTier: FacilitySeverity): string => (
    `/images/backgrounds/${severityTier.toLowerCase().replace(/_/g, '-')}.png`
);
