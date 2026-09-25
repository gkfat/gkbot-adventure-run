/**
 * Firestore schema for AdventureRun collection
 */

import { z } from 'zod';
import {
    AdventureStateType, AdventureEndReason, NodeType, RESOURCE_LIMITS,
} from '../../types';
import { itemInstanceSchema } from './item.schema';

/**
 * Facility severity / enemy faction (enemy-factions-and-severity) — see
 * shared/types/adventure.ts FacilitySeverity/EnemyFaction.
 */
export const facilitySeveritySchema = z.enum([
    'DEEP_WRECK',
    'PARTIAL_ACTIVE',
    'HIGHLY_ACTIVE',
]);
export const enemyFactionSchema = z.enum(['GKBOT', 'HUMAN']);

/**
 * An owned Blessing family + its level (1~3) — see
 * shared/types/adventure.ts BlessingEntry (blessing-leveling).
 */
export const blessingEntrySchema = z.object({
    modifierId: z.string(),
    level: z.number().int().min(1).max(3),
}).strict();

/**
 * Combat summary schema (stored in run)
 */
export const combatSummarySchema = z.object({
    victory: z.boolean(),
    roundCount: z.number().int().min(0),
    playerHpRemaining: z.number().min(0),

    // Rewards
    expGained: z.number().int().min(0),
    goldDropped: z.number().int().min(0),
    gemsDropped: z.number().int().min(0),
    itemsDropped: z.array(itemInstanceSchema),
    blessingPointsGained: z.number().int().min(0),

    // Enemy info
    enemies: z.array(z.object({
        enemyId: z.string(),
        name: z.string(),
        level: z.number().int().min(1),
        hpMax: z.number().int().min(1),
        isBoss: z.boolean(),
        // Optional to tolerate historical lastCombatSummary docs written
        // before this field existed (design.md D4); newly written combat
        // results always populate it.
        archetypeSlug: z.string().optional(),
    })),
    completedAt: z.number(),
}).strict();

/**
 * Run settlement summary schema — see single-stage-run-settlement/design.md.
 */
export const settleSummarySchema = z.object({
    endReason: z.nativeEnum(AdventureEndReason),
    goldEarned: z.number().int().min(0),
    gemsEarned: z.number().int().min(0),
    items: z.array(itemInstanceSchema),
    untransferredItemIds: z.array(z.string()),
    expGained: z.number().int().min(0),
    leveledUp: z.boolean(),
    newLevel: z.number().int().min(1),
    unspentAttributePointsGained: z.number().int().min(0),
    forfeitedGold: z.number().int().min(0),
    forfeitedGems: z.number().int().min(0),
    forfeitedItems: z.array(itemInstanceSchema),
    chapterAdvanced: z.boolean(),
}).strict();

/**
 * Adventure run document schema (strict mode)
 */
export const adventureRunSchema = z.object({
    // Identity
    runId: z.string(),
    characterId: z.string(),
    accountId: z.string(),
  
    // RNG
    seed: z.string(),
    rngIndex: z.number().int().min(0),
    // Second, independent RNG stream keyed by runId (unique per attempt,
    // unlike `seed` which is fixed per character+chapter+level) — used only
    // for rolls that must vary across retries of the same Stage: combat loot
    // and event/blessing content. See RngService/consumeRewardRng.
    rewardRngIndex: z.number().int().min(0),
  
    // Lifecycle
    state: z.nativeEnum(AdventureStateType),
    step: z.number().int().min(0),
    lastRestStep: z.number().int().min(0),

    // Stage progression (adventure-stage-progression)
    chapterIndex: z.number().int().min(0),
    levelIndex: z.number().int().min(0),
    stageNodeIndex: z.number().int().min(0),
    stageNodeCount: z.number().int().min(0),

    // Facility severity / enemy faction (enemy-factions-and-severity)
    severityTier: facilitySeveritySchema,
    factionType: enemyFactionSchema,

    // Character power vs. chapter's expected power, snapshotted at createRun
    progressionFactor: z.number().min(0).max(1),

    startedAt: z.number(),
    endedAt: z.number().optional(),
    endReason: z.nativeEnum(AdventureEndReason).optional(),
  
    // Current node
    currentNodeType: z.nativeEnum(NodeType).optional(),
    currentNodeData: z.any().optional(),

    // Consecutive-node-type streak tracking (todo #7 — never deleted on
    // EXPLORING transitions, unlike currentNodeType)
    lastNodeType: z.nativeEnum(NodeType).optional(),
    nodeTypeStreak: z.number().int().min(0).optional(),

    // require-combat-before-rest: whether a combat-tier node has occurred yet
    stageCombatEncountered: z.boolean().optional(),

    // Player state
    playerHp: z.number().min(0),
    playerHpMax: z.number().min(1),

    // 無傷通關成就追蹤（known-issue.md #8）
    damageTakenThisRun: z.boolean().optional(),

    // Run-only modifiers
    blessings: z.array(blessingEntrySchema),
    curses: z.array(z.string()),
    blessingPoints: z.number().int().min(0),
  
    // Run inventory
    runInventory: z.array(itemInstanceSchema).max(RESOURCE_LIMITS.INVENTORY_RUN_MAX),
  
    // Rewards accumulated
    expEarned: z.number().int().min(0),
    goldEarned: z.number().int().min(0),
    gemsEarned: z.number().int().min(0),

    // Cumulative enemies defeated this run (leaderboard-season)
    enemiesDefeated: z.number().int().min(0),

    // Combat/event history
    lastCombatSummary: combatSummarySchema.optional(),

    // Settlement summary, written once when the run ends
    settlement: settleSummarySchema.optional(),
  
    // Reconnection tracking
    lastActivityAt: z.number(),
    disconnectedAt: z.number().optional(),
  
    // Metadata
    updatedAt: z.number(),
}).strict();

export type AdventureRun = z.infer<typeof adventureRunSchema>;
export type CombatSummary = z.infer<typeof combatSummarySchema>;
