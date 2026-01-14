/**
 * API schemas for adventure endpoints
 */

import { z } from 'zod';
import {
    AdventureStateType, NodeType, 
} from '../../types';
import {
    adventureRunSchema, combatSummarySchema, 
} from '../firestore/adventure.schema';

/**
 * POST /api/adventure/start
 */
export const startAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        runId: z.string(),
        seed: z.string(),
        state: z.nativeEnum(AdventureStateType),
    }),
});

/**
 * GET /api/adventure/current
 */
export const getCurrentAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: adventureRunSchema.nullable(),
});

/**
 * POST /api/adventure/advance
 */
export const advanceAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        state: z.nativeEnum(AdventureStateType),
        step: z.number(),
        nodeType: z.nativeEnum(NodeType).optional(),
    }),
});

/**
 * POST /api/adventure/combat/start
 */
export const startCombatResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        combatLog: z.array(z.object({
            timestamp: z.number(),
            actorId: z.string(),
            targetId: z.string(),
            action: z.enum([
                'ATTACK',
                'CRIT',
                'DODGE',
                'DEATH',
            ]),
            damage: z.number().optional(),
            targetHpRemaining: z.number().optional(),
        })),
        summary: combatSummarySchema,
    }),
});

/**
 * POST /api/adventure/event/resolve
 */
export const resolveEventRequestSchema = z.object({ choiceIndex: z.number().int().min(0).optional() }).strict();

export const resolveEventResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        eventType: z.string(),
        description: z.string(),
        hpHealed: z.number().optional(),
        goldGained: z.number().optional(),
        gemsGained: z.number().optional(),
    }),
});

/**
 * POST /api/adventure/blessing/select
 */
export const selectBlessingRequestSchema = z.object({ blessingId: z.string() }).strict();

export const selectBlessingResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        blessing: z.object({
            modifierId: z.string(),
            name: z.string(),
            description: z.string(),
        }),
    }),
});

/**
 * POST /api/adventure/rest/heal
 */
export const restHealResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        hpHealed: z.number(),
        hpCurrent: z.number(),
    }),
});

/**
 * POST /api/adventure/end
 */
export const endAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        finalScore: z.number(),
        goldEarned: z.number(),
        gemsEarned: z.number(),
        itemsEarned: z.number(),
        expGained: z.number(),
        leveledUp: z.boolean(),
    }),
});

export type StartAdventureResponse = z.infer<typeof startAdventureResponseSchema>;
export type GetCurrentAdventureResponse = z.infer<typeof getCurrentAdventureResponseSchema>;
export type AdvanceAdventureResponse = z.infer<typeof advanceAdventureResponseSchema>;
export type StartCombatResponse = z.infer<typeof startCombatResponseSchema>;
export type ResolveEventRequest = z.infer<typeof resolveEventRequestSchema>;
export type ResolveEventResponse = z.infer<typeof resolveEventResponseSchema>;
export type SelectBlessingRequest = z.infer<typeof selectBlessingRequestSchema>;
export type SelectBlessingResponse = z.infer<typeof selectBlessingResponseSchema>;
export type RestHealResponse = z.infer<typeof restHealResponseSchema>;
export type EndAdventureResponse = z.infer<typeof endAdventureResponseSchema>;
