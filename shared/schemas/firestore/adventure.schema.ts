/**
 * Firestore schema for AdventureRun collection
 */

import { z } from 'zod';
import {
    AdventureStateType, AdventureEndReason, NodeType, RESOURCE_LIMITS, 
} from '../../types';
import { itemInstanceSchema } from './item.schema';

/**
 * Combat summary schema (stored in run)
 */
export const combatSummarySchema = z.object({
    victory: z.boolean(),
    roundCount: z.number().int().min(0),
    playerHpRemaining: z.number().min(0),
  
    // Rewards
    scoreGained: z.number().int().min(0),
    goldDropped: z.number().int().min(0),
    gemsDropped: z.number().int().min(0),
    itemsDropped: z.array(itemInstanceSchema),
    blessingPointsGained: z.number().int().min(0),
  
    // Enemy info
    enemies: z.array(z.object({
        enemyId: z.string(),
        name: z.string(),
        level: z.number().int().min(1),
    })),
    completedAt: z.number(),
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
  
    // Lifecycle
    state: z.nativeEnum(AdventureStateType),
    step: z.number().int().min(0),
    startedAt: z.number(),
    endedAt: z.number().optional(),
    endReason: z.nativeEnum(AdventureEndReason).optional(),
  
    // Current node
    currentNodeType: z.nativeEnum(NodeType).optional(),
    currentNodeData: z.any().optional(),
  
    // Player state
    playerHp: z.number().min(0),
    playerHpMax: z.number().min(1),
  
    // Run-only modifiers
    blessings: z.array(z.string()),
    curses: z.array(z.string()),
    blessingPoints: z.number().int().min(0),
  
    // Run inventory
    runInventory: z.array(itemInstanceSchema).max(RESOURCE_LIMITS.INVENTORY_RUN_MAX),
  
    // Rewards accumulated
    score: z.number().int().min(0),
    goldEarned: z.number().int().min(0),
    gemsEarned: z.number().int().min(0),
  
    // Combat/event history
    lastCombatSummary: combatSummarySchema.optional(),
  
    // Reconnection tracking
    lastActivityAt: z.number(),
    disconnectedAt: z.number().optional(),
  
    // Metadata
    updatedAt: z.number(),
}).strict();

export type AdventureRun = z.infer<typeof adventureRunSchema>;
export type CombatSummary = z.infer<typeof combatSummarySchema>;
