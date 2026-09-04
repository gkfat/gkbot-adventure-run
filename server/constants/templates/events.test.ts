import {
    describe, it, expect,
} from 'vitest';
import {
    pickEventTemplate, EVENT_TEMPLATES, FACILITY_FAMILIES, EVENT_TYPE_WEIGHTS,
} from './events';
import { EventType } from '../../../shared/types/adventure';

describe('pickEventTemplate', () => {
    it('picks the first family/type/variant at roll=0', () => {
        const firstFamily = FACILITY_FAMILIES[0];
        const firstType = Object.values(EventType)[0] as EventType;
        const expected = firstFamily?.eventsByType[firstType]?.[0];
        expect(pickEventTemplate(0, 0, 0, true).id).toBe(expected?.id);
    });

    it('always returns a template from the flattened table across the full roll range', () => {
        const ids = new Set(EVENT_TEMPLATES.map(t => t.id));
        for (let f = 0; f < 5; f++) {
            for (let ty = 0; ty < 5; ty++) {
                for (let v = 0; v < 5; v++) {
                    expect(ids.has(pickEventTemplate(f / 5, ty / 5, v / 5, true).id)).toBe(true);
                }
            }
        }
    });

    it('never returns a HEAL template when healEligible is false (require-combat-before-heal)', () => {
        for (let f = 0; f < 5; f++) {
            for (let ty = 0; ty < 5; ty++) {
                for (let v = 0; v < 5; v++) {
                    expect(pickEventTemplate(f / 5, ty / 5, v / 5, false).type).not.toBe(EventType.HEAL);
                }
            }
        }
    });

    it('can return a HEAL template when healEligible is true', () => {
        // EventType enum order is HEAL, BLESSING, CURSE, WHEEL, CHOICE — the
        // weighted cursor walks types in that order, so a small typeRoll
        // lands inside HEAL's [0, EVENT_TYPE_WEIGHTS.HEAL) window.
        const withinHealWindow = (EVENT_TYPE_WEIGHTS[EventType.HEAL] - 0.01)
            / Object.values(EVENT_TYPE_WEIGHTS).reduce((sum, w) => sum + w, 0);
        expect(pickEventTemplate(0, withinHealWindow, 0, true).type).toBe(EventType.HEAL);
    });

    it('every facility family defines 3~5 variants for every EventType', () => {
        for (const family of FACILITY_FAMILIES) {
            for (const type of Object.values(EventType)) {
                const variants = family.eventsByType[type];
                expect(variants.length).toBeGreaterThanOrEqual(3);
                expect(variants.length).toBeLessThanOrEqual(5);
                for (const variant of variants) {
                    expect(variant.type).toBe(type);
                }
            }
        }
    });

    it('every template id in EVENT_TEMPLATES is unique', () => {
        const ids = EVENT_TEMPLATES.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
