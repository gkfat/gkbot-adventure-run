/**
 * Adventure run and combat related types
 */

import {
    clamp,
    type Timestamp, type Stats,
} from './common';
import type { ItemInstance } from './item';

/**
 * Adventure state machine states
 */
export enum AdventureStateType {
  INIT = 'INIT',                       // Just created, not yet started
  EXPLORING = 'EXPLORING',             // Choosing next step
  COMBAT = 'COMBAT',                   // In combat
  EVENT = 'EVENT',                     // Random event
  BLESSING_SELECT = 'BLESSING_SELECT', // Selecting blessing
  REST = 'REST',                       // Rest node (can use potion)
  RESOLUTION = 'RESOLUTION',           // Step resolution (player must confirm)
  ENDED = 'ENDED',                     // Adventure ended
};

/**
 * Adventure end reasons
 */
export enum AdventureEndReason {
  DEAD = 'DEAD',             // HP reached 0
  QUIT = 'QUIT',             // Player quit (reserved for admin)
  DISCONNECT = 'DISCONNECT', // Disconnected beyond reconnect window
  TIMEOUT = 'TIMEOUT',       // Reserved, not used initially
  COMPLETED = 'COMPLETED',   // Boss defeated — the Stage was cleared
};

/**
 * Node types
 */
export enum NodeType {
  COMBAT = 'COMBAT',             // Normal combat
  ELITE = 'ELITE',               // Elite combat (every 5 steps)
  STRONG_ELITE = 'STRONG_ELITE', // Strong elite (every 9 steps)
  BOSS = 'BOSS',                 // Boss combat (last node of a Stage)
  EVENT = 'EVENT',               // Random event
  REST = 'REST',                 // Rest node
  CHOICE = 'CHOICE',             // Decision fork
};

/**
 * Facility risk severity for a run (enemy-factions-and-severity) — rolled
 * once at `createRun`, fixed for the whole run. See SEVERITY_CONFIG.
 */
export type FacilitySeverity = 'DEEP_WRECK' | 'PARTIAL_ACTIVE' | 'HIGHLY_ACTIVE';

/**
 * Which enemy roster a run draws from (enemy-factions-and-severity) —
 * rolled once at `createRun`, fixed for the whole run.
 */
export type EnemyFaction = 'GKBOT' | 'HUMAN';

/**
 * Enemy definition
 */
export type Enemy = {
  enemyId: string;
  name: string;
  level: number;
  stats: Stats;
  isElite: boolean;
  isStrongElite: boolean;
  faction: EnemyFaction;
};

/**
 * Combat log entry
 */
export type CombatLogEntry = {
  timestamp: number;           // Relative combat time (ms), reset to 0 at the start of each wave
  wave: number;                // 0-based wave index this entry belongs to
  actorId: string;            // 'player' or enemyId
  targetId: string;           // 'player' or enemyId
  action: 'ATTACK' | 'CRIT' | 'DODGE' | 'DEATH';
  damage?: number;
  targetHpRemaining?: number;
};

/**
 * Combat result
 */
export type CombatResult = {
  victory: boolean;
  roundCount: number;
  playerHpRemaining: number;

  // Rewards (if victory)
  expGained: number;
  goldDropped: number;
  gemsDropped: number;
  itemsDropped: ItemInstance[];
  blessingPointsGained: number;

  // Enemies encountered this combat (included here, not just on CombatSummary,
  // so the caller can build combatSummary/combatLog display without a second
  // channel back from CombatResolver.resolve()). `hpMax`/`isBoss` (chapter-level-structure)
  // let the adventure screen render a live enemy status panel (tier/HP) as
  // combatLog plays back — see combat-log-sequential-playback.
  enemies: Array<{
    enemyId: string; name: string; level: number; hpMax: number; isBoss: boolean;
  }>;
};

/**
 * Combat summary (stored in run doc)
 */
export type CombatSummary = CombatResult & {
  completedAt: Timestamp;
};

/**
 * Full output of CombatResolver.resolve() — the persistable CombatResult
 * plus the turn-by-turn combatLog. The log is NOT part of CombatSummary
 * (design.md Non-Goal: not persisted to the run document, only returned
 * once via the API response) — callers must destructure it out before
 * writing `run.lastCombatSummary`.
 */
