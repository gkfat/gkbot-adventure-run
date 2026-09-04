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
import {
    CombatService, NODE_TYPE_TO_ENEMY_TIER, mobArchetypesFor, bossArchetypesFor,
} from './combat.service';
import { EventService } from './event.service';
import { BlessingService } from './blessing.service';
import {
    findCurseTemplate, blessingLevelEffect,
} from '../../shared/constants/blessings';
import type { BlessingCandidate } from '../../shared/constants/blessings';
import {
    NoopLeaderboardUpdater, NoopProgressTracker,
} from './adventure-run-stubs';
import {
    getEnemyLevel, getStatMultipliers, rollWaveCount, rollEnemyCount,
} from '../constants/difficulty';
import {
    AdventureStateType, AdventureEndReason, NodeType, NODE_CONFIG, STAGE_NODE_COUNT_FALLBACK, isCombatNodeType,
    type AdventureRun, type LeaderboardUpdater, type ProgressTracker,
    type CombatResolver, type CombatContext, type CombatResolution, type CombatSummary, type CombatLogEntry,
    type EventResult, type SettleSummary, type EnemyPreview, type BlessingEntry,
    disambiguateEnemyNames,
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

/**
 * A granted Blessing/Curse's `HP_MAX` statModifier changes the run's actual
 * max HP, so `playerHpMax` must move with it (it otherwise stays frozen at
 * run-creation's base value forever — see events-and-blessings design.md).
 * Gaining max HP tops current HP up to the new max; losing it clamps current
 * HP down so it never exceeds the new (lower) max.
 */
function applyHpMaxDelta(delta: number | undefined, hpMax: number, hp: number): { hpMax: number; hp: number } {
    if (!delta) return {
        hpMax, hp,
    };
    const newHpMax = hpMax + delta;
    return {
        hpMax: newHpMax,
        hp: delta > 0 ? newHpMax : clamp(hp, 0, newHpMax),
    };
}

/** Curse `HP_MAX` delta — curses stay flat/id-only (blessing-leveling Non-Goal). */
function applyCurseHpMaxModifier(
    modifierId: string | undefined, hpMax: number, hp: number,
): { hpMax: number; hp: number } {
    return applyHpMaxDelta(modifierId ? findCurseTemplate(modifierId)?.statModifiers?.HP_MAX : undefined, hpMax, hp);
}

/**
 * Blessing `HP_MAX` delta on new-grant/upgrade: the delta is between the
 * family's previous level's effect (0 if not owned yet) and its new level's
 * effect — an upgrade "取代舊等級效果，不新增一筆" (design.md Decision 5), so
 * the run's denormalized `playerHpMax` must move by the incremental amount,
 * not the new level's full value (which would double-count what Lv1..N-1
 * already applied) — see design.md Open Questions.
 */
function applyBlessingHpMaxDelta(
    modifierId: string, previousLevel: number, newLevel: number, hpMax: number, hp: number,
): { hpMax: number; hp: number } {
    const previousHpMax = blessingLevelEffect(modifierId, previousLevel)?.statModifiers?.HP_MAX ?? 0;
    const nextHpMax = blessingLevelEffect(modifierId, newLevel)?.statModifiers?.HP_MAX ?? 0;
    return applyHpMaxDelta(nextHpMax - previousHpMax, hpMax, hp);
}

/**
 * Upsert a granted/upgraded Blessing into `run.blessings` (new family -> Lv1
 * entry; already-owned family -> replace its level) and apply the resulting
 * `playerHpMax`/`playerHp` delta — shared by `resolveEvent`'s BLESSING
 * outcome and `selectBlessing` (design.md Decision 5).
 */
function upsertGrantedBlessing(
    run: Pick<AdventureRun, 'blessings' | 'playerHpMax' | 'playerHp'>,
    granted: { modifierId: string; level: number },
): { blessings: BlessingEntry[]; hpMax: number; hp: number } {
    const existingIndex = run.blessings.findIndex(entry => entry.modifierId === granted.modifierId);
    const previousLevel = existingIndex >= 0 ? (run.blessings[existingIndex] as BlessingEntry).level : 0;
    const blessings = existingIndex >= 0
        ? run.blessings.map((entry, index) => (index === existingIndex ? {
            modifierId: entry.modifierId, level: granted.level,
        } : entry))
        : [
            ...run.blessings, {
                modifierId: granted.modifierId, level: granted.level,
            },
        ];
    const {
        hpMax, hp,
    } = applyBlessingHpMaxDelta(granted.modifierId, previousLevel, granted.level, run.playerHpMax, run.playerHp);
    return {
        blessings, hpMax, hp,
    };
}

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

// Todo #7 (known-issue.md): non-combat node types (EVENT/REST/CHOICE) must
// never repeat back-to-back; COMBAT may repeat up to NODE_CONFIG.COMBAT_STREAK_CAP
// times. Only applies to this weighted-random pool — ELITE/STRONG_ELITE/BOSS
// are decided deterministically by cadence/priority before this pool is ever
// consulted (see decideNextNode), so they're outside its scope.
//
// `restEligible` (require-combat-before-rest): REST is also excluded from the
// pool until the run has encountered at least one combat-tier node
// (COMBAT/ELITE/STRONG_ELITE/BOSS) — see stageCombatEncountered on AdventureRun.
function weightedNodePoolExcludingStreak(
    lastNodeType: NodeType | undefined, streak: number, restEligible: boolean,
): { type: NodeType; weight: number }[] {
    const base = restEligible ? WEIGHTED_NODE_TYPES : WEIGHTED_NODE_TYPES.filter(entry => entry.type !== NodeType.REST);
    if (!lastNodeType) return base;
    const cap = isCombatNodeType(lastNodeType) ? NODE_CONFIG.COMBAT_STREAK_CAP : 1;
    if (streak < cap) return base;
    const filtered = base.filter(entry => entry.type !== lastNodeType);
    // Pool never actually empties in practice — lastNodeType is always one of
    // the weighted types when this branch runs — but fall back defensively.
    return filtered.length > 0 ? filtered : base;
}

// Stage fields are optional on old (pre-migration) run documents — see
// design.md Migration Plan: tolerate `undefined` as "stage 1, node 0" rather
// than backfilling data.
type StageFields = {
    chapterIndex: number;
    stageNodeIndex: number;
    stageNodeCount: number;
};

function resolveStageFields(run: AdventureRun): StageFields {
    return {
        chapterIndex: run.chapterIndex ?? 0,
        stageNodeIndex: run.stageNodeIndex ?? 0,
        stageNodeCount: run.stageNodeCount ?? STAGE_NODE_COUNT_FALLBACK,
    };
}

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
            chapterIndex: characterWithStats.nextChapterIndex,
            characterAttributes: characterWithStats.attributes,
        });
    }

    /**
     * Resume the character's active run, if any. Detects an expired
     * reconnect window (NODE_CONFIG.RECONNECT_WINDOW_MS) and auto-settles
     * with endReason=DISCONNECT before returning null — the settlement
     * summary is still returned once so the caller can render it.
     */
    async getCurrentRun(accountId: string, characterId: string): Promise<{ run: AdventureRun | null; settlement?: SettleSummary }> {
        await this.requireOwnedCharacter(accountId, characterId);

        const run = await this.runRepo.getActiveByCharacterId(characterId);
        if (!run) {
            return { run: null };
        }

        if (Date.now() - run.lastActivityAt > NODE_CONFIG.RECONNECT_WINDOW_MS) {
            const { settlement } = await this.settleRun(run, AdventureEndReason.DISCONNECT);
            return {
                run: null, settlement, 
            };
        }

        return { run };
    }

    /**
     * Force-settle the character's active run as DISCONNECT right now,
     * regardless of the reconnect window — used for an explicit "放棄本次
     * 冒險" action and for a cold reload landing directly on /adventure
     * (known-issue.md #8: either should immediately count as a failed run,
     * not a resumable one).
     */
    async abandonRun(accountId: string, characterId: string): Promise<{ settlement: SettleSummary }> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);
        const { settlement } = await this.settleRun(run, AdventureEndReason.DISCONNECT);
        return { settlement };
    }

    /**
     * Advance the run's state machine by one checkpoint. See the module
     * doc comment for why COMBAT/EVENT nodes throw instead of resolving.
     * Returns a `settlement` alongside the run only when this call happened
     * to end it (Boss victory — see `advanceFromResolution`).
     */
    async advance(accountId: string, characterId: string): Promise<{ run: AdventureRun; settlement?: SettleSummary }> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        switch (run.state) {
        case AdventureStateType.INIT:
            return {
                run: await this.runRepo.saveCheckpoint(run.runId, {
                    state: AdventureStateType.EXPLORING,
                    lastActivityAt: Date.now(),
                }),
            };

        case AdventureStateType.EXPLORING:
            return { run: await this.advanceFromExploring(run) };

        case AdventureStateType.REST:
            return {
                run: await this.runRepo.saveCheckpoint(run.runId, {
                    state: AdventureStateType.RESOLUTION,
                    lastRestStep: run.step,
                    lastActivityAt: Date.now(),
                }),
            };

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
     * `waveCount`/`enemyCountPerWave`/the first wave's enemy roster were all
     * already decided in `advanceFromExploring` (so the pre-fight screen can
     * preview them) — this just reads them back out of `currentNodeData`.
     * On victory, applies rewards and moves to RESOLUTION; on defeat, settles
     * with `endReason=DEAD` (only EXP is kept — see `settleRun`).
     */
    async resolveCombat(accountId: string, characterId: string): Promise<{ combatLog: CombatLogEntry[]; summary: CombatSummary; settlement?: SettleSummary }> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        if (run.state !== AdventureStateType.COMBAT) {
            throw new BusinessLogicError('Can only resolve combat at a COMBAT node');
        }
        const nodeData = run.currentNodeData as {
            enemyLevel: number;
            tier: CombatContext['tier'];
            waveCount: number;
            enemyCountPerWave: number;
            firstWaveEnemies: EnemyPreview[];
        } | undefined;
        if (!nodeData || typeof nodeData.enemyLevel !== 'number') {
            throw new BusinessLogicError('Run has no combat node context to resolve');
        }

        const context: CombatContext = {
            enemyLevel: nodeData.enemyLevel,
            tier: nodeData.tier,
            waveCount: nodeData.waveCount,
            enemyCountPerWave: nodeData.enemyCountPerWave,
            firstWaveArchetypeIndices: nodeData.firstWaveEnemies.map(enemy => enemy.archetypeIndex),
        };

        const resolution = await this.combatResolver.resolve(run, context);
        const combatResult: Partial<CombatResolution> = { ...resolution };
        delete combatResult.combatLog;
        delete combatResult.finalRngIndex;
        const summary: CombatSummary = {
            ...(combatResult as Omit<CombatResolution, 'combatLog' | 'finalRngIndex'>), completedAt: Date.now(),
        };

        const runInventory = [...run.runInventory, ...resolution.itemsDropped]
            .slice(0, RESOURCE_LIMITS.INVENTORY_RUN_MAX);

        if (resolution.victory) {
            await this.runRepo.saveCheckpoint(run.runId, {
                state: AdventureStateType.RESOLUTION,
                playerHp: resolution.playerHpRemaining,
                expEarned: run.expEarned + resolution.expGained,
                goldEarned: run.goldEarned + resolution.goldDropped,
                gemsEarned: run.gemsEarned + resolution.gemsDropped,
                blessingPoints: run.blessingPoints + resolution.blessingPointsGained,
                runInventory,
                lastCombatSummary: summary,
                currentNodeData: FieldValue.delete(),
                lastActivityAt: Date.now(),
                rngIndex: resolution.finalRngIndex,
            });
            await this.progressTracker.incrementProgress({
                accountId: run.accountId, characterId: run.characterId, type: 'ENEMY_KILLED', amount: resolution.enemies.length,
            });
            return {
                combatLog: resolution.combatLog, summary,
            };
        }

        const { settlement } = await this.settleRun({
            ...run, playerHp: 0,
        }, AdventureEndReason.DEAD, {
            playerHp: 0,
            lastCombatSummary: summary,
            rngIndex: resolution.finalRngIndex,
        });

        return {
            combatLog: resolution.combatLog, summary, settlement,
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
        let {
            playerHpMax: hpMax, playerHp: hp, 
        } = run;
        if (result.hpHealed) {
            hp = clamp(hp + result.hpHealed, 0, hpMax);
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
            const upserted = upsertGrantedBlessing({
                blessings: run.blessings, playerHpMax: hpMax, playerHp: hp,
            }, result.blessingGranted);
            patch.blessings = upserted.blessings;
            hpMax = upserted.hpMax;
            hp = upserted.hp;
        }
        if (result.curseApplied) {
            patch.curses = [...run.curses, result.curseApplied];
            ({
                hpMax, hp,
            } = applyCurseHpMaxModifier(result.curseApplied, hpMax, hp));
        }
        if (hpMax !== run.playerHpMax) patch.playerHpMax = hpMax;
        if (hp !== run.playerHp) patch.playerHp = hp;

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
    async selectBlessing(accountId: string, characterId: string, blessingId: string): Promise<BlessingCandidate> {
        await this.requireOwnedCharacter(accountId, characterId);
        const run = await this.requireActiveRun(characterId);

        if (run.state !== AdventureStateType.BLESSING_SELECT) {
            throw new BusinessLogicError('Can only select a blessing at a BLESSING_SELECT node');
        }

        const nodeData = run.currentNodeData as { candidates?: BlessingCandidate[] } | undefined;
        const chosen = nodeData?.candidates?.find(candidate => candidate.modifierId === blessingId);
        if (!chosen) {
            throw new ValidationError('blessingId is not among the current candidates');
        }

        // Boss nodes always settle immediately in advanceFromResolution and
        // never reach BLESSING_SELECT (see design.md), so this is always a
        // non-Boss node — plain stageNodeIndex advance.
        const { stageNodeIndex } = resolveStageFields(run);
        const {
            blessings, hpMax, hp,
        } = upsertGrantedBlessing(run, chosen);
        await this.runRepo.saveCheckpoint(run.runId, {
            state: AdventureStateType.EXPLORING,
            step: run.step + 1,
            stageNodeIndex: stageNodeIndex + 1,
            blessings,
            blessingPoints: 0,
            playerHpMax: hpMax,
            playerHp: hp,
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
     * Node generation priority: Stage boundary (Boss) > guaranteed Rest >
     * fixed elite cadence > weighted random (see spec.md "節點生成優先序").
     * The weighted-random branch excludes types that would break the
     * no-consecutive-non-combat-node rule (todo #7) — see
     * weightedNodePoolExcludingStreak.
     *
     * require-combat-before-rest: REST (guaranteed or weighted) never appears
     * until the run has encountered at least one combat-tier node
     * (COMBAT/ELITE/STRONG_ELITE/BOSS) — otherwise a run could open on Rest
     * before the player has fought anything. Once that first encounter
     * happens, REST is unlocked for the rest of the run.
     */
    private async decideNextNode(run: AdventureRun): Promise<NodeType> {
        const {
            stageNodeIndex, stageNodeCount,
        } = resolveStageFields(run);
        const restEligible = run.stageCombatEncountered ?? false;
        if (stageNodeIndex === stageNodeCount - 1) {
            return NodeType.BOSS;
        }
        if (restEligible && run.step - run.lastRestStep >= NODE_CONFIG.REST_GUARANTEED_INTERVAL) {
            return NodeType.REST;
        }
        if (run.step > 0 && run.step % NODE_CONFIG.STRONG_ELITE_INTERVAL === 0) {
            return NodeType.STRONG_ELITE;
        }
        if (run.step > 0 && run.step % NODE_CONFIG.ELITE_INTERVAL === 0) {
            return NodeType.ELITE;
        }

        const pool = weightedNodePoolExcludingStreak(run.lastNodeType, run.nodeTypeStreak ?? 0, restEligible);
        const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
        const roll = (await this.rngService.next(run.runId)) * total;
        let cursor = 0;
        for (const entry of pool) {
            cursor += entry.weight;
            if (roll < cursor) {
                return entry.type;
            }
        }
        return NodeType.COMBAT; // floating point fallback
    }

    private async advanceFromExploring(run: AdventureRun): Promise<AdventureRun> {
        const nodeType = await this.decideNextNode(run);
        const nodeTypeStreak = run.lastNodeType === nodeType ? (run.nodeTypeStreak ?? 0) + 1 : 1;
        const patch: Record<string, unknown> = {
            currentNodeType: nodeType,
            lastNodeType: nodeType,
            nodeTypeStreak,
            lastActivityAt: Date.now(),
        };
        if (!run.stageCombatEncountered && isCombatNodeType(nodeType)) {
            patch.stageCombatEncountered = true;
        }

        if (nodeType === NodeType.REST) {
            const hpCurrent = clamp(
                run.playerHp + Math.round(run.playerHpMax * (NODE_CONFIG.REST_AUTO_HEAL_PERCENT / 100)),
                0,
                run.playerHpMax,
            );
            patch.state = AdventureStateType.REST;
            patch.playerHp = hpCurrent;
            patch.currentNodeData = { autoHealAmount: hpCurrent - run.playerHp };
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
            // COMBAT / ELITE / STRONG_ELITE / BOSS
            patch.state = AdventureStateType.COMBAT;
            patch.currentNodeData = await this.buildCombatNodeData(run, nodeType);
        }

        return this.runRepo.saveCheckpoint(run.runId, patch);
    }

    /**
     * Decide everything a COMBAT/ELITE/STRONG_ELITE/BOSS node needs up
     * front — enemyLevel, waveCount/enemyCountPerWave, and the first wave's
     * enemy roster (archetype/name/description/hp) — so the pre-fight
     * "遭遇敵人" screen can preview it before `resolveCombat` runs. Later
     * waves (if any) are still rolled inside combat.service at resolve time
     * (see single-stage-run-settlement/design.md — "後續波次保持神秘").
     */
    private async buildCombatNodeData(run: AdventureRun, tier: CombatContext['tier']) {
        const enemyLevel = getEnemyLevel(run.step);

        if (tier === NodeType.BOSS) {
            return this.buildBossNodeData(run, enemyLevel);
        }

        // enemy-factions-and-severity Migration Plan: fall back to the
        // pre-change defaults when missing (pre-migration run docs).
        const severityTier = run.severityTier ?? 'PARTIAL_ACTIVE';
        const mobArchetypes = mobArchetypesFor(run.factionType ?? 'GKBOT');

        const waveCount = rollWaveCount(run.step, await this.rngService.next(run.runId), severityTier);
        const enemyCountPerWave = rollEnemyCount(run.step, await this.rngService.next(run.runId), severityTier);

        const multipliers = getStatMultipliers(enemyLevel, NODE_TYPE_TO_ENEMY_TIER[tier], severityTier);
        const firstWaveEnemies: EnemyPreview[] = [];
        for (let i = 0; i < enemyCountPerWave; i++) {
            const roll = await this.rngService.next(run.runId);
            const archetypeIndex = Math.floor(roll * mobArchetypes.length);
            const archetype = mobArchetypes[archetypeIndex] as typeof mobArchetypes[number];
            firstWaveEnemies.push({
                archetypeIndex,
                archetypeSlug: archetype.slug,
                name: archetype.name,
                description: archetype.description,
                level: enemyLevel,
                hp: Math.round(archetype.baseHp * multipliers.hp),
                isBoss: false,
            });
        }

        return {
            pending: true,
            enemyLevel,
            tier,
            waveCount,
            enemyCountPerWave,
            firstWaveEnemies: disambiguateEnemyNames(firstWaveEnemies),
        };
    }

    /**
     * Boss composition (chapter-level-structure): 1 wave, 1 boss unit (NORMAL
     * tier stats) + the boss archetype's own `bossMinionCount` (0~2) escort
     * minions (BOSS_MINION tier stats, kept below 1.0 since escorts share
     * the boss's own boss-scale archetype) — all sharing the same archetype, so
     * the preview and the actual fight (combat.service reuses this same
     * archetypeIndex per slot via firstWaveArchetypeIndices) stay in sync.
     * Whether the boss can reinforce fallen minions mid-fight is decided
     * entirely inside combat.service from the archetype's `canReinforce`
     * flag — nothing extra to preview here.
     */
    private async buildBossNodeData(run: AdventureRun, enemyLevel: number) {
        // enemy-factions-and-severity Migration Plan: fall back to the
        // pre-change defaults when missing (pre-migration run docs).
        const severityTier = run.severityTier ?? 'PARTIAL_ACTIVE';
        const bossArchetypes = bossArchetypesFor(run.factionType ?? 'GKBOT');

        const archetypeRoll = await this.rngService.next(run.runId);
        const archetypeIndex = Math.floor(archetypeRoll * bossArchetypes.length);
        const archetype = bossArchetypes[archetypeIndex] as typeof bossArchetypes[number];
        const enemyCountPerWave = 1 + (archetype.bossMinionCount ?? 0);

        // NORMAL tier for the boss's own stats (design.md 決策 4 — its
        // baseAtk/baseDef/baseHp is already a boss-scale value, not stacked
        // with the BOSS tier multiplier); escort minions use BOSS_MINION
        // (kept below 1.0, since STRONG_ELITE would double-scale the
        // already boss-scale baseHp/baseAtk/baseDef they share with the boss).
        const bossMultipliers = getStatMultipliers(enemyLevel, 'NORMAL', severityTier);
        const minionMultipliers = getStatMultipliers(enemyLevel, 'BOSS_MINION', severityTier);

        const firstWaveEnemies: EnemyPreview[] = [
            {
                archetypeIndex,
                archetypeSlug: archetype.slug,
                name: archetype.name,
                description: archetype.description,
                level: enemyLevel,
                hp: Math.round(archetype.baseHp * bossMultipliers.hp),
                isBoss: true,
            },
        ];
        for (let i = 0; i < (archetype.bossMinionCount ?? 0); i++) {
            firstWaveEnemies.push({
                archetypeIndex,
                archetypeSlug: archetype.slug,
                name: archetype.name,
                description: archetype.description,
                level: enemyLevel,
                hp: Math.round(archetype.baseHp * minionMultipliers.hp),
                isBoss: false,
            });
        }

        return {
            pending: true,
            enemyLevel,
            tier: NodeType.BOSS,
            waveCount: 1,
            enemyCountPerWave,
            firstWaveEnemies: disambiguateEnemyNames(firstWaveEnemies),
        };
    }

    /**
     * Leaving RESOLUTION: a Boss victory always ends the run right here
     * (single-stage-run-settlement — one Stage = one run), skipping
     * BLESSING_SELECT entirely even if blessingPoints has reached the
     * threshold (picking a Blessing the run won't live to use is pointless).
     * Any other node just advances stageNodeIndex, or routes into
     * BLESSING_SELECT once enough blessingPoints have accumulated.
     */
    private async advanceFromResolution(run: AdventureRun): Promise<{ run: AdventureRun; settlement?: SettleSummary }> {
        if (run.currentNodeType === NodeType.BOSS) {
            return this.settleRun(run, AdventureEndReason.COMPLETED);
        }

        if (run.blessingPoints >= NODE_CONFIG.BLESSING_POINTS_THRESHOLD) {
            const character = await this.characterRepo.getByIdOrThrow(run.characterId, 'character');
            const candidates = await this.blessingService.generateCandidates(
                run.runId, character.attributes.LUCK, run.blessings,
            );

            const updated = await this.runRepo.saveCheckpoint(run.runId, {
                state: AdventureStateType.BLESSING_SELECT,
                currentNodeData: { candidates },
                lastActivityAt: Date.now(),
            });
            return { run: updated };
        }

        const { stageNodeIndex } = resolveStageFields(run);
        const updated = await this.runRepo.saveCheckpoint(run.runId, {
            state: AdventureStateType.EXPLORING,
            step: run.step + 1,
            stageNodeIndex: stageNodeIndex + 1,
            currentNodeType: FieldValue.delete(),
            currentNodeData: FieldValue.delete(),
            lastActivityAt: Date.now(),
        });
        return { run: updated };
    }

    /**
     * Settle a run: EXP is always granted regardless of `endReason`, but
     * gold/gems/run-inventory items only survive when `endReason = COMPLETED`
     * — a failed run (DEAD/DISCONNECT) forfeits everything else (see
     * single-stage-run-settlement/design.md — "冒險失敗時只會取得 exp").
     * Transfers surviving items into the permanent inventory (500-cap aware
     * — items that don't fit are reported, not dropped), grants EXP/gold/gems
     * (clamped, level-ups included), notifies the leaderboard/quest stubs,
     * and marks the run ENDED with a persisted, once-returned settlement summary.
     */
    private async settleRun(
        run: AdventureRun, endReason: AdventureEndReason, extraPatch: Record<string, unknown> = {},
    ): Promise<{ run: AdventureRun; settlement: SettleSummary }> {
        const isSuccess = endReason === AdventureEndReason.COMPLETED;

        const items: ItemInstance[] = [];
        const untransferred: ItemInstance[] = [];

        if (isSuccess) {
            for (const item of run.runInventory) {
                try {
                    await this.itemRepo.createItem(item);
                    await this.inventoryRepo.addItem(run.characterId, item.itemId);
                    items.push(item);
                } catch (error: unknown) {
                    if (error instanceof BusinessLogicError) {
                        untransferred.push(item);
                        continue;
                    }
                    throw error;
                }
            }
        }

        const goldEarned = isSuccess ? run.goldEarned : 0;
        const gemsEarned = isSuccess ? run.gemsEarned : 0;
        const expGained = run.expEarned;

        const {
            character, leveledUp, unspentAttributePointsGained, chapterAdvanced,
        } = await this.characterRepo.settleRunRewards(run.characterId, {
            goldEarned, gemsEarned, expGained, endReason,
        });

        // ASSUMPTION (see design.md): leaderboard's `score` param is fed
        // expEarned until the leaderboard capability is redesigned (it's
        // currently a no-op stub).
        await this.leaderboardUpdater.updateIfBetter({
            accountId: run.accountId, characterId: run.characterId, score: expGained,
        });
        await this.progressTracker.incrementProgress({
            accountId: run.accountId, characterId: run.characterId, type: 'ADVENTURE_COMPLETED', amount: 1,
        });

        const settlement: SettleSummary = {
            endReason,
            goldEarned,
            gemsEarned,
            items,
            untransferredItemIds: untransferred.map(item => item.itemId),
            expGained,
            leveledUp,
            newLevel: character.level,
            unspentAttributePointsGained,
            forfeitedGold: isSuccess ? 0 : run.goldEarned,
            forfeitedGems: isSuccess ? 0 : run.gemsEarned,
            forfeitedItems: isSuccess ? [] : run.runInventory,
            chapterAdvanced,
        };

        const updatedRun = await this.runRepo.saveCheckpoint(run.runId, {
            ...extraPatch,
            state: AdventureStateType.ENDED,
            endReason,
            endedAt: Date.now(),
            lastActivityAt: Date.now(),
            settlement,
        });

        return {
            run: updatedRun, settlement, 
        };
    }
}
