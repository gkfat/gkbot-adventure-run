export default defineEventHandler(async (event) => {
    const startTime = Date.now();
    const method = event.method;
    const path = event.path;

    event.node.res.on('finish', () => {
        const duration = Date.now() - startTime;

        logRequest({
            method,
            path,
            userId: event.context.auth?.uid,
            duration,
            status: 200,
        });
    });
});