export type CombatResolution = CombatResult & {
  combatLog: CombatLogEntry[];
  // Next unconsumed rngIndex after this combat — the caller must persist it
  // (as `run.rngIndex`) in the same checkpoint write that follows combat
  // resolution, and must NOT let it leak into CombatSummary (see combat.service
  // RNG-batching: all rolls happen in-memory off a cursor started at
  // run.rngIndex, so this is the only point where the advance gets written back).
  finalRngIndex: number;
};

/**
 * Event type
 */
export enum EventType {
  HEAL = 'HEAL',               // Heal HP
  BLESSING = 'BLESSING',       // Grant blessing
  CURSE = 'CURSE',             // Apply curse
  WHEEL = 'WHEEL',             // Spin wheel (items/gold/gems)
  CHOICE = 'CHOICE',           // Risk vs reward choice
};

/**
 * Event result
 */
export type EventResult = {
  eventId: string;
  type: EventType;
  description: string;
  
  // Outcomes
  hpHealed?: number;
  blessingGranted?: string;
  curseApplied?: string;
  goldGained?: number;
  gemsGained?: number;
  itemsGained?: ItemInstance[];
};

/**
 * Enemy roster entry decided at node-generation time so the pre-fight
 * "遭遇敵人" screen can show it before the player triggers combat. Only the
 * first wave is decided this early — see single-stage-run-settlement/design.md.
 */
export type EnemyPreview = {
  archetypeIndex: number;
  name: string;
  description: string;
  level: number;
  hp: number;
  isBoss: boolean;
};

/**
 * Context passed to CombatResolver.resolve() — everything it needs to run a
 * single combat node without reaching back into the run's own persistence.
 */
export type CombatContext = {
  enemyLevel: number;
  tier: NodeType.COMBAT | NodeType.ELITE | NodeType.STRONG_ELITE | NodeType.BOSS;
  waveCount: number;
  enemyCountPerWave: number;
  // Archetype selection for wave 0, decided at node-generation time (see
  // EnemyPreview). Waves >= 1 still roll their own archetypes in combat.service.
  firstWaveArchetypeIndices: number[];
};

/**
 * Strategy interface for resolving a COMBAT/ELITE/STRONG_ELITE node.
 * `adventure-run-core`'s state machine calls this when `advance()` decides
 * the next node is combat; `combat-engine` provides the real implementation.
 * Input is a run snapshot + context, output is a self-contained result — no
 * side effects on `run` itself, so the state machine stays the single writer.
 */
export type CombatResolver = {
  resolve(run: AdventureRun, context: CombatContext): Promise<CombatResolution>;
};

/**
 * Strategy interface for resolving an EVENT node. `events-and-blessings`
 * provides the real implementation; same input/output shape convention as
 * CombatResolver.
 */
export type EventResolver = {
  resolve(run: AdventureRun, choiceIndex?: number): Promise<EventResult>;
};

/**
 * Strategy interface for updating the leaderboard on run settlement.
 * `leaderboard` change provides the real implementation; this change calls
 * it via this interface and ships a no-op stub until that change lands
 * (same pattern as CombatResolver/EventResolver — see design.md).
 */
export type LeaderboardUpdater = {
  updateIfBetter(entry: { accountId: string; characterId: string; score: number }): Promise<void>;
};

/**
 * Strategy interface for quest/achievement progress tracking on run
 * settlement. `quests-and-achievements` change provides the real
 * implementation; this change ships a no-op stub until that change lands.
 */
export type ProgressTracker = {
  incrementProgress(event: { accountId: string; characterId: string; type: string; amount: number }): Promise<void>;
};

/**
 * Full settlement summary for a run, computed once when the run ends
 * (any `AdventureEndReason`). Persisted on `AdventureRun.settlement` for
 * audit purposes, and returned once via the API response that triggered the
 * settlement (advance/combat/current) — see single-stage-run-settlement/design.md.
 *
 * `goldEarned`/`gemsEarned`/`items` reflect what was actually applied to the
 * character (0/[] when `endReason` isn't COMPLETED); `forfeited*` reflect
 * what the run had accumulated but lost on failure (0/[] on COMPLETED).
 */
