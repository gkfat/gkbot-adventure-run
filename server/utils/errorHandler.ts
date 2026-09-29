/**
 * Global error handler middleware for Nitro
 */

import {
    H3Error, createError, 
} from 'h3';
import { AppError } from '../../shared/types/errors';

/**
 * Format error response
 */
export function formatErrorResponse(error: any) {
    // Handle H3 errors
    if (error instanceof H3Error) {
        return {
            success: false,
            error: {
                message: error.message,
                statusCode: error.statusCode,
                code: error.data?.code,
            },
        };
    }

    // Handle custom AppError
    if (error instanceof AppError) {
        return {
            success: false,
            error: {
                message: error.message,
                statusCode: error.statusCode,
                code: error.code,
                details: (error as any).details,
            },
        };
    }

    // Handle unknown errors
    console.error('Unhandled error:', error);
    return {
        success: false,
        error: {
            message: 'Internal server error',
            statusCode: 500,
        },
    };
}

/**
 * Convert AppError to H3Error for Nitro
 */
export function toH3Error(error: any): H3Error {
    if (error instanceof H3Error) {
        return error;
    }

    if (error instanceof AppError) {
        return createError({
            statusCode: error.statusCode,
            message: error.message,
            data: {
                // h3's default sendError only forwards `data`/`statusMessage`
                // to the client JSON body, dropping the thrown error's own
                // `message` entirely — duplicate it into `data.message` so
                // the frontend can read the real reason instead of ofetch's
                // generic "[METHOD] url: status statusText" fallback.
                message: error.message,
                code: error.code,
                details: (error as any).details,
            },
        });
    }

    return createError({
        statusCode: 500,
        message: error?.message || 'Internal server error',
    });
}
