/**
 * Combat Service — implements the `CombatResolver` interface adventure-run-core
 * defined. Simulates one full combat (all waves) in a single call using a
 * discrete-event schedule (each unit's own `nextAttackAt`), consuming all
 * randomness off one in-memory RngService cursor (started at run.rngIndex)
 * for determinism/auditability (RULE-014) without a per-roll Firestore
 * round-trip — see the `cursor`/`finalRngIndex` wiring in resolve().
 *
 * See combat-engine/design.md for the enemy stat table and reward formulas —
 * none of this is defined anywhere else (documented ASSUMPTIONs).
 */

import { BaseService } from './base.service';
import { CharacterService } from './character.service';
import {
    RngService, type RngCursor,
} from './rng.service';
import {
    getStatMultipliers, type EnemyTier,
} from '../constants/difficulty';
import {
    ENEMY_ARCHETYPES, HUMAN_ARCHETYPES, GKBOT_BOSS_ARCHETYPES, HUMAN_BOSS_ARCHETYPES,
    type EnemyArchetype,
} from '../constants/templates/enemies';
import {
    ENEMY_COMBAT_STATS, BOSS_REINFORCE_CONFIG,
    expForKill, goldForKill, applyLuckToGold, itemDropChance,
    blessingPointsForVictory, maxDropRarity, gemsDropTier, DROP_ITEM_CONTEXT,
} from '../constants/combat';
import { generateItemInstance } from './item.service';
import {
    getItemTemplate, ITEM_TEMPLATES,
} from '../constants/templates';
import { MODIFIER_TEMPLATES_BY_ID } from '../../shared/constants/blessings';
import { ItemType } from '../../shared/types/item';
import type { ItemInstance } from '../../shared/types/item';
import {
    NodeType, disambiguateEnemyNames,
} from '../../shared/types/adventure';
import type {
    AdventureRun, CombatContext, CombatResolver, CombatResolution, CombatLogEntry, RunModifier,
    EnemyFaction, FacilitySeverity,
} from '../../shared/types/adventure';
import type { Stats } from '../../shared/types/common';

const EQUIPMENT_TEMPLATE_IDS = Object.values(ITEM_TEMPLATES)
    .filter(template => template.type === ItemType.EQUIPMENT)
    .map(template => template.templateId);

// CombatContext.tier reuses NodeType's combat-tier members; EnemyTier
// (difficulty.ts) is combat-engine's own vocabulary for the same three
// tiers — map between them at the one seam where they meet.
export const NODE_TYPE_TO_ENEMY_TIER: Record<CombatContext['tier'], EnemyTier> = {
    [NodeType.COMBAT]: 'NORMAL',
    [NodeType.ELITE]: 'ELITE',
    [NodeType.STRONG_ELITE]: 'STRONG_ELITE',
    [NodeType.BOSS]: 'BOSS',
};

/**
 * Mob (non-BOSS-tier) archetype list for a run's `factionType`
 * (enemy-factions-and-severity design.md 決策 5).
 */
export function mobArchetypesFor(factionType: EnemyFaction): EnemyArchetype[] {
    return factionType === 'HUMAN' ? HUMAN_ARCHETYPES : ENEMY_ARCHETYPES;
}

/**
 * Boss archetype list for a run's `factionType`
 * (enemy-factions-and-severity design.md 決策 5).
 */
export function bossArchetypesFor(factionType: EnemyFaction): EnemyArchetype[] {
    return factionType === 'HUMAN' ? HUMAN_BOSS_ARCHETYPES : GKBOT_BOSS_ARCHETYPES;
}

/**
 * `damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)` — combat-engine
 * spec.md "傷害與命中判定公式". Pure function, exported for direct testing.
 */
/**
 * Apply all currently-active Blessing/Curse RunModifiers to a base stat
 * block, additively — a pure,計算期-only transform (design.md: "不直接改動
 * Character 或 AdventureRun 文件").
 */