export type SettleSummary = {
  endReason: AdventureEndReason;
  goldEarned: number;
  gemsEarned: number;
  items: ItemInstance[];
  untransferredItemIds: string[];
  expGained: number;
  leveledUp: boolean;
  newLevel: number;
  unspentAttributePointsGained: number;
  forfeitedGold: number;
  forfeitedGems: number;
  forfeitedItems: ItemInstance[];

  // Chapter/Level advance (chapter-level-structure) — true only when this
  // settlement cleared the chapter's last level and moved to the next
  // facility theme; false for a same-chapter level advance, and for
  // DEAD/DISCONNECT (which never advance either).
  chapterAdvanced: boolean;
};

/**
 * Run modifier (blessings/curses)
 */
export type RunModifier = {
  modifierId: string;
  name: string;
  description: string;
  isBlessing: boolean; // true = blessing, false = curse
  
  // Effects (applied to stats/combat)
  statModifiers?: Partial<Stats>;
  dropRateMultiplier?: number;
  otherEffects?: Record<string, any>;
};

/**
 * Adventure run document
 */
export type AdventureRun = {
  // Identity
  runId: string;
  characterId: string;
  accountId: string;
  
  // RNG
  seed: string;
  rngIndex: number;
  
  // Lifecycle
  state: AdventureStateType;
  step: number;
  lastRestStep: number;       // step at which the last Rest node occurred (0 = start); drives the guaranteed-rest rule

  // Stage progression (adventure-stage-progression) — chapterIndex is a
  // snapshot of the character's nextChapterIndex at run creation; the run
  // itself never advances it (single-stage-run-settlement/design.md).
  chapterIndex: number;          // 0-based, drives facility theme cycling
  stageNodeIndex: number;        // 0-based, resets to 0 on stage change
  stageNodeCount: number;        // node count for this stage, rolled once at stage start

  // Facility risk severity + enemy faction (enemy-factions-and-severity) —
  // both rolled once at createRun from the not-yet-written seed, fixed for
  // the whole run. Missing on pre-migration run docs — see
  // AdventureRunRepository.withStageDefaults.
  severityTier: FacilitySeverity;
  factionType: EnemyFaction;

  startedAt: Timestamp;
  endedAt?: Timestamp;
  endReason?: AdventureEndReason;
  
  // Current node
  currentNodeType?: NodeType;
  currentNodeData?: any; // Node-specific data
  
  // Player state
  playerHp: number;
  playerHpMax: number;
  
  // Run-only modifiers
  blessings: string[];        // Blessing modifier IDs
  curses: string[];           // Curse modifier IDs
  blessingPoints: number;     // Accumulated points for next blessing
  
  // Run inventory (items dropped during run)
  runInventory: ItemInstance[];
  
  // Rewards accumulated
  expEarned: number;
  goldEarned: number;
  gemsEarned: number;

  // Combat/event history (optional, for anti-cheat)
  lastCombatSummary?: CombatSummary;

  // Settlement summary, written once when the run ends (any endReason)
  settlement?: SettleSummary;
  
  // Reconnection tracking
  lastActivityAt: Timestamp;
  disconnectedAt?: Timestamp;
  
  // Metadata
  updatedAt: Timestamp;
};

/**
 * State transition map
 */
export const ALLOWED_TRANSITIONS: Record<AdventureStateType, AdventureStateType[]> = {
    [AdventureStateType.INIT]: [AdventureStateType.EXPLORING],
    [AdventureStateType.EXPLORING]: [
        AdventureStateType.COMBAT,
        AdventureStateType.EVENT,
        AdventureStateType.REST,
    ],
    // COMBAT -> ENDED is the death path (endReason=DEAD), not a player choice —
    // there is no voluntary quit; only DISCONNECT (timeout) and DEAD end a run early.
    [AdventureStateType.COMBAT]: [AdventureStateType.RESOLUTION, AdventureStateType.ENDED],
    [AdventureStateType.EVENT]: [AdventureStateType.RESOLUTION],
    [AdventureStateType.REST]: [AdventureStateType.RESOLUTION],
    [AdventureStateType.RESOLUTION]: [AdventureStateType.BLESSING_SELECT, AdventureStateType.EXPLORING],
    [AdventureStateType.BLESSING_SELECT]: [AdventureStateType.EXPLORING],
    [AdventureStateType.ENDED]: [],
};

/**
 * Combat configuration
 */
