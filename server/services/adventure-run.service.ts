/**
 * Adventure Run Service — the state machine that drives a single run:
 * start/resume/advance/end, node generation, and rest-node healing.
 *
 * COMBAT and EVENT nodes are NOT resolved via `advance()` (see proposal.md's
 * "實作順序建議" and design.md's Non-Goals) — `advance()` only sets the run
 * into the COMBAT/EVENT state with enough context for a dedicated resolver
 * endpoint to pick up; calling `advance()` again while stuck there throws.
 * COMBAT is resolved via `resolveCombat()` (combat-engine's
 * `POST /api/adventure/combat/start`). EVENT is resolved via `resolveEvent()`
 * (events-and-blessings' `POST /api/adventure/event/resolve`). BLESSING_SELECT
 * candidates are generated here (`advanceFromResolution`) and picked via
 * `selectBlessing()` (events-and-blessings' `POST /api/adventure/blessing/select`).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { BaseService } from './base.service';
import { AdventureRunRepository } from '../repositories/adventure-run.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { CharacterService } from './character.service';
import { ItemRepository } from '../repositories/item.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { RngService } from './rng.service';
import { CombatService } from './combat.service';
import { EventService } from './event.service';
import { BlessingService } from './blessing.service';
import {
    NoopLeaderboardUpdater, NoopProgressTracker,
} from './adventure-run-stubs';
import {
    getEnemyLevel, rollWaveCount, rollEnemyCount,
} from '../constants/difficulty';
import {
    AdventureStateType, AdventureEndReason, NodeType, NODE_CONFIG,
    type AdventureRun, type LeaderboardUpdater, type ProgressTracker,
    type CombatResolver, type CombatContext, type CombatResolution, type CombatSummary, type CombatLogEntry,
    type EventResult, type RunModifier,
} from '../../shared/types/adventure';
import type { Character } from '../../shared/types/character';
import type { ItemInstance } from '../../shared/types/item';
import { ItemType } from '../../shared/types/item';
import {
    clamp, RESOURCE_LIMITS,
} from '../../shared/types/common';
import {
    NotFoundError, ConflictError, BusinessLogicError, ValidationError,
} from '../../shared/types/errors';

/**
 * Strip `seed` from a run before it can reach any API response — the single
 * shared implementation for every place a run (or a reference to one, e.g.
 * ConflictError's `details.run`) leaves this service. See
 * deterministic-rng spec.md: "seed 不透過 API 回應暴露" (SHALL NOT).
 */
export function stripSeed(run: AdventureRun): Omit<AdventureRun, 'seed'> {
    const publicRun: Partial<AdventureRun> = { ...run };
    delete publicRun.seed;
    return publicRun as Omit<AdventureRun, 'seed'>;
}

export type SettleResult = {
    finalScore: number;
    goldEarned: number;
    gemsEarned: number;
    itemsEarned: number;
    expGained: number;
    leveledUp: boolean;
    untransferredItemIds: string[];
};

// Weighted-random node type picked when neither the rest guarantee nor the
// elite cadence triggers (see NODE_CONFIG.WEIGHTED_NODE_WEIGHTS).
const WEIGHTED_NODE_TYPES: { type: NodeType; weight: number }[] = [
    {
        type: NodeType.COMBAT, weight: NODE_CONFIG.WEIGHTED_NODE_WEIGHTS.COMBAT, 
    },
    {
        type: NodeType.EVENT, weight: NODE_CONFIG.WEIGHTED_NODE_WEIGHTS.EVENT, 
    },
    {
        type: NodeType.REST, weight: NODE_CONFIG.WEIGHTED_NODE_WEIGHTS.REST, 
    },
    {
        type: NodeType.CHOICE, weight: NODE_CONFIG.WEIGHTED_NODE_WEIGHTS.CHOICE, 
    },
];
const WEIGHTED_NODE_TOTAL = WEIGHTED_NODE_TYPES.reduce((sum, entry) => sum + entry.weight, 0);

export class AdventureRunService extends BaseService {
    protected serviceName = 'adventure-run';
    private runRepo: AdventureRunRepository;
    private characterRepo: CharacterRepository;
    private characterService: CharacterService;
    private itemRepo: ItemRepository;
    private inventoryRepo: InventoryRepository;
    private rngService: RngService;
    private leaderboardUpdater: LeaderboardUpdater;
    private progressTracker: ProgressTracker;
    private combatResolver: CombatResolver;
    private eventService: EventService;
    private blessingService: BlessingService;