export function applyModifiers(base: Stats, modifiers: RunModifier[]): Stats {
    return modifiers.reduce<Stats>((stats, modifier) => {
        const delta = modifier.statModifiers;
        if (!delta) return stats;
        return {
            ...stats,
            ATK: stats.ATK + (delta.ATK ?? 0),
            DEF: stats.DEF + (delta.DEF ?? 0),
            HP_MAX: stats.HP_MAX + (delta.HP_MAX ?? 0),
            actionIntervalSec: stats.actionIntervalSec + (delta.actionIntervalSec ?? 0),
            critChance: stats.critChance + (delta.critChance ?? 0),
            critMultiplier: stats.critMultiplier + (delta.critMultiplier ?? 0),
            dodgeChance: stats.dodgeChance + (delta.dodgeChance ?? 0),
        };
    }, base);
}

/**
 * Combined drop-rate multiplier from all active Blessing/Curse modifiers
 * (defaults to 1 when none apply — see applyModifiers()).
 */
export function combinedDropRateMultiplier(modifiers: RunModifier[]): number {
    return modifiers.reduce((mult, modifier) => mult * (modifier.dropRateMultiplier ?? 1), 1);
}

/**
 * Resolve a run's granted Blessing/Curse id arrays (`run.blessings`/
 * `run.curses`) into their concrete `RunModifier` objects via the shared
 * template table. An id with no matching template is skipped rather than
 * thrown — it should not be possible to grant an unknown id, but combat must
 * not fail to resolve over stale/unrecognized data.
 */
export function resolveActiveModifiers(run: Pick<AdventureRun, 'blessings' | 'curses'>): RunModifier[] {
    return [...run.blessings, ...run.curses]
        .map(modifierId => MODIFIER_TEMPLATES_BY_ID[modifierId])
        .filter((modifier): modifier is RunModifier => modifier !== undefined);
}

/**
 * `damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)` — combat-engine
 * spec.md "傷害與命中判定公式". Pure function, exported for direct testing.
 */
export function computeDamage(atk: number, def: number, isCrit: boolean, critMultiplier: number): number {
    return Math.max(1, atk - def) * (isCrit ? critMultiplier : 1);
}

// Safety cap on simulation loop iterations — HP is bounded and every attack
// deals >=1 damage, so real combats terminate well under this; this only
// guards against an unforeseen zero-progress bug turning into an infinite loop.
const MAX_ROUNDS = 500;

type CombatUnit = {
    id: string;
    name: string;
    atk: number;
    def: number;
    hpMax: number;
    hp: number;
    actionIntervalSec: number;
    critChance: number;
    critMultiplier: number;
    dodgeChance: number;
    nextAttackAt: number;
    level?: number;
    // Boss composition (chapter-level-structure): only set for a BOSS-tier
    // node's boss slot (index 0) — used to pick the guaranteed-drop unit
    // (computeRewards) and whether reinforcement can trigger (resolve()).
    archetypeIndex: number;
    // Stable EnemyArchetype.slug (enemy-portrait-resolution), carried through
    // to CombatResult.enemies[] for frontend portrait lookup.
    archetypeSlug: string;
    isBoss: boolean;
    canReinforce: boolean;
};

export class CombatService extends BaseService implements CombatResolver {
    protected serviceName = 'combat';
    private characterService: CharacterService;
    private rngService: RngService;

    constructor() {
        super();
        this.characterService = new CharacterService();
        this.rngService = new RngService();
    }

