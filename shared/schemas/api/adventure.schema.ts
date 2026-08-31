/**
 * API schemas for adventure endpoints
 */

import { z } from 'zod';
import {
    AdventureStateType, NodeType, 
} from '../../types';
import {
    adventureRunSchema, combatSummarySchema, settleSummarySchema,
} from '../firestore/adventure.schema';
import { itemInstanceSchema } from '../firestore/item.schema';

/**
 * POST /api/adventure/start — request body
 *
 * Adventure endpoints are registered as flat paths (no `/{characterId}/`
 * segment, unlike `/api/character/{characterId}/...`), so `characterId`
 * travels in the request body/query instead — an account can own up to 3
 * characters (CHARACTER_ROSTER_MAX), so it must always be explicit.
 */
export const startAdventureRequestSchema = z.object({ characterId: z.string() }).strict();

/**
 * POST /api/adventure/start
 */
export const startAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        runId: z.string(),
        // `seed` intentionally NOT exposed — deterministic-rng spec.md
        // "seed 不透過 API 回應暴露" SHALL NOT requirement.
        state: z.nativeEnum(AdventureStateType),
    }),
});

/**
 * Public view of an AdventureRun document — every endpoint that returns run
 * data to the client uses this, never the raw firestore `adventureRunSchema`
 * directly, so `seed` (deterministic-rng spec.md "seed 不透過 API 回應暴露"
 * SHALL NOT requirement) can never leak through a new field added later.
 */
export const publicAdventureRunSchema = adventureRunSchema.omit({ seed: true });

/**
 * GET /api/adventure/current — query params
 */
export const getCurrentAdventureQuerySchema = z.object({ characterId: z.string() }).strict();

/**
 * GET /api/adventure/current
 */
export const getCurrentAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: publicAdventureRunSchema.nullable(),
    // Present only when this call auto-settled the run (reconnect window
    // expired) — see single-stage-run-settlement/design.md.
    settlement: settleSummarySchema.optional(),
});

/**
 * POST /api/adventure/abandon — request body
 */
export const abandonAdventureRequestSchema = z.object({ characterId: z.string() }).strict();

/**
 * POST /api/adventure/abandon — force-settles the caller's active run as
 * DISCONNECT immediately, regardless of the reconnect window. Used both by
 * the explicit "放棄本次冒險" button and by the client auto-abandon on a
 * cold reload into /adventure — see known-issue.md #8.
 */
export const abandonAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ settlement: settleSummarySchema }),
});

/**
 * POST /api/adventure/advance — request body
 */
export const advanceAdventureRequestSchema = z.object({ characterId: z.string() }).strict();

/**
 * POST /api/adventure/advance
 */
export const advanceAdventureResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        state: z.nativeEnum(AdventureStateType),
        step: z.number(),
        nodeType: z.nativeEnum(NodeType).optional(),
        // Present only when this call ended the run (Boss victory) — see
        // single-stage-run-settlement/design.md.
        settlement: settleSummarySchema.optional(),
    }),
});

/**
 * POST /api/adventure/combat/start — request body
 */
export const startCombatRequestSchema = z.object({ characterId: z.string() }).strict();

/**
 * POST /api/adventure/combat/start
 */
export const startCombatResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        combatLog: z.array(z.object({
            timestamp: z.number(),
            wave: z.number(),
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
        // Present only when this call ended the run (defeat) — see
        // single-stage-run-settlement/design.md.
        settlement: settleSummarySchema.optional(),
    }),
});

/**
 * POST /api/adventure/event/resolve — request body
 */
export const resolveEventRequestSchema = z.object({
    characterId: z.string(),
    choiceIndex: z.number().int().min(0).optional(),
}).strict();

export const resolveEventResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        eventId: z.string(),
        eventType: z.string(),
        description: z.string(),
        hpHealed: z.number().optional(),
        blessingGranted: z.string().optional(),
        curseApplied: z.string().optional(),
        goldGained: z.number().optional(),
        gemsGained: z.number().optional(),
        itemsGained: z.array(itemInstanceSchema).optional(),
    }),
});

/**
 * POST /api/adventure/blessing/select — request body
 */
export const selectBlessingRequestSchema = z.object({
    characterId: z.string(), blessingId: z.string(),
}).strict();

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
 * POST /api/adventure/rest/heal — request body
 */
export const restHealRequestSchema = z.object({
    characterId: z.string(), itemId: z.string(),
}).strict();

export type StartAdventureRequest = z.infer<typeof startAdventureRequestSchema>;
export type StartAdventureResponse = z.infer<typeof startAdventureResponseSchema>;
export type GetCurrentAdventureQuery = z.infer<typeof getCurrentAdventureQuerySchema>;
export type GetCurrentAdventureResponse = z.infer<typeof getCurrentAdventureResponseSchema>;
export type AbandonAdventureRequest = z.infer<typeof abandonAdventureRequestSchema>;
export type AbandonAdventureResponse = z.infer<typeof abandonAdventureResponseSchema>;
export type AdvanceAdventureRequest = z.infer<typeof advanceAdventureRequestSchema>;
export type AdvanceAdventureResponse = z.infer<typeof advanceAdventureResponseSchema>;
export type StartCombatRequest = z.infer<typeof startCombatRequestSchema>;
export type StartCombatResponse = z.infer<typeof startCombatResponseSchema>;
export type ResolveEventRequest = z.infer<typeof resolveEventRequestSchema>;
export type ResolveEventResponse = z.infer<typeof resolveEventResponseSchema>;
export type SelectBlessingRequest = z.infer<typeof selectBlessingRequestSchema>;
export type SelectBlessingResponse = z.infer<typeof selectBlessingResponseSchema>;
export type RestHealRequest = z.infer<typeof restHealRequestSchema>;
export type RestHealResponse = z.infer<typeof restHealResponseSchema>;
