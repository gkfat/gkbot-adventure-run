import type { FacilitySeverity } from '../../shared/types/adventure';

/**
 * Background art slugs, one per `STAGE_CONFIG.FACILITY_THEMES` entry, in the
 * same order (`chapterIndex % length`, mirroring `getFacilityTheme`). Files
 * live at `public/images/backgrounds/{slug}.png`.
 */
const FACILITY_BACKGROUND_SLUGS = [
    'supply-depot', // 廢棄補給站
    'research-lab', // 廢棄研究所
    'repair-shop', // 廢棄維修廠
    'vr-arcade', // 崩壞VR體驗館
    'factory', // 廢棄工廠
    'amusement-park', // 荒廢遊樂場
    'department-store', // 廢棄百貨公司
    'convenience-store', // 無主小賣店
] as const;

export const getFacilityBackgroundUrl = (chapterIndex: number): string => {
    const slug = FACILITY_BACKGROUND_SLUGS[chapterIndex % FACILITY_BACKGROUND_SLUGS.length];
    return `/images/backgrounds/${slug}.png`;
};

/**
 * Severity tier is layered on top of the theme background as a color-tint
 * overlay (rather than separate art per theme×severity combo) so the
 * existing "more active = more danger" visual cue survives the switch from
 * severity-only backgrounds to theme-based ones.
 */
export const FACILITY_SEVERITY_TINT: Record<FacilitySeverity, string> = {
    DEEP_WRECK: 'rgba(20, 24, 28, 0.15)',
    PARTIAL_ACTIVE: 'rgba(184, 122, 42, 0.22)',
    HIGHLY_ACTIVE: 'rgba(168, 32, 32, 0.32)',
};
