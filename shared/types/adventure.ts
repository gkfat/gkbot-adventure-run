/**
 * Adventure run and combat related types
 */

import type {
    Timestamp, Stats, 
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
};

/**
 * Node types
 */
export enum NodeType {
  COMBAT = 'COMBAT',             // Normal combat
  ELITE = 'ELITE',               // Elite combat (every 5 steps)
  STRONG_ELITE = 'STRONG_ELITE', // Strong elite (every 9 steps)
  EVENT = 'EVENT',               // Random event
  REST = 'REST',                 // Rest node
  CHOICE = 'CHOICE',             // Decision fork
};

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
};

/**
 * Combat log entry
 */
export type CombatLogEntry = {
  timestamp: number;           // Relative combat time (ms)
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
  scoreGained: number;
  goldDropped: number;
  gemsDropped: number;
  itemsDropped: ItemInstance[];
  blessingPointsGained: number;
};

/**
 * Combat summary (stored in run doc)
 */
export type CombatSummary = CombatResult & {
  enemies: Array<{ enemyId: string; name: string; level: number }>;
  completedAt: Timestamp;
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
  score: number;
  goldEarned: number;
  gemsEarned: number;
  
  // Combat/event history (optional, for anti-cheat)
  lastCombatSummary?: CombatSummary;
  
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
        AdventureStateType.ENDED,
    ],
    [AdventureStateType.COMBAT]: [AdventureStateType.RESOLUTION, AdventureStateType.ENDED],
    [AdventureStateType.EVENT]: [AdventureStateType.RESOLUTION],
    [AdventureStateType.REST]: [AdventureStateType.RESOLUTION],
    [AdventureStateType.RESOLUTION]: [
        AdventureStateType.BLESSING_SELECT,
        AdventureStateType.EXPLORING,
        AdventureStateType.ENDED,
    ],
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
} as const;

/**
 * Node generation configuration
 */
export const NODE_CONFIG = {
    // Guaranteed patterns
    REST_GUARANTEED_INTERVAL: 4,  // At least 1 rest per 4 steps
    ELITE_INTERVAL: 5,            // Elite every 5 steps
    STRONG_ELITE_INTERVAL: 9,     // Strong elite every 9 steps
  
    // Reconnection window
    RECONNECT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
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
