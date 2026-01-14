/**
 * Base service class with common patterns
 */

export abstract class BaseService {
    /**
     * Service name for logging
     */
    protected abstract serviceName: string;

    /**
   * Log info message
   */
    protected logInfo(message: string, context?: any) {
        console.log(`[${this.serviceName}] ${message}`, context || '');
    }

    /**
   * Log error message
   */
    protected logError(message: string, error?: any) {
        console.error(`[${this.serviceName}] ERROR: ${message}`, error || '');
    }

    /**
   * Log warning message
   */
    protected logWarn(message: string, context?: any) {
        console.warn(`[${this.serviceName}] WARN: ${message}`, context || '');
    }
}
