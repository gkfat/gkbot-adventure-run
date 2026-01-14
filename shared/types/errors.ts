/**
 * Custom error types for better error handling
 */

/**
 * Base application error
 */
export class AppError extends Error {
    constructor(
        message: string,
    public statusCode: number = 500,
    public code?: string,
    ) {
        super(message);
        this.name = this.constructor.name;
        // Node.js specific: capture stack trace
        if (typeof (Error as any).captureStackTrace === 'function') {
            (Error as any).captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Authentication/Authorization errors
 */
export class AuthError extends AppError {
    constructor(message: string = 'Authentication failed', code?: string) {
        super(message, 401, code);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden', code?: string) {
        super(message, 403, code);
    }
}

/**
 * Resource not found
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource', code?: string) {
        super(`${resource} not found`, 404, code);
    }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
    constructor(
        message: string = 'Validation failed',
    public details?: Record<string, any>,
    code?: string,
    ) {
        super(message, 400, code);
    }
}

/**
 * Resource conflict (e.g., already exists)
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict', code?: string) {
        super(message, 409, code);
    }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends AppError {
    constructor(message: string, code?: string) {
        super(message, 400, code);
    }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded', code?: string) {
        super(message, 429, code);
    }
}

/**
 * External service errors
 */
export class ExternalServiceError extends AppError {
    constructor(
        service: string,
        message: string = 'External service error',
        code?: string,
    ) {
        super(`${service}: ${message}`, 502, code);
    }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
    constructor(message: string = 'Database operation failed', code?: string) {
        super(message, 500, code);
    }
}
