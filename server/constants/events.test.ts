import {
    describe, it, expect, 
} from 'vitest';
import {
    pickEventTemplate, EVENT_TEMPLATES, 
} from './events';

describe('pickEventTemplate', () => {
    it('picks the first template at roll=0', () => {
        expect(pickEventTemplate(0).id).toBe(EVENT_TEMPLATES[0]?.id);
    });

    it('picks the last template as roll approaches 1', () => {
        expect(pickEventTemplate(0.999).id).toBe(EVENT_TEMPLATES[EVENT_TEMPLATES.length - 1]?.id);
    });

    it('always returns a template from the table across the full roll range', () => {
        const ids = new Set(EVENT_TEMPLATES.map(t => t.id));
        for (let i = 0; i < 20; i++) {
            expect(ids.has(pickEventTemplate(i / 20).id)).toBe(true);
        }
    });
});
