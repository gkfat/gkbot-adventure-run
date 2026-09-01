// Stat calculation is a pure function shared with the frontend (used for a
// live preview while allocating attribute points in characterStage.vue) —
// the implementation lives in shared/utils/calculateStats.ts.
export {
    STATS_CONFIG, calculateBaseStats, applyEquipmentStats,
} from '../../shared/utils/calculateStats';