export const COMBAT_CONFIG = {
    // Crit system
    BASE_CRIT_CHANCE: 0.05,      // 5%
    CRIT_PER_AGI: 0.003,         // +0.3% per AGI
    CRIT_CAP: 0.35,              // 35% cap
    CRIT_MULTIPLIER: 1.5,
  
    // Dodge system
    BASE_DODGE_CHANCE: 0.03,     // 3%
    DODGE_PER_AGI: 0.002,        // +0.2% per AGI
    DODGE_CAP: 0.25,             // 25% cap

    // Damage calculation
    MIN_DAMAGE: 1,               // Minimum damage after DEF

    // Carry capacity: STR+CON discounts HEAVY equipment's actionSpeedMod/
    // dodgeChanceMod penalties (weapon-weight-class). Capped so a HEAVY
    // penalty is never fully negated.
    HEAVY_PENALTY_MITIGATION_PER_POINT: 0.02, // -2% penalty per (STR + CON) point
    MAX_HEAVY_PENALTY_MITIGATION: 0.6,        // 60% cap
} as const;

/**
 * Node generation configuration
 */
export const NODE_CONFIG = {
    // Guaranteed patterns
    REST_GUARANTEED_INTERVAL: 4,  // At least 1 rest per 4 steps
    ELITE_INTERVAL: 5,            // Elite every 5 steps
    STRONG_ELITE_INTERVAL: 9,     // Strong elite every 9 steps

    // Reconnection window — after this much idle time, getCurrentRun()
    // auto-settles the run as DISCONNECT (known-issue.md #8).
    RECONNECT_WINDOW_MS: 5 * 60 * 1000, // 5 minutes

    // Weighted random node type when neither the rest guarantee nor the
    // elite cadence triggers. ASSUMPTION (undocumented elsewhere): rest is
    // weighted low since the guaranteed-rest rule already covers most of the
    // player's healing needs; tune freely, this is a balance knob.
    WEIGHTED_NODE_WEIGHTS: {
        COMBAT: 55,
        EVENT: 25,
        REST: 5,
        CHOICE: 15,
    },

    // ASSUMPTION (undocumented elsewhere): blessingPoints needed before a
    // BLESSING_SELECT is triggered at the next RESOLUTION checkpoint.
    BLESSING_POINTS_THRESHOLD: 3,
} as const;

/**
 * Difficulty scaling configuration
 */
export const DIFFICULTY_CONFIG = {
    // Enemy level formula: 1 + floor(step / 2)
    ENEMY_LEVEL_STEP_DIVISOR: 2,
  
    // Base multipliers (per enemy level)
    HP_MULT_PER_LEVEL: 0.08,
    ATK_MULT_PER_LEVEL: 0.07,
    DEF_MULT_PER_LEVEL: 0.05,
  
    // Elite multipliers (on top of base)
    ELITE_HP_MULT: 1.8,
    ELITE_ATK_MULT: 1.6,
    ELITE_DEF_MULT: 1.3,
  
    // Strong Elite multipliers
    STRONG_ELITE_HP_MULT: 2.6,
    STRONG_ELITE_ATK_MULT: 2.1,
    STRONG_ELITE_DEF_MULT: 1.6,
  
    // Multi-enemy/wave configuration
    WAVE_COUNT_MAX: 2,
    ENEMY_COUNT_MAX: 3,
  
    // Wave probability: clamp(0.10 + 0.01*step, 0, 0.60)
    WAVE_2_BASE_CHANCE: 0.10,
    WAVE_2_PER_STEP: 0.01,
    WAVE_2_CAP: 0.60,
  
    // Enemy count probabilities
    ENEMY_2_BASE_CHANCE: 0.15,
    ENEMY_2_PER_STEP: 0.01,
    ENEMY_2_CAP: 0.70,
  
    ENEMY_3_BASE_CHANCE: 0.05,
    ENEMY_3_PER_STEP: 0.006,
    ENEMY_3_CAP: 0.45,
} as const;

/**
 * Facility severity / enemy faction configuration (enemy-factions-and-severity).
 * ASSUMPTION (see design.md 決策 2): all values are invented, freely tunable —
 * only the shape (chapterIndex-scaled chance with a cap, plus flat stat/wave
 * multipliers per tier) is load-bearing.
 */
