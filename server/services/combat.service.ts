/**
 * Combat Service — implements the `CombatResolver` interface adventure-run-core
 * defined. Simulates one full combat (all waves) in a single call using a
 * discrete-event schedule (each unit's own `nextAttackAt`), consuming all
 * randomness through RngService for determinism/auditability (RULE-014).
 *
 * See combat-engine/design.md for the enemy stat table and reward formulas —
 * none of this is defined anywhere else (documented ASSUMPTIONs).
 */

import { BaseService } from './base.service';
import { CharacterService } from './character.service';
import { RngService } from './rng.service';
import {
    getStatMultipliers, type EnemyTier,
} from '../constants/difficulty';
import {
    ENEMY_ARCHETYPES, ENEMY_COMBAT_STATS,
    scoreForKill, goldForKill, applyLuckToGold, itemDropChance,
    blessingPointsForVictory, maxDropRarity, gemsDropTier, DROP_ITEM_CONTEXT,
} from '../constants/combat';
import { generateItemInstance } from './item.service';
import {
    getItemTemplate, ITEM_TEMPLATES, 
} from '../constants/templates';
import { ItemType } from '../../shared/types/item';
import type { ItemInstance } from '../../shared/types/item';
import { NodeType } from '../../shared/types/adventure';
import type {
    AdventureRun, CombatContext, CombatResolver, CombatResolution, CombatLogEntry, RunModifier,
} from '../../shared/types/adventure';
import type { Stats } from '../../shared/types/common';

const EQUIPMENT_TEMPLATE_IDS = Object.values(ITEM_TEMPLATES)
    .filter(template => template.type === ItemType.EQUIPMENT)
    .map(template => template.templateId);

// CombatContext.tier reuses NodeType's combat-tier members; EnemyTier
// (difficulty.ts) is combat-engine's own vocabulary for the same three
// tiers — map between them at the one seam where they meet.
const NODE_TYPE_TO_ENEMY_TIER: Record<CombatContext['tier'], EnemyTier> = {
    [NodeType.COMBAT]: 'NORMAL',
    [NodeType.ELITE]: 'ELITE',
    [NodeType.STRONG_ELITE]: 'STRONG_ELITE',
};

/**
 * `damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)` — combat-engine
 * spec.md "傷害與命中判定公式". Pure function, exported for direct testing.
 */
/**
 * Apply all currently-active Blessing/Curse RunModifiers to a base stat
 * block, additively — a pure,計算期-only transform (design.md: "不直接改動
 * Character 或 AdventureRun 文件"). `events-and-blessings` hasn't shipped
 * yet, so callers currently always pass `[]`; this is the wiring point that
 * change will plug real resolved RunModifiers into once it can turn
 * `run.blessings`/`run.curses` (id arrays) into actual RunModifier objects.
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
 * (defaults to 1 — no-op — until events-and-blessings can populate real
 * modifiers; see applyModifiers()).
 */
