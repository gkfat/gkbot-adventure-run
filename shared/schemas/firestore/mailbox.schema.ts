/**
 * Firestore schema for MailMessage collection
 */

import { z } from 'zod';

export const mailMessageSchema = z.object({
    mailId: z.string(),
    characterId: z.string(),
    title: z.string(),
    body: z.string(),
    rewardGold: z.number().int().min(0),
    rewardGems: z.number().int().min(0),
    rewardItemIds: z.array(z.string()),
    status: z.enum(['unclaimed', 'claimed']),
    createdAt: z.number(),
    claimedAt: z.number().optional(),
}).strict();

export type MailMessage = z.infer<typeof mailMessageSchema>;
