/**
 * Adventure Run Service — the state machine that drives a single run:
 * start/resume/advance/end, node generation, and rest-node healing.
 *
 * COMBAT and EVENT nodes are intentionally NOT resolved here (see
 * proposal.md's "實作順序建議" and design.md's Non-Goals): `advance()` sets
 * the run into the COMBAT/EVENT state with enough context for a future
 * `combat-engine`/`events-and-blessings` implementation to pick up, but
 * calling `advance()` again while stuck there throws — those two changes
 * are what actually resolves them.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { BaseService } from './base.service';
import { AdventureRunRepository } from '../repositories/adventure-run.repository';
import { CharacterRepository } from '../repositories/character.repository';
import { CharacterService } from './character.service';
import { ItemRepository } from '../repositories/item.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { RngService } from './rng.service';
import {
    NoopLeaderboardUpdater, NoopProgressTracker, 
} from './adventure-run-stubs';
import { getEnemyLevel } from '../constants/difficulty';
import {
    AdventureStateType, AdventureEndReason, NodeType, NODE_CONFIG,
    type AdventureRun, type LeaderboardUpdater, type ProgressTracker,
} from '../../shared/types/adventure';
import type { Character } from '../../shared/types/character';
import type { ItemInstance } from '../../shared/types/item';
import { ItemType } from '../../shared/types/item';
import { clamp } from '../../shared/types/common';
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
        case AdventureStateType.EVENT:
            throw new BusinessLogicError(
                'This node cannot be resolved yet (combat-engine/events-and-blessings not implemented)',
            );

        case AdventureStateType.RESOLUTION:
            return this.advanceFromResolution(run);

        case AdventureStateType.BLESSING_SELECT:
            throw new BusinessLogicError('Blessing selection is not implemented yet (events-and-blessings)');

        case AdventureStateType.ENDED:
            throw new BusinessLogicError('This run has already ended');

        default:
            throw new BusinessLogicError(`Unknown run state: ${run.state}`);
        }
    }

    /**
     * End the run early (player-initiated, from EXPLORING or RESOLUTION —
     * the only two states ALLOWED_TRANSITIONS permits an ENDED exit from
     * outside the disconnect/death paths). Settles and returns the summary.
     */
    async endRun(accountId: string, characterId: string): Promise<SettleResult> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        if (run.state !== AdventureStateType.EXPLORING && run.state !== AdventureStateType.RESOLUTION) {
            throw new BusinessLogicError('Can only end a run while exploring or at a resolution checkpoint');
        }

        return this.settleRun(run, AdventureEndReason.QUIT);
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
            patch.state = AdventureStateType.EVENT;
            patch.currentNodeData = { pending: true };
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
            return this.runRepo.saveCheckpoint(run.runId, {
                state: AdventureStateType.BLESSING_SELECT,
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
    private async settleRun(run: AdventureRun, endReason: AdventureEndReason): Promise<SettleResult> {
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
