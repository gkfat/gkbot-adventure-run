/**
 * API schemas for mailbox endpoints (character-scoped — see mailbox
 * proposal.md: rewards are character-level resources, so mail is addressed
 * to characterId)
 */

import { z } from 'zod';
import { mailMessageSchema } from '../firestore/mailbox.schema';

/**
 * GET /api/character/{characterId}/mailbox
 */
export const getMailboxResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ mails: z.array(mailMessageSchema) }),
});

/**
 * POST /api/character/{characterId}/mailbox/{mailId}/claim
 */
export const claimMailResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        goldEarned: z.number(),
        gemsEarned: z.number(),
        itemIdsAdded: z.array(z.string()),
    }),
});

export type GetMailboxResponse = z.infer<typeof getMailboxResponseSchema>;
export type ClaimMailResponse = z.infer<typeof claimMailResponseSchema>;