    async resolve(run: AdventureRun, context: CombatContext): Promise<CombatResolution> {
        // enemy-factions-and-severity Migration Plan: fall back to the
        // pre-change defaults when either field is missing (pre-migration
        // run docs, or a test fixture that doesn't set them).
        const factionType: EnemyFaction = run.factionType ?? 'GKBOT';
        const severityTier = run.severityTier ?? 'PARTIAL_ACTIVE';
        const mobArchetypes = mobArchetypesFor(factionType);
        const bossArchetypes = bossArchetypesFor(factionType);

        const character = await this.characterService.getCharacterWithStats(run.accountId, run.characterId);

        const activeModifiers = resolveActiveModifiers(run);
        const modifiedStats = applyModifiers(character.stats, activeModifiers);

        // All rolls for this combat come off one in-memory cursor started at
        // run.rngIndex — see RngService.createCursor(). The caller must
        // persist cursor.index (returned as finalRngIndex below) as the run's
        // new rngIndex once combat is fully resolved.
        const cursor = this.rngService.createCursor(run.seed, run.rngIndex);

        const player: CombatUnit = {
            id: 'player',
            name: character.nickname,
            atk: modifiedStats.ATK,
            def: modifiedStats.DEF,
            hpMax: modifiedStats.HP_MAX,
            hp: run.playerHp,
            actionIntervalSec: modifiedStats.actionIntervalSec,
            critChance: modifiedStats.critChance,
            critMultiplier: modifiedStats.critMultiplier,
            dodgeChance: modifiedStats.dodgeChance,
            nextAttackAt: 0,
            archetypeIndex: -1,
            archetypeSlug: '',
            isBoss: false,
            canReinforce: false,
        };

        const combatLog: CombatLogEntry[] = [];
        const defeated: CombatUnit[] = [];
        const encountered: CombatUnit[] = [];

        for (let wave = 0; wave < context.waveCount && player.hp > 0; wave++) {
            // Each wave is its own discrete-event window: every unit — including
            // the player, who otherwise persists across waves — starts this
            // wave's action gauge from 0, matching freshly spawned enemies
            // (buildEnemyUnit always sets nextAttackAt: 0). Without this reset,
            // the player's nextAttackAt would keep accumulating from the
            // previous wave while new enemies restart at 0, making combatLog
            // timestamps jump backwards at the wave boundary (see
            // combat-log-sequential-playback design.md — the frontend relies on
            // per-wave timestamps to build its playback schedule).
            player.nextAttackAt = 0;

            const enemies = this.spawnWave(
                cursor, context, mobArchetypes, bossArchetypes, severityTier,
                wave === 0 ? context.firstWaveArchetypeIndices : undefined,
            );
            encountered.push(...enemies);
            const alive = [...enemies];
            // Boss small-composition reinforcement (chapter-level-structure)
            // only applies within a BOSS-tier node's single wave.
            const bossUnit = context.tier === NodeType.BOSS ? enemies[0] : undefined;
            let reinforceCount = 0;

            let rounds = 0;
            while (player.hp > 0 && alive.length > 0 && rounds < MAX_ROUNDS) {
                rounds += 1;

                const actor = [player, ...alive].reduce(
                    (min, unit) => (unit.nextAttackAt < min.nextAttackAt ? unit : min),
                );
                const target = actor === player ? alive[0] as CombatUnit : player;
                const eventTimestamp = actor.nextAttackAt;

                this.performAttack(cursor, actor, target, combatLog, wave);

                if (target.hp <= 0) {
                    combatLog.push({
                        timestamp: eventTimestamp, wave, actorId: actor.id, targetId: target.id, action: 'DEATH',
                    });
                    if (target !== player) {
                        alive.splice(alive.indexOf(target), 1);
                        defeated.push(target);
                    }
                }

                actor.nextAttackAt += actor.actionIntervalSec * 1000;

                if (bossUnit && bossUnit.canReinforce && bossUnit.hp > 0
                    && rounds % BOSS_REINFORCE_CONFIG.CHECK_INTERVAL_ROUNDS === 0
                    && reinforceCount < BOSS_REINFORCE_CONFIG.MAX_REINFORCEMENTS) {
                    const minionsAlive = alive.filter(unit => unit !== bossUnit).length;
                    if (minionsAlive < 2) {
                        const reinforceRoll = cursor.next();
                        if (reinforceRoll < BOSS_REINFORCE_CONFIG.CHANCE) {
                            const bossArchetype = bossArchetypes[bossUnit.archetypeIndex] as EnemyArchetype;
                            const minionMultipliers = getStatMultipliers(context.enemyLevel, 'BOSS_MINION', severityTier);
                            const minion = this.buildEnemyUnit(bossArchetype, bossUnit.archetypeIndex, minionMultipliers, context.enemyLevel, false);
                            minion.nextAttackAt = eventTimestamp;
                            alive.push(minion);
                            encountered.push(minion);
                            reinforceCount += 1;
                        }
                    }
                }
            }
        }

        const victory = player.hp > 0;
        const rewards = victory
            ? this.computeRewards(run, cursor, context, defeated, character.attributes.LUCK, activeModifiers)
            : {
                expGained: 0, goldDropped: 0, gemsDropped: 0, itemsDropped: [], blessingPointsGained: 0,
            };

        return {
            victory,
            roundCount: combatLog.filter(entry => entry.action !== 'DEATH').length,
            playerHpRemaining: Math.max(0, player.hp),
            ...rewards,
            enemies: disambiguateEnemyNames(encountered).map(enemy => ({
                enemyId: enemy.id, name: enemy.name, level: enemy.level as number, hpMax: enemy.hpMax, isBoss: enemy.isBoss, archetypeSlug: enemy.archetypeSlug,
            })),
            combatLog,
            finalRngIndex: cursor.index,
        };
    }

