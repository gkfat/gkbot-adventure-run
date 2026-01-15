export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const {
        method, path, 
    } = event;

    event.node.res.on('finish', () => {
        const durationMs = Date.now() - startTime;

        logRequest({
            severity: 'INFO',
            method,
            path,
            status: event.node.res.statusCode,
            durationMs,
            userId: event.context.auth?.uid,
            requestId: event.context.requestId,
        });
    });
});
