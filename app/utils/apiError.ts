/**
 * Extract the actual server-side error message from a caught `$fetch`/ofetch
 * error. `AppError`-derived server errors carry their real message under
 * `err.data.message` (see server/utils/errorHandler.ts's `toH3Error`) — h3's
 * default error response only forwards `data`/`statusMessage`, not the
 * thrown error's own `message`, so `err.message` on the client is ofetch's
 * generic `[METHOD] "url": status statusText` fallback, not the business
 * reason. Falls back to `err.message`, then `fallback`.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object') {
        const data = (err as { data?: { message?: string } }).data;
        if (data?.message) return data.message;

        const message = (err as { message?: string }).message;
        if (message) return message;
    }
    return fallback;
}

/**
 * Known server-side `AppError` messages translated into player-facing
 * copy — a bare "Insufficient resources" isn't something a player should
 * ever see as-is.
 */
const KNOWN_API_ERROR_MESSAGES: Record<string, string> = { 'Insufficient resources': '餘額不足，去探索看看吧？' };

export function translateApiErrorMessage(message: string): string {
    return KNOWN_API_ERROR_MESSAGES[message] ?? message;
}
