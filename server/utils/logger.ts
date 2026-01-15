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
 * API Log request with context
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

/**
 * Service Log event
 */
export function logEvent(context: {
  severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  message: string;

  module?: string;        // auth / combat / firestore
  action?: string;        // verifyToken / startRun
  userId?: string;
  requestId?: string;

  data?: Record<string, unknown>;
  error?: unknown;
}) {
    const errorPayload =
        context.error === undefined
            ? {}
            : {
                error:
                      context.error instanceof Error
                          ? {
                              message: context.error.message,
                              stack: context.error.stack,
                          }
                          : context.error,
            };

    const payload = {
        severity: context.severity ?? 'INFO',
        timestamp: new Date().toISOString(),
        message: context.message,
        module: context.module,
        action: context.action,
        userId: context.userId,
        requestId: context.requestId,
        data: context.data,
        ...errorPayload,

    };

    const output = JSON.stringify(payload);

    if (context.severity === 'ERROR') {
        console.error(output);
    } else {
        console.log(output);
    }
}