export const SEVERITY_CONFIG = {
    // Depends on chapterIndex, clamp() keeps randomness even late-game.
    HIGHLY_ACTIVE_BASE_CHANCE: 0.05,
    HIGHLY_ACTIVE_PER_CHAPTER: 0.02,
    HIGHLY_ACTIVE_CAP: 0.50,

    PARTIAL_ACTIVE_BASE_CHANCE: 0.25,
    PARTIAL_ACTIVE_PER_CHAPTER: 0.015,
    PARTIAL_ACTIVE_CAP: 0.40,
    // DEEP_WRECK = 1 - HIGHLY_ACTIVE - PARTIAL_ACTIVE (remaining probability)

    // Multiplies on top of getStatMultipliers()'s result. DEF is kept
    // conservative — the subtractive damage model max(1, ATK-DEF) is very
    // sensitive to DEF, an aggressive multiplier would floor damage to 1.
    SEVERITY_STAT_MULTIPLIER: {
        DEEP_WRECK: {
            hp: 0.85, atk: 0.85, def: 0.90,
        },
        PARTIAL_ACTIVE: {
            hp: 1.0, atk: 1.0, def: 1.0,
        }, // current baseline, unchanged
        HIGHLY_ACTIVE: {
            hp: 1.25, atk: 1.15, def: 1.08,
        },
    },

    // Multiplies on top of getWave2Chance/getEnemy2Chance/getEnemy3Chance's
    // result (still clamped within the existing WAVE_2_CAP/ENEMY_2_CAP/ENEMY_3_CAP).
    SEVERITY_WAVE_ENEMY_MULTIPLIER: {
        DEEP_WRECK: 0.8,
        PARTIAL_ACTIVE: 1.0,
        HIGHLY_ACTIVE: 1.3,
    },

    // factionType = HUMAN chance, keyed by severityTier.
    HUMAN_FACTION_CHANCE: {
        DEEP_WRECK: 0.25,     // stray hostile humans/synthetics
        PARTIAL_ACTIVE: 0.15,
        HIGHLY_ACTIVE: 0.40,  // most common tier for an organized human occupation
    },
} as const;

/**
 * `severityTier` chance for a given `chapterIndex` — HIGHLY_ACTIVE and
 * PARTIAL_ACTIVE both scale with chapterIndex (capped), DEEP_WRECK is
 * whatever probability remains.
 */
export function getSeverityChances(chapterIndex: number): Record<FacilitySeverity, number> {
    const highlyActive = clamp(
        SEVERITY_CONFIG.HIGHLY_ACTIVE_BASE_CHANCE + SEVERITY_CONFIG.HIGHLY_ACTIVE_PER_CHAPTER * chapterIndex,
        0,
        SEVERITY_CONFIG.HIGHLY_ACTIVE_CAP,
    );
    const partialActive = clamp(
        SEVERITY_CONFIG.PARTIAL_ACTIVE_BASE_CHANCE + SEVERITY_CONFIG.PARTIAL_ACTIVE_PER_CHAPTER * chapterIndex,
        0,
        SEVERITY_CONFIG.PARTIAL_ACTIVE_CAP,
    );
    return {
        HIGHLY_ACTIVE: highlyActive,
        PARTIAL_ACTIVE: partialActive,
        DEEP_WRECK: Math.max(0, 1 - highlyActive - partialActive),
    };
}

/**
 * Roll `severityTier` from a single RNG draw in [0, 1) — thresholds stack:
 * [0, highlyActive) -> HIGHLY_ACTIVE, [highlyActive, highlyActive+partialActive) -> PARTIAL_ACTIVE, else DEEP_WRECK.
 */
export function rollSeverityTier(chapterIndex: number, rngValue: number): FacilitySeverity {
    const chances = getSeverityChances(chapterIndex);
    if (rngValue < chances.HIGHLY_ACTIVE) return 'HIGHLY_ACTIVE';
    if (rngValue < chances.HIGHLY_ACTIVE + chances.PARTIAL_ACTIVE) return 'PARTIAL_ACTIVE';
    return 'DEEP_WRECK';
}

/**
 * Roll `factionType` from a single RNG draw in [0, 1), weighted by the given
 * `severityTier`'s HUMAN_FACTION_CHANCE.
 */
export function rollFactionType(severityTier: FacilitySeverity, rngValue: number): EnemyFaction {
    return rngValue < SEVERITY_CONFIG.HUMAN_FACTION_CHANCE[severityTier] ? 'HUMAN' : 'GKBOT';
}

/**
 * Stage structure configuration (adventure-stage-progression).
 * ASSUMPTION (undocumented elsewhere, see design.md): NODE_COUNT range and
 * FACILITY_THEMES are invented values, freely tunable. FACILITY_THEMES
 * follows docs/worldview.md 第 2 節 table order and may keep growing.
 */
