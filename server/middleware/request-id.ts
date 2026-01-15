import { randomUUID } from 'crypto';

export default defineEventHandler((event) => {
    event.context.requestId = randomUUID();
});