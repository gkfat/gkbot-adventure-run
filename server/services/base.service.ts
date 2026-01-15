import { logEvent } from '../utils/logger';

export abstract class BaseService {
    /**
     * Service name for logging (module name)
     */
    protected abstract serviceName: string;

    /**
     * Log info message
     */
    protected logInfo(
        message: string,
        options?: {
            action?: string;
            userId?: string;
            requestId?: string;
            data?: Record<string, unknown>;
        },
    ) {
        logEvent({
            severity: 'INFO',
            message,
            module: this.serviceName,
            ...options,
        });
    }

    /**
     * Log error message
     */
    protected logError(
        message: string,
        options?: {
            action?: string;
            userId?: string;
            requestId?: string;
            data?: Record<string, unknown>;
            error?: unknown;
        },
    ) {
        logEvent({
            severity: 'ERROR',
            message,
            module: this.serviceName,
            ...options,
        });
    }

    /**
     * Log warning message
     */
    protected logWarn(
        message: string,
        options?: {
            action?: string;
            userId?: string;
            requestId?: string;
            data?: Record<string, unknown>;
        },
    ) {
        logEvent({
            severity: 'WARNING',
            message,
            module: this.serviceName,
            ...options,
        });
    }

    /**
     * Log debug message
     */
    protected logDebug(
        message: string,
        options?: {
            action?: string;
            userId?: string;
            requestId?: string;
            data?: Record<string, unknown>;
        },
    ) {
        logEvent({
            severity: 'DEBUG',
            message,
            module: this.serviceName,
            ...options,
        });
    }
}