    constructor() {
        super();
        this.runRepo = new AdventureRunRepository();
        this.characterRepo = new CharacterRepository();
        this.characterService = new CharacterService();
        this.itemRepo = new ItemRepository();
        this.inventoryRepo = new InventoryRepository();
        this.rngService = new RngService();
        this.leaderboardUpdater = new NoopLeaderboardUpdater();
        this.progressTracker = new NoopProgressTracker();
        this.combatResolver = new CombatService();
        this.eventService = new EventService();
        this.blessingService = new BlessingService();
    }

    /**
     * Start a new run. Rejects (409) if the character already has one
     * in progress — the caller gets the existing run back in `details` so
     * the frontend can offer "continue" instead of erroring out.
     */
    async startRun(accountId: string, characterId: string): Promise<AdventureRun> {
        await this.requireOwnedCharacter(accountId, characterId);

        const existing = await this.runRepo.getActiveByCharacterId(characterId);
        if (existing) {
            throw new ConflictError(
                'Character already has an active adventure run',
                { run: stripSeed(existing) },
            );
        }

        const characterWithStats = await this.characterService.getCharacterWithStats(accountId, characterId);
        return this.runRepo.createRun({
            characterId,
            accountId,
            playerHpMax: characterWithStats.stats.HP_MAX,
        });
    }

    /**
     * Resume the character's active run, if any. Detects an expired
     * reconnect window (NODE_CONFIG.RECONNECT_WINDOW_MS) and auto-settles
     * with endReason=DISCONNECT before returning null.
     */
    async getCurrentRun(accountId: string, characterId: string): Promise<AdventureRun | null> {
        await this.requireOwnedCharacter(accountId, characterId);

        const run = await this.runRepo.getActiveByCharacterId(characterId);
        if (!run) {
            return null;
        }

        if (Date.now() - run.lastActivityAt > NODE_CONFIG.RECONNECT_WINDOW_MS) {
            await this.settleRun(run, AdventureEndReason.DISCONNECT);
            return null;
        }

        return run;
    }

