/**
 * Game data templates (items, quests, achievements, etc.)
 * These are static definitions loaded into memory
 */

export * from './items';
export * from './quests';
export * from './persistentQuests';
export * from './achievement';
export * from './events';
export * from './characterArchetypes';
export * from './talentTrees';
export * from './enemies';
// character-skills 資料本體移到 shared/constants/characterSkills.ts（供
// 選擇角色頁預覽可獲得技能用），這裡保留 re-export 讓既有的
// `from '../constants/templates'` 匯入路徑不必逐一改寫。
export * from '../../../shared/constants/characterSkills';
