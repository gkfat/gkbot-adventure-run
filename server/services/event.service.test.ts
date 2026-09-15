import {
    describe, it, expect, vi, beforeEach,
} from 'vitest';
import { EventService } from './event.service';
import {
    AdventureStateType, EventType, type AdventureRun,
} from '../../shared/types/adventure';
import { BusinessLogicError } from '../../shared/types/errors';
import { CURSE_TEMPLATES } from '../../shared/constants/blessings';

const {
    rngNextMock, getCharacterWithStatsMock, generateCandidatesMock,
} = vi.hoisted(() => ({
    rngNextMock: vi.fn(),
    getCharacterWithStatsMock: vi.fn(),
    generateCandidatesMock: vi.fn(),
}));

vi.mock('./rng.service', () => ({
    RngService: vi.fn().mockImplementation(function RngServiceMock() {
        return {
            next: rngNextMock, nextReward: rngNextMock,
        };
    }),
}));

vi.mock('./character.service', () => ({
    CharacterService: vi.fn().mockImplementation(function CharacterServiceMock() {
        return { getCharacterWithStats: getCharacterWithStatsMock };
    }),
}));

vi.mock('./blessing.service', () => ({
    BlessingService: vi.fn().mockImplementation(function BlessingServiceMock() {
        return { generateCandidates: generateCandidatesMock };
    }),
}));

function baseRun(overrides: Partial<AdventureRun> = {}): AdventureRun {
    return {
        runId: 'run-1',
        characterId: 'char-1',
        accountId: 'account-1',
        seed: 'seed-1',
        rngIndex: 0,
        state: AdventureStateType.EVENT,
        step: 5,
        lastRestStep: 0,
        chapterIndex: 0,
        stageNodeIndex: 0,
        stageNodeCount: 10,
        startedAt: Date.now(),
        playerHp: 50,
        playerHpMax: 100,
        blessings: [],
        curses: [],
        blessingPoints: 0,
        runInventory: [],
        expEarned: 0,
        goldEarned: 0,
        gemsEarned: 0,
        lastActivityAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

let rollQueue: number[];
beforeEach(() => {
    vi.clearAllMocks();
    rollQueue = [];
    rngNextMock.mockImplementation(async () => (rollQueue.length > 0 ? rollQueue.shift() as number : 0.99));
});

describe('EventService.selectEvent', () => {
    it('never picks a HEAL template when healEligible is false (require-combat-before-heal)', async () => {
        const service = new EventService();
        for (let f = 0; f < 5; f++) {
            for (let ty = 0; ty < 5; ty++) {
                rollQueue = [
                    f / 5,
                    ty / 5,
                    0,
                ];
                const template = await service.selectEvent('run-1', false);
                expect(template.type).not.toBe(EventType.HEAL);
            }
        }
    });
});

describe('EventService.resolve', () => {
    it('throws when currentNodeData has no matching event template', async () => {
        const service = new EventService();
        const run = baseRun({ currentNodeData: { eventTemplateId: 'does-not-exist' } });
        await expect(service.resolve(run)).rejects.toThrow(BusinessLogicError);
    });

    it('HEAL: heals a percentage of playerHpMax', async () => {
        const service = new EventService();
        const run = baseRun({ currentNodeData: { eventTemplateId: 'supply_medkit_pallet' } });
        const result = await service.resolve(run);
        expect(result.hpHealed).toBe(15); // 15% of playerHpMax=100
    });

    it('CURSE: applies a curse from CURSE_TEMPLATES', async () => {
        rollQueue = [0];
        const service = new EventService();
        const run = baseRun({ currentNodeData: { eventTemplateId: 'maintenance_malfunctioning_unit' } });
        const result = await service.resolve(run);
        expect(result.curseApplied).toBe(CURSE_TEMPLATES[0]?.modifierId);
    });

    it('BLESSING: grants the first generated candidate', async () => {
        getCharacterWithStatsMock.mockResolvedValue({ attributes: { LUCK: 5 } });
        generateCandidatesMock.mockResolvedValue([
            {
                modifierId: 'blessing_atk_boost', level: 1, 
            },
        ]);
        const service = new EventService();
        const run = baseRun({ currentNodeData: { eventTemplateId: 'research_terminal' } });
        const result = await service.resolve(run);
        expect(result.blessingGranted).toEqual({
            modifierId: 'blessing_atk_boost', level: 1, 
        });
    });

    describe('WHEEL', () => {
        it('gems branch when roll < 0.03', async () => {
            rollQueue = [0.01, 0.5]; // spin roll, amount roll
            const service = new EventService();
            const run = baseRun({ currentNodeData: { eventTemplateId: 'vr_roulette' } });
            const result = await service.resolve(run);
            expect(result.gemsGained).toBeGreaterThanOrEqual(1);
            expect(result.gemsGained).toBeLessThanOrEqual(5);
        });

        it('gold branch when 0.03 <= roll < 0.70', async () => {
            rollQueue = [0.5];
            const service = new EventService();
            const run = baseRun({
                currentNodeData: { eventTemplateId: 'vr_roulette' }, step: 5, 
            });
            const result = await service.resolve(run);
            expect(result.goldGained).toBe(15); // 5 + step*2
        });

        it('item branch when 0.70 <= roll < 0.85', async () => {
            rollQueue = [0.75, 0.1];
            const service = new EventService();
            const run = baseRun({ currentNodeData: { eventTemplateId: 'vr_roulette' } });
            const result = await service.resolve(run);
            expect(result.itemsGained).toHaveLength(1);
            expect(result.itemsGained?.[0]?.characterId).toBe('char-1');
        });

        it('no-win branch when roll >= 0.85', async () => {
            rollQueue = [0.9];
            const service = new EventService();
            const run = baseRun({ currentNodeData: { eventTemplateId: 'vr_roulette' } });
            const result = await service.resolve(run);
            expect(result.goldGained).toBeUndefined();
            expect(result.gemsGained).toBeUndefined();
            expect(result.itemsGained).toBeUndefined();
        });
    });

    describe('CHOICE', () => {
        it('throws when choiceIndex is missing', async () => {
            const service = new EventService();
            const run = baseRun({ currentNodeData: { eventTemplateId: 'sealed_crate' } });
            await expect(service.resolve(run)).rejects.toThrow(BusinessLogicError);
        });

        it('SAFE choice always succeeds without consuming RNG', async () => {
            const service = new EventService();
            const run = baseRun({ currentNodeData: { eventTemplateId: 'sealed_crate' } });
            const result = await service.resolve(run, 1);
            expect(result.goldGained).toBe(5);
            expect(rngNextMock).not.toHaveBeenCalled();
        });

        it('RISK choice succeeds when roll >= risk threshold', async () => {
            rollQueue = [0.9];
            const service = new EventService();
            const run = baseRun({ currentNodeData: { eventTemplateId: 'sealed_crate' } });
            const result = await service.resolve(run, 0);
            expect(result.goldGained).toBe(30);
            expect(result.curseApplied).toBeUndefined();
        });

        it('RISK choice fails and applies a curse when roll < risk threshold', async () => {
            rollQueue = [0.1, 0.5];
            const service = new EventService();
            const run = baseRun({ currentNodeData: { eventTemplateId: 'sealed_crate' } });
            const result = await service.resolve(run, 0);
            expect(result.curseApplied).toBeDefined();
            expect(result.goldGained).toBeUndefined();
        });
    });
});