    /**
     * `archetypeIndices`, when provided (wave 0 only — see design.md), pins
     * each enemy slot to the archetype already decided and shown to the
     * player at node-generation time, instead of rolling a fresh one here.
     *
     * BOSS tier (chapter-level-structure): slot 0 is the boss, every other
     * slot is an escort minion (BOSS_MINION-tier stats, kept below the
     * boss's own NORMAL-tier multiplier since both share the same
     * boss-scale archetype baseHp/baseAtk/baseDef) —
     * `adventure-run.service.buildBossNodeData` already sized
     * `enemyCountPerWave`/`archetypeIndices` to match (same archetype for
     * every slot), so this only needs to pick the right multiplier per slot.
     * The boss slot itself uses NORMAL tier (enemy-factions-and-severity
     * design.md 決策 4 — its own baseAtk/baseDef/baseHp is already a boss-scale
     * value, no longer stacked with the BOSS tier multiplier).
     */
    private spawnWave(
        cursor: RngCursor,
        context: CombatContext,
        mobArchetypes: EnemyArchetype[],
        bossArchetypes: EnemyArchetype[],
        severityTier: FacilitySeverity,
        archetypeIndices?: number[],
    ): CombatUnit[] {
        const enemyLevel = context.enemyLevel;
        const isBossTier = context.tier === NodeType.BOSS;
        const archetypes = isBossTier ? bossArchetypes : mobArchetypes;
        const uniformMultipliers = isBossTier ? undefined : getStatMultipliers(enemyLevel, NODE_TYPE_TO_ENEMY_TIER[context.tier], severityTier);
        const bossMultipliers = isBossTier ? getStatMultipliers(enemyLevel, 'NORMAL', severityTier) : undefined;
        const minionMultipliers = isBossTier ? getStatMultipliers(enemyLevel, 'BOSS_MINION', severityTier) : undefined;

        const enemies: CombatUnit[] = [];
        for (let i = 0; i < context.enemyCountPerWave; i++) {
            let archetypeIndex = archetypeIndices?.[i];
            if (archetypeIndex === undefined) {
                const roll = cursor.next();
                archetypeIndex = Math.floor(roll * archetypes.length);
            }
            const archetype = archetypes[archetypeIndex] as EnemyArchetype;
            const isBossUnit = isBossTier && i === 0;
            const multipliers = isBossTier ? (isBossUnit ? bossMultipliers! : minionMultipliers!) : uniformMultipliers!;

            enemies.push(this.buildEnemyUnit(archetype, archetypeIndex, multipliers, enemyLevel, isBossUnit));
        }
        return enemies;
    }

    /**
     * Build a single enemy `CombatUnit` from an archetype + a pre-resolved
     * stat multiplier — shared by spawnWave's initial roster and the boss
     * reinforcement spawn (both need the exact same construction).
     */
    private buildEnemyUnit(
        archetype: EnemyArchetype,
        archetypeIndex: number,
        multipliers: { hp: number; atk: number; def: number },
        enemyLevel: number,
        isBoss: boolean,
    ): CombatUnit {
        return {
            id: crypto.randomUUID(),
            name: archetype.name,
            atk: Math.round(archetype.baseAtk * multipliers.atk),
            def: Math.round(archetype.baseDef * multipliers.def),
            hpMax: Math.round(archetype.baseHp * multipliers.hp),
            hp: Math.round(archetype.baseHp * multipliers.hp),
            actionIntervalSec: archetype.actionIntervalSec,
            // LUK overrides (enemy-factions-and-severity design.md 決策 3):
            // an archetype's own critChanceOverride/dodgeChanceOverride wins
            // when set, otherwise fall back to the global default.
            critChance: archetype.critChanceOverride ?? ENEMY_COMBAT_STATS.critChance,
            critMultiplier: ENEMY_COMBAT_STATS.critMultiplier,
            dodgeChance: archetype.dodgeChanceOverride ?? ENEMY_COMBAT_STATS.dodgeChance,
            nextAttackAt: 0,
            level: enemyLevel,
            archetypeIndex,
            archetypeSlug: archetype.slug,
            isBoss,
            canReinforce: isBoss ? (archetype.canReinforce ?? false) : false,
        };
    }

