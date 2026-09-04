/**
 * Event Service — implements the `EventResolver` interface adventure-run-core
 * defined. `selectEvent()` (called from AdventureRunService.advanceFromExploring
 * when it decides the next node is EVENT/CHOICE) picks the template via
 * decisive RNG; `resolve()` (called from the dedicated
 * `POST /api/adventure/event/resolve` endpoint) computes the outcome for
 * whichever template was already picked and stored in `run.currentNodeData`.
 */

import { BaseService } from './base.service';
import { CharacterService } from './character.service';
import { RngService } from './rng.service';
import { BlessingService } from './blessing.service';
import { CURSE_TEMPLATES } from '../../shared/constants/blessings';
import { generateItemInstance } from './item.service';
import {
    EVENT_TEMPLATES, pickEventTemplate, type EventTemplate,
    WHEEL_GEMS_CHANCE, WHEEL_GEMS_MIN, WHEEL_GEMS_MAX, WHEEL_GOLD_CHANCE, WHEEL_ITEM_CHANCE, WHEEL_RISK_CURSE_CHANCE,
    getItemTemplate, ITEM_TEMPLATES,
} from '../constants/templates';
import {
    ItemType, ItemSource, 
} from '../../shared/types/item';
import type { ItemInstance } from '../../shared/types/item';
import {
    EventType, type AdventureRun, type EventResolver, type EventResult,
} from '../../shared/types/adventure';
import { BusinessLogicError } from '../../shared/types/errors';

const EQUIPMENT_TEMPLATE_IDS = Object.values(ITEM_TEMPLATES)
    .filter(template => template.type === ItemType.EQUIPMENT)
    .map(template => template.templateId);

export class EventService extends BaseService implements EventResolver {
    protected serviceName = 'event';
    private rngService: RngService;
    private characterService: CharacterService;
    private blessingService: BlessingService;

    constructor() {
        super();
        this.rngService = new RngService();
        this.characterService = new CharacterService();
        this.blessingService = new BlessingService();
    }

    /**
     * Pick the event template for a fresh EVENT node — a three-stage
     * weighted draw (facility family → EventType → variant, see events.ts's
     * header comment), each stage consuming one RNG draw. `healEligible`
     * gates HEAL-type templates out of the pool until the run has
     * encountered its first combat (see pickEventTemplate's
     * require-combat-before-heal note).
     */
    async selectEvent(runId: string, healEligible: boolean): Promise<EventTemplate> {
        const familyRoll = await this.rngService.next(runId);
        const typeRoll = await this.rngService.next(runId);
        const variantRoll = await this.rngService.next(runId);
        return pickEventTemplate(familyRoll, typeRoll, variantRoll, healEligible);
    }

    async resolve(run: AdventureRun, choiceIndex?: number): Promise<EventResult> {
        const nodeData = run.currentNodeData as { eventTemplateId?: string } | undefined;
        const template = EVENT_TEMPLATES.find(t => t.id === nodeData?.eventTemplateId);
        if (!template) {
            throw new BusinessLogicError('Run has no event node context to resolve');
        }

        switch (template.type) {
        case EventType.HEAL:
            return this.resolveHeal(run, template);
        case EventType.BLESSING:
            return this.resolveBlessing(run, template);
        case EventType.CURSE:
            return this.resolveCurse(run, template);
        case EventType.WHEEL:
            return this.resolveWheel(run, template);
        case EventType.CHOICE:
            return this.resolveChoice(run, template, choiceIndex);
        default:
            throw new BusinessLogicError(`Unknown event type: ${template.type}`);
        }
    }

    private resolveHeal(run: AdventureRun, template: EventTemplate): EventResult {
        const hpHealed = Math.round(run.playerHpMax * ((template.healPercent ?? 0) / 100));
        return {
            eventId: template.id, type: template.type, description: template.description, hpHealed,
        };
    }

    private async resolveBlessing(run: AdventureRun, template: EventTemplate): Promise<EventResult> {
        const character = await this.characterService.getCharacterWithStats(run.accountId, run.characterId);
        const [granted] = await this.blessingService.generateCandidates(run.runId, character.attributes.LUCK, run.blessings);
        return {
            eventId: template.id,
            type: template.type,
            description: template.description,
            blessingGranted: granted ? {
                modifierId: granted.modifierId, level: granted.level,
            } : undefined,
        };
    }

    private async resolveCurse(run: AdventureRun, template: EventTemplate): Promise<EventResult> {
        const roll = await this.rngService.next(run.runId);
        const curse = CURSE_TEMPLATES[Math.floor(roll * CURSE_TEMPLATES.length)];
        return {
            eventId: template.id, type: template.type, description: template.description, curseApplied: curse?.modifierId,
        };
    }

    private async resolveWheel(run: AdventureRun, template: EventTemplate): Promise<EventResult> {
        const roll = await this.rngService.next(run.runId);

        if (roll < WHEEL_GEMS_CHANCE) {
            const amountRoll = await this.rngService.next(run.runId);
            const gemsGained = WHEEL_GEMS_MIN + Math.round((WHEEL_GEMS_MAX - WHEEL_GEMS_MIN) * amountRoll);
            return {
                eventId: template.id, type: template.type, description: template.description, gemsGained,
            };
        }

        if (roll < WHEEL_GEMS_CHANCE + WHEEL_GOLD_CHANCE) {
            const goldGained = 5 + run.step * 2; // ASSUMPTION: scales with step, see design.md
            return {
                eventId: template.id, type: template.type, description: template.description, goldGained,
            };
        }

        if (roll < WHEEL_GEMS_CHANCE + WHEEL_GOLD_CHANCE + WHEEL_ITEM_CHANCE) {
            const pickRoll = await this.rngService.next(run.runId);
            const templateId = EQUIPMENT_TEMPLATE_IDS[Math.floor(pickRoll * EQUIPMENT_TEMPLATE_IDS.length)] as string;
            const itemsGained: ItemInstance[] = getItemTemplate(templateId)
                ? [
                    {
                        ...generateItemInstance(templateId, { source: ItemSource.EVENT }), characterId: run.characterId,
                    },
                ]
                : [];

            return {
                eventId: template.id, type: template.type, description: template.description, itemsGained,
            };
        }

        // remainder [gems + gold + item, 1.0) chance: no reward
        return {
            eventId: template.id, type: template.type, description: template.description,
        };
    }

    private async resolveChoice(run: AdventureRun, template: EventTemplate, choiceIndex?: number): Promise<EventResult> {
        const choice = choiceIndex !== undefined ? template.choices?.[choiceIndex] : undefined;
        if (!choice) {
            throw new BusinessLogicError('Invalid or missing choiceIndex for this event');
        }

        if (choice.kind === 'SAFE') {
            return {
                eventId: template.id, type: template.type, description: template.description, goldGained: choice.goldOnSuccess,
            };
        }

        const roll = await this.rngService.next(run.runId);
        const failed = roll < WHEEL_RISK_CURSE_CHANCE;
        if (failed && choice.riskCurseOnFailure) {
            const curseRoll = await this.rngService.next(run.runId);
            const curse = CURSE_TEMPLATES[Math.floor(curseRoll * CURSE_TEMPLATES.length)];
            return {
                eventId: template.id, type: template.type, description: template.description, curseApplied: curse?.modifierId,
            };
        }

        return {
            eventId: template.id, type: template.type, description: template.description, goldGained: choice.goldOnSuccess,
        };
    }
}