export function combinedDropRateMultiplier(modifiers: RunModifier[]): number {
    return modifiers.reduce((mult, modifier) => mult * (modifier.dropRateMultiplier ?? 1), 1);
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
        const character = await this.characterService.getCharacterWithStats(run.accountId, run.characterId);

        // TODO(events-and-blessings): run.blessings/run.curses are id arrays
        // with no lookup table to resolve into RunModifier objects yet — this
        // is the wiring point that change will fill in. Always [] for now.
        const activeModifiers: RunModifier[] = [];
        const modifiedStats = applyModifiers(character.stats, activeModifiers);

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
        };

        const combatLog: CombatLogEntry[] = [];
        const defeated: CombatUnit[] = [];
        const encountered: CombatUnit[] = [];

        for (let wave = 0; wave < context.waveCount && player.hp > 0; wave++) {
            const enemies = await this.spawnWave(run.runId, context);
            encountered.push(...enemies);
            const alive = [...enemies];

            let rounds = 0;
            while (player.hp > 0 && alive.length > 0 && rounds < MAX_ROUNDS) {
                rounds += 1;

                const actor = [player, ...alive].reduce(
                    (min, unit) => (unit.nextAttackAt < min.nextAttackAt ? unit : min),
                );
                const target = actor === player ? alive[0] as CombatUnit : player;
                 
                await this.performAttack(run.runId, actor, target, combatLog);

                if (target.hp <= 0) {
                    combatLog.push({
                        timestamp: actor.nextAttackAt, actorId: actor.id, targetId: target.id, action: 'DEATH',
                    });
                    if (target !== player) {
                        alive.splice(alive.indexOf(target), 1);
                        defeated.push(target);
                    }
                }

                actor.nextAttackAt += actor.actionIntervalSec * 1000;
            }
        }

        const victory = player.hp > 0;
        const rewards = victory
            ? await this.computeRewards(run, context, defeated, character.attributes.LUCK, activeModifiers)
            : {
                scoreGained: 0, goldDropped: 0, gemsDropped: 0, itemsDropped: [], blessingPointsGained: 0,
            };

        return {
            victory,
            roundCount: combatLog.filter(entry => entry.action !== 'DEATH').length,
            playerHpRemaining: Math.max(0, player.hp),
            ...rewards,
            enemies: encountered.map(enemy => ({
                enemyId: enemy.id, name: enemy.name, level: enemy.level as number,
            })),
            combatLog,
        };
    }

    private async spawnWave(runId: string, context: CombatContext): Promise<CombatUnit[]> {
        const enemyLevel = context.enemyLevel;
        const multipliers = getStatMultipliers(enemyLevel, NODE_TYPE_TO_ENEMY_TIER[context.tier]);

        const enemies: CombatUnit[] = [];
        for (let i = 0; i < context.enemyCountPerWave; i++) {
             
            const roll = await this.rngService.next(runId);
            const archetype = ENEMY_ARCHETYPES[Math.floor(roll * ENEMY_ARCHETYPES.length)] as typeof ENEMY_ARCHETYPES[number];

            enemies.push({
                id: crypto.randomUUID(),
                name: archetype.name,
                atk: Math.round(archetype.baseAtk * multipliers.atk),
                def: Math.round(archetype.baseDef * multipliers.def),
                hpMax: Math.round(archetype.baseHp * multipliers.hp),
                hp: Math.round(archetype.baseHp * multipliers.hp),
                actionIntervalSec: archetype.actionIntervalSec,
                critChance: ENEMY_COMBAT_STATS.critChance,
                critMultiplier: ENEMY_COMBAT_STATS.critMultiplier,
                dodgeChance: ENEMY_COMBAT_STATS.dodgeChance,
                nextAttackAt: 0,
                level: enemyLevel,
            });
        }
        return enemies;
    }

    private async performAttack(
        runId: string, actor: CombatUnit, target: CombatUnit, combatLog: CombatLogEntry[],
    ): Promise<void> {
        const dodgeRoll = await this.rngService.next(runId);
        if (dodgeRoll < target.dodgeChance) {
            combatLog.push({
                timestamp: actor.nextAttackAt, actorId: actor.id, targetId: target.id, action: 'DODGE',
            });
            return;
        }

        const critRoll = await this.rngService.next(runId);
        const isCrit = critRoll < actor.critChance;
        const damage = computeDamage(actor.atk, target.def, isCrit, actor.critMultiplier);

        target.hp = Math.max(0, target.hp - damage);
        combatLog.push({
            timestamp: actor.nextAttackAt,
            actorId: actor.id,
            targetId: target.id,
            action: isCrit ? 'CRIT' : 'ATTACK',
            damage,
            targetHpRemaining: target.hp,
        });
    }

    private async computeRewards(
        run: AdventureRun, context: CombatContext, defeated: CombatUnit[], luck: number, activeModifiers: RunModifier[],
    ) {
        let scoreGained = 0;
        let goldBase = 0;
        let gemsDropped = 0;
        const itemsDropped: ItemInstance[] = [];
        const dropChance = itemDropChance(luck) * combinedDropRateMultiplier(activeModifiers);
        const gemsTier = gemsDropTier(context.enemyLevel);

        for (let i = 0; i < defeated.length; i++) {
            scoreGained += scoreForKill(context.enemyLevel, NODE_TYPE_TO_ENEMY_TIER[context.tier]);
            goldBase += goldForKill(context.enemyLevel);
             
            const dropRoll = await this.rngService.next(run.runId);
            if (dropRoll < dropChance) {
                 
                const pickRoll = await this.rngService.next(run.runId);
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
             
            const gemsRoll = await this.rngService.next(run.runId);
            if (gemsRoll < gemsTier.chance) {
                 
                const amountRoll = await this.rngService.next(run.runId);
                gemsDropped += gemsTier.min + Math.round((gemsTier.max - gemsTier.min) * amountRoll);
            }
        }

        const blessingPointsGained = defeated.length > 0 ? blessingPointsForVictory(NODE_TYPE_TO_ENEMY_TIER[context.tier]) : 0;

        return {
            scoreGained,
            goldDropped: applyLuckToGold(goldBase, luck),
            gemsDropped,
            itemsDropped,
            blessingPointsGained,
        };
    }
}