export const STAGE_CONFIG = {
    NODE_COUNT_MIN: 10,
    NODE_COUNT_MAX: 20,             // inclusive, decisive RNG uniform roll at stage start
    FACILITY_THEMES: [
        '廢棄補給站',
        '廢棄研究所',
        '廢棄維修廠',
        '崩壞VR體驗館',
        '廢棄工廠',
        '荒廢遊樂場',
        '廢棄百貨公司',
        '無主小賣店',
    ],
} as const;

/**
 * The facility theme for a given chapter — cycles through STAGE_CONFIG.FACILITY_THEMES.
 */
export function getFacilityTheme(chapterIndex: number): string {
    return STAGE_CONFIG.FACILITY_THEMES[chapterIndex % STAGE_CONFIG.FACILITY_THEMES.length] as string;
}

/**
 * Chapter/Level hierarchy (chapter-level-structure): a Chapter = one facility
 * theme (STAGE_CONFIG.FACILITY_THEMES), a Level = one run within that
 * chapter. Range indexes line up positionally with FACILITY_THEMES.
 * ASSUMPTION (undocumented elsewhere, see design.md): these ranges are
 * invented values reflecting docs/worldview.md 第 2 節's scale language
 * (小賣店 = quick, 研究設施 = long) — freely tunable.
 */
export const LEVEL_COUNT_RANGE_BY_FACILITY: readonly { min: number; max: number }[] = [
    {
        min: 5, max: 8, 
    },   // 廢棄補給站
    {
        min: 8, max: 12, 
    },  // 廢棄研究所
    {
        min: 6, max: 9, 
    },   // 廢棄維修廠
    {
        min: 6, max: 10, 
    },  // 崩壞VR體驗館
    {
        min: 7, max: 11, 
    },  // 廢棄工廠
    {
        min: 5, max: 8, 
    },   // 荒廢遊樂場
    {
        min: 6, max: 10, 
    },  // 廢棄百貨公司
    {
        min: 3, max: 5, 
    },   // 無主小賣店
] as const;

/**
 * The level-count range for a given chapter — cycles through
 * LEVEL_COUNT_RANGE_BY_FACILITY the same way getFacilityTheme cycles
 * FACILITY_THEMES (same chapterIndex, same modulo).
 */
export function getLevelCountRange(chapterIndex: number): { min: number; max: number } {
    return LEVEL_COUNT_RANGE_BY_FACILITY[chapterIndex % LEVEL_COUNT_RANGE_BY_FACILITY.length] as { min: number; max: number };
}

/**
 * Roll a chapter's total level count from a single RNG draw in [0, 1) —
 * pure function, the caller supplies the randomness (see
 * CharacterRepository for the real seed source, mirroring
 * AdventureRunRepository's rollInRange pattern for stageNodeCount).
 */
export function rollChapterTotalLevels(chapterIndex: number, rngValue: number): number {
    const range = getLevelCountRange(chapterIndex);
    return range.min + Math.floor(rngValue * (range.max - range.min + 1));
}

/**
 * Display name for a stage, e.g. "廢棄研究所" — single-stage-run-settlement:
 * a run is always exactly one Stage now, so there is no chapter-internal
 * stage number worth showing.
 */
export function getStageDisplayName(chapterIndex: number): string {
    return getFacilityTheme(chapterIndex);
}

/**
 * Enemy rosters can contain multiple units sharing the same archetype name
 * (random multi-enemy waves, or a BOSS node's escort minions sharing the
 * boss's archetype) — append a 1-based index per duplicate group so the
 * player can tell them apart, e.g. "廢棄零件堆1", "廢棄零件堆2". Units with a
 * unique name are left untouched.
 */
export function disambiguateEnemyNames<T extends { name: string }>(units: T[]): T[] {
    const countByName = new Map<string, number>();
    for (const unit of units) {
        countByName.set(unit.name, (countByName.get(unit.name) ?? 0) + 1);
    }

    const seenByName = new Map<string, number>();
    return units.map((unit) => {
        if ((countByName.get(unit.name) ?? 0) <= 1) return unit;
        const nextIndex = (seenByName.get(unit.name) ?? 0) + 1;
        seenByName.set(unit.name, nextIndex);
        return {
            ...unit, name: `${unit.name}${nextIndex}`,
        };
    });
}
