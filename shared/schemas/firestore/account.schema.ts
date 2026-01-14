/**
 * Firestore schema for Account collection
 */

import { z } from 'zod';

/**
 * Account document schema (strict mode)
 */
export const accountSchema = z.object({
    accountId: z.string(),
    provider: z.literal('google'),
    googleUid: z.string(),
    email: z.string().email(),
    createdAt: z.number(),
    updatedAt: z.number(),
}).strict();

export type Account = z.infer<typeof accountSchema>;
