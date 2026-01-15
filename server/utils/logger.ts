export interface LogContext {
    severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
    message?: string;

    method: string;
    path: string;
    status?: number;
    durationMs?: number;

    userId?: string;
    requestId?: string;

    error?: unknown;
}

/**
 * Log request with context
 */
export function logRequest(context: LogContext) {
    const {
        severity = 'INFO',
        error,
        ...rest
    } = context;

    const errorPayload =
        error === undefined
            ? {}
            : {
                error:
                      error instanceof Error
                          ? {
                              message: error.message,
                              stack: error.stack,
                          }
                          : error,
            };
  
    const logPayload = {
        severity,
        timestamp: new Date().toISOString(),
        ...rest,
        ...errorPayload,
    };

    if (severity === 'ERROR') {
        console.error(JSON.stringify(logPayload));
    } else {
        console.log(JSON.stringify(logPayload));
    }
}