    private performAttack(
        cursor: RngCursor, actor: CombatUnit, target: CombatUnit, combatLog: CombatLogEntry[], wave: number,
    ): void {
        const dodgeRoll = cursor.next();
        if (dodgeRoll < target.dodgeChance) {
            combatLog.push({
                timestamp: actor.nextAttackAt, wave, actorId: actor.id, targetId: target.id, action: 'DODGE',
            });
            return;
        }

        const critRoll = cursor.next();
        const isCrit = critRoll < actor.critChance;
        const damage = computeDamage(actor.atk, target.def, isCrit, actor.critMultiplier);

        target.hp = Math.max(0, target.hp - damage);
        combatLog.push({
            timestamp: actor.nextAttackAt,
            wave,
            actorId: actor.id,
            targetId: target.id,
            action: isCrit ? 'CRIT' : 'ATTACK',
            damage,
            targetHpRemaining: target.hp,
        });
    }

    private computeRewards(
        run: AdventureRun, cursor: RngCursor, context: CombatContext, defeated: CombatUnit[], luck: number, activeModifiers: RunModifier[],
    ) {
        let expGained = 0;
        let goldBase = 0;
        let gemsDropped = 0;
        const itemsDropped: ItemInstance[] = [];
        // Boss is the Stage's narrative climax — the boss unit itself
        // guarantees at least one drop, bypassing the LUCK-gated chance
        // (design.md "Boss 保底掉落"); its escort minions (chapter-level-structure)
        // still roll the normal LUCK-gated chance, so a Boss fight doesn't
        // guarantee one drop per kill.
        const luckDropChance = itemDropChance(luck) * combinedDropRateMultiplier(activeModifiers);
        const gemsTier = gemsDropTier(context.enemyLevel);

        for (let i = 0; i < defeated.length; i++) {
            const unit = defeated[i] as CombatUnit;
            expGained += expForKill(context.enemyLevel, NODE_TYPE_TO_ENEMY_TIER[context.tier]);
            goldBase += goldForKill(context.enemyLevel);

            const dropChance = (context.tier === NodeType.BOSS && unit.isBoss) ? 1 : luckDropChance;
            const dropRoll = cursor.next();
            if (dropRoll < dropChance) {
                const pickRoll = cursor.next();
                const templateId = EQUIPMENT_TEMPLATE_IDS[
                    Math.floor(pickRoll * EQUIPMENT_TEMPLATE_IDS.length)
                ] as string;
                if (getItemTemplate(templateId)) {
                    itemsDropped.push({
                        ...generateItemInstance(templateId, {
                            ...DROP_ITEM_CONTEXT, maxRarity: maxDropRarity(NODE_TYPE_TO_ENEMY_TIER[context.tier]),
                        }),
                        characterId: run.characterId,
                    });
                }
            }

            const gemsRoll = cursor.next();
            if (gemsRoll < gemsTier.chance) {
                const amountRoll = cursor.next();
                gemsDropped += gemsTier.min + Math.round((gemsTier.max - gemsTier.min) * amountRoll);
            }
        }

        const blessingPointsGained = defeated.length > 0 ? blessingPointsForVictory(NODE_TYPE_TO_ENEMY_TIER[context.tier]) : 0;

        return {
            expGained,
            goldDropped: applyLuckToGold(goldBase, luck),
            gemsDropped,
            itemsDropped,
            blessingPointsGained,
        };
    }
}
