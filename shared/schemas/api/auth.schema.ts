/**
 * API schemas for authentication endpoints
 */

import { z } from 'zod';

/**
 * POST /api/auth/login
 */
export const loginRequestSchema = z.object({ idToken: z.string().min(1) }).strict();

export const loginResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        accountId: z.string(),
        email: z.string().email(),
        isNewAccount: z.boolean(),
    }),
});

/**
 * GET /api/auth/me
 */
export const meResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        accountId: z.string(),
        email: z.string().email(),
        createdAt: z.number(),
    }),
});

/**
 * DELETE /api/auth/account
 */
export const deleteAccountResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({ message: z.string() }),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type DeleteAccountResponse = z.infer<typeof deleteAccountResponseSchema>;