    /**
     * Advance the run's state machine by one checkpoint. See the module
     * doc comment for why COMBAT/EVENT nodes throw instead of resolving.
     */
    async advance(accountId: string, characterId: string): Promise<AdventureRun> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        switch (run.state) {
        case AdventureStateType.INIT:
            return this.runRepo.saveCheckpoint(run.runId, {
                state: AdventureStateType.EXPLORING,
                lastActivityAt: Date.now(),
            });

        case AdventureStateType.EXPLORING:
            return this.advanceFromExploring(run);

        case AdventureStateType.REST:
            return this.runRepo.saveCheckpoint(run.runId, {
                state: AdventureStateType.RESOLUTION,
                lastRestStep: run.step,
                lastActivityAt: Date.now(),
            });

        case AdventureStateType.COMBAT:
            throw new BusinessLogicError('Use POST /api/adventure/combat/start to resolve a COMBAT node, not advance()');

        case AdventureStateType.EVENT:
            throw new BusinessLogicError('Use POST /api/adventure/event/resolve to resolve an EVENT node, not advance()');

        case AdventureStateType.RESOLUTION:
            return this.advanceFromResolution(run);

        case AdventureStateType.BLESSING_SELECT:
            throw new BusinessLogicError('Use POST /api/adventure/blessing/select to pick a blessing, not advance()');

        case AdventureStateType.ENDED:
            throw new BusinessLogicError('This run has already ended');

        default:
            throw new BusinessLogicError(`Unknown run state: ${run.state}`);
        }
    }

    /**
     * Use a POTION item at a Rest node. Looks in the run's own inventory
     * first (this run's drops), then the permanent inventory.
     */
    async useHealingItem(accountId: string, characterId: string, itemId: string): Promise<{ hpHealed: number; hpCurrent: number }> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        if (run.state !== AdventureStateType.REST) {
            throw new BusinessLogicError('Can only use items at a Rest node');
        }

        const runItem = run.runInventory.find(item => item.itemId === itemId);
        const source: 'run' | 'permanent' = runItem ? 'run' : 'permanent';
        const item = runItem ?? await this.findOwnedPermanentPotion(characterId, itemId);

        if (!item || item.type !== ItemType.POTION) {
            throw new ValidationError('Item not found or not a potion');
        }

        const healPercent = item.stats.healPercent ?? 0;
        const healAmount = Math.round(run.playerHpMax * (healPercent / 100));
        const hpCurrent = clamp(run.playerHp + healAmount, 0, run.playerHpMax);
        const hpHealed = hpCurrent - run.playerHp;

        if (source === 'run') {
            await this.runRepo.saveCheckpoint(run.runId, {
                playerHp: hpCurrent,
                runInventory: run.runInventory.filter(existing => existing.itemId !== itemId),
                lastActivityAt: Date.now(),
            });
        } else {
            await this.runRepo.saveCheckpoint(run.runId, {
                playerHp: hpCurrent,
                lastActivityAt: Date.now(),
            });
            await this.inventoryRepo.removeItem(characterId, itemId);
            await this.itemRepo.delete(itemId);
        }

        return {
            hpHealed, hpCurrent,
        };
    }

    /**
     * Resolve the run's current COMBAT node via `CombatResolver` (combat-engine).
     * Rolls waveCount/enemyCountPerWave here (not in `advanceFromExploring`,
     * which only decides enemyLevel/tier — see its comment) since they're
     * only needed once combat is actually resolved. On victory, applies
     * rewards and moves to RESOLUTION; on defeat, settles with `endReason=DEAD`.
     */
    async resolveCombat(accountId: string, characterId: string): Promise<{ combatLog: CombatLogEntry[]; summary: CombatSummary }> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        if (run.state !== AdventureStateType.COMBAT) {
            throw new BusinessLogicError('Can only resolve combat at a COMBAT node');
        }
        const nodeData = run.currentNodeData as { enemyLevel: number; tier: CombatContext['tier'] } | undefined;
        if (!nodeData || typeof nodeData.enemyLevel !== 'number') {
            throw new BusinessLogicError('Run has no combat node context to resolve');
        }

        const context: CombatContext = {
            enemyLevel: nodeData.enemyLevel,
            tier: nodeData.tier,
            waveCount: rollWaveCount(run.step, await this.rngService.next(run.runId)),
            enemyCountPerWave: rollEnemyCount(run.step, await this.rngService.next(run.runId)),
        };

        const resolution = await this.combatResolver.resolve(run, context);
        const combatResult: Partial<CombatResolution> = { ...resolution };
        delete combatResult.combatLog;
        const summary: CombatSummary = {
            ...(combatResult as Omit<CombatResolution, 'combatLog'>), completedAt: Date.now(),
        };

        const runInventory = [...run.runInventory, ...resolution.itemsDropped]
            .slice(0, RESOURCE_LIMITS.INVENTORY_RUN_MAX);

        if (resolution.victory) {
            await this.runRepo.saveCheckpoint(run.runId, {
                state: AdventureStateType.RESOLUTION,
                playerHp: resolution.playerHpRemaining,
                score: run.score + resolution.scoreGained,
                goldEarned: run.goldEarned + resolution.goldDropped,
                gemsEarned: run.gemsEarned + resolution.gemsDropped,
                blessingPoints: run.blessingPoints + resolution.blessingPointsGained,
                runInventory,
                lastCombatSummary: summary,
                currentNodeData: FieldValue.delete(),
                lastActivityAt: Date.now(),
            });
            await this.progressTracker.incrementProgress({
                accountId: run.accountId, characterId: run.characterId, type: 'ENEMY_KILLED', amount: resolution.enemies.length,
            });
        } else {
            await this.settleRun({
                ...run, playerHp: 0,
            }, AdventureEndReason.DEAD, {
                playerHp: 0,
                lastCombatSummary: summary,
            });
        }

        return {
            combatLog: resolution.combatLog, summary,
        };
    }

    /**
     * Resolve the run's current EVENT node via `EventService`. Applies
     * whichever outcome fields are present (heal/gold/gems/items/blessing/
     * curse) and moves to RESOLUTION — same "single writer" pattern as
     * `resolveCombat`.
     */
    async resolveEvent(accountId: string, characterId: string, choiceIndex?: number): Promise<EventResult> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        if (run.state !== AdventureStateType.EVENT) {
            throw new BusinessLogicError('Can only resolve an event at an EVENT node');
        }

        const result = await this.eventService.resolve(run, choiceIndex);

        const patch: Record<string, unknown> = {
            state: AdventureStateType.RESOLUTION,
            currentNodeData: FieldValue.delete(),
            lastActivityAt: Date.now(),
        };
        if (result.hpHealed) {
            patch.playerHp = clamp(run.playerHp + result.hpHealed, 0, run.playerHpMax);
        }
        if (result.goldGained) {
            patch.goldEarned = run.goldEarned + result.goldGained;
        }
        if (result.gemsGained) {
            patch.gemsEarned = run.gemsEarned + result.gemsGained;
        }
        if (result.itemsGained?.length) {
            patch.runInventory = [...run.runInventory, ...result.itemsGained].slice(0, RESOURCE_LIMITS.INVENTORY_RUN_MAX);
        }
        if (result.blessingGranted) {
            patch.blessings = [...run.blessings, result.blessingGranted];
        }
        if (result.curseApplied) {
            patch.curses = [...run.curses, result.curseApplied];
        }

        await this.runRepo.saveCheckpoint(run.runId, patch);
        return result;
    }

    /**
     * Select one of the current BLESSING_SELECT candidates. Since
     * `advanceFromResolution` skips its usual `step + 1` when routing into
     * BLESSING_SELECT (see there), this is the one that increments it —
     * BLESSING_SELECT -> EXPLORING is a direct edge (ALLOWED_TRANSITIONS),
     * there is no separate RESOLUTION checkpoint after picking.
     */
    async selectBlessing(accountId: string, characterId: string, blessingId: string): Promise<RunModifier> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        if (run.state !== AdventureStateType.BLESSING_SELECT) {
            throw new BusinessLogicError('Can only select a blessing at a BLESSING_SELECT node');
        }

        const nodeData = run.currentNodeData as { candidates?: RunModifier[] } | undefined;
        const chosen = nodeData?.candidates?.find(candidate => candidate.modifierId === blessingId);
        if (!chosen) {
            throw new ValidationError('blessingId is not among the current candidates');
        }

        await this.runRepo.saveCheckpoint(run.runId, {
            state: AdventureStateType.EXPLORING,
            step: run.step + 1,
            blessings: [...run.blessings, chosen.modifierId],
            blessingPoints: 0,
            currentNodeType: FieldValue.delete(),
            currentNodeData: FieldValue.delete(),
            lastActivityAt: Date.now(),
        });

        return chosen;
    }

    // ---- internals ----------------------------------------------------

    private async requireOwnedCharacter(accountId: string, characterId: string): Promise<Character> {
        const character = await this.characterRepo.getByIdForAccount(characterId, accountId);
        if (!character) {
            throw new NotFoundError('character');
        }
        return character;
    }

    private async requireActiveRun(characterId: string): Promise<AdventureRun> {
        const run = await this.runRepo.getActiveByCharacterId(characterId);
        if (!run) {
            throw new NotFoundError('active adventure run');
        }
        return run;
    }

    private async findOwnedPermanentPotion(characterId: string, itemId: string): Promise<ItemInstance | undefined> {
        const item = await this.itemRepo.getById(itemId);
        return (item && item.characterId === characterId) ? item : undefined;
    }

    /**
     * Node generation priority: guaranteed Rest > fixed elite cadence >
     * weighted random (see spec.md "節點生成優先序").
     */
    private async decideNextNode(run: AdventureRun): Promise<NodeType> {
        if (run.step - run.lastRestStep >= NODE_CONFIG.REST_GUARANTEED_INTERVAL) {
            return NodeType.REST;
        }
        if (run.step > 0 && run.step % NODE_CONFIG.STRONG_ELITE_INTERVAL === 0) {
            return NodeType.STRONG_ELITE;
        }
        if (run.step > 0 && run.step % NODE_CONFIG.ELITE_INTERVAL === 0) {
            return NodeType.ELITE;
        }

        const roll = (await this.rngService.next(run.runId)) * WEIGHTED_NODE_TOTAL;
        let cursor = 0;
        for (const entry of WEIGHTED_NODE_TYPES) {
            cursor += entry.weight;
            if (roll < cursor) {
                return entry.type;
            }
        }
        return NodeType.COMBAT; // floating point fallback
    }

    private async advanceFromExploring(run: AdventureRun): Promise<AdventureRun> {
        const nodeType = await this.decideNextNode(run);
        const patch: Record<string, unknown> = {
            currentNodeType: nodeType,
            lastActivityAt: Date.now(),
        };

        if (nodeType === NodeType.REST) {
            patch.state = AdventureStateType.REST;
            patch.currentNodeData = FieldValue.delete();
        } else if (nodeType === NodeType.EVENT || nodeType === NodeType.CHOICE) {
            const template = await this.eventService.selectEvent(run.runId);
            patch.state = AdventureStateType.EVENT;
            patch.currentNodeData = {
                eventTemplateId: template.id,
                eventType: template.type,
                description: template.description,
                ...(template.choices ? { choices: template.choices.map(choice => ({ label: choice.label })) } : {}),
            };
        } else {
            // COMBAT / ELITE / STRONG_ELITE
            patch.state = AdventureStateType.COMBAT;
            patch.currentNodeData = {
                pending: true,
                enemyLevel: getEnemyLevel(run.step),
                tier: nodeType,
            };
        }

        return this.runRepo.saveCheckpoint(run.runId, patch);
    }

    private async advanceFromResolution(run: AdventureRun): Promise<AdventureRun> {
        if (run.blessingPoints >= NODE_CONFIG.BLESSING_POINTS_THRESHOLD) {
            const character = await this.characterRepo.getByIdOrThrow(run.characterId, 'character');
            const candidates = await this.blessingService.generateCandidates(run.runId, character.attributes.LUCK);

            return this.runRepo.saveCheckpoint(run.runId, {
                state: AdventureStateType.BLESSING_SELECT,
                currentNodeData: { candidates },
                lastActivityAt: Date.now(),
            });
        }

        return this.runRepo.saveCheckpoint(run.runId, {
            state: AdventureStateType.EXPLORING,
            step: run.step + 1,
            currentNodeType: FieldValue.delete(),
            currentNodeData: FieldValue.delete(),
            lastActivityAt: Date.now(),
        });
    }

    /**
     * Settle a run: transfer its run-inventory items into the permanent
     * inventory (500-cap aware — items that don't fit are reported, not
     * dropped), grant gold/gems/EXP (clamped, level-ups included), notify
     * the leaderboard/quest stubs, and mark the run ENDED.
     */
    private async settleRun(
        run: AdventureRun, endReason: AdventureEndReason, extraPatch: Record<string, unknown> = {},
    ): Promise<SettleResult> {
        const untransferred: ItemInstance[] = [];
        let transferredCount = 0;

        for (const item of run.runInventory) {
            try {
                await this.itemRepo.createItem(item);
                await this.inventoryRepo.addItem(run.characterId, item.itemId);
                transferredCount += 1;
            } catch (error: unknown) {
                if (error instanceof BusinessLogicError) {
                    untransferred.push(item);
                    continue;
                }
                throw error;
            }
        }

        // ASSUMPTION (see design.md): EXP granted 1:1 with the run's score.
        const expGained = run.score;
        const { leveledUp } = await this.characterRepo.settleRunRewards(run.characterId, {
            goldEarned: run.goldEarned,
            gemsEarned: run.gemsEarned,
            expGained,
        });

        await this.leaderboardUpdater.updateIfBetter({
            accountId: run.accountId, characterId: run.characterId, score: run.score,
        });
        await this.progressTracker.incrementProgress({
            accountId: run.accountId, characterId: run.characterId, type: 'ADVENTURE_COMPLETED', amount: 1,
        });

        await this.runRepo.saveCheckpoint(run.runId, {
            ...extraPatch,
            state: AdventureStateType.ENDED,
            endReason,
            endedAt: Date.now(),
            lastActivityAt: Date.now(),
        });

        return {
            finalScore: run.score,
            goldEarned: run.goldEarned,
            gemsEarned: run.gemsEarned,
            itemsEarned: transferredCount,
            expGained,
            leveledUp,
            untransferredItemIds: untransferred.map(item => item.itemId),
        };
    }
}
