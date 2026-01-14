export interface LogContext {
  method: string;
  path: string;
  userId?: string;
  duration?: number;
  status?: number;
  error?: any;
}

/**
 * Log request with context
 */
export function logRequest(context: LogContext) {
    const {
        method, path, userId, duration, status, error, 
    } = context;
  
    const timestamp = new Date().toISOString();
    const userInfo = userId ? ` [${userId}]` : '';
    const durationInfo = duration ? ` ${duration}ms` : '';
    const statusInfo = status ? ` ${status}` : '';
  
    if (error) {
        console.error(
            `[${timestamp}] ${method} ${path}${userInfo}${statusInfo}${durationInfo}`,
            error,
        );
    } else {
        console.log(
            `[${timestamp}] ${method} ${path}${userInfo}${statusInfo}${durationInfo}`,
        );
    }
}
