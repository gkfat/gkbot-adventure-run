/**
 * API schemas for account settings endpoints
 */

import { z } from 'zod';

/**
 * PUT /api/account/settings
 */
export const updateAccountSettingsRequestSchema = z.object({
    bgmEnabled: z.boolean().optional(),
    sfxEnabled: z.boolean().optional(),
}).strict();

export const updateAccountSettingsResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        bgmEnabled: z.boolean(),
        sfxEnabled: z.boolean(),
    }),
});

export type UpdateAccountSettingsRequest = z.infer<typeof updateAccountSettingsRequestSchema>;
export type UpdateAccountSettingsResponse = z.infer<typeof updateAccountSettingsResponseSchema>;
