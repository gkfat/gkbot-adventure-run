/**
 * Combat Service — implements the `CombatResolver` interface adventure-run-core
 * defined. Simulates one full combat (all waves) in a single call using a
 * discrete-event schedule (each unit's own `nextAttackAt`), consuming combat
 * outcome/enemy randomness off one in-memory RngService cursor (started at
 * run.rngIndex) for determinism/auditability (RULE-014) without a per-roll
 * Firestore round-trip — see the `cursor`/`finalRngIndex` wiring in resolve().
 * Loot rolls (computeRewards) use a second cursor keyed by run.runId
 * (`rewardCursor`/`finalRewardRngIndex`) so drops vary across retries of the
 * same Stage while enemies stay identical (known-issue.md #1).
 *
 * See combat-engine/design.md for the enemy stat table and reward formulas —
 * none of this is defined anywhere else (documented ASSUMPTIONs).
 */

import { BaseService } from './base.service';
import { CharacterService } from './character.service';
import { ItemRepository } from '../repositories/item.repository';
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
    ENEMY_COMBAT_STATS, BOSS_REINFORCE_CONFIG, ENEMY_ACTION_INTERVAL_MIN_MULTIPLIER,
    expForKill, goldForKill, applyLuckToGold, itemDropChance,
    blessingPointsForVictory, maxDropRarity, gemsDropTier, DROP_ITEM_CONTEXT,
} from '../constants/combat';
import { generateItemInstance } from './item.service';
import {
    getItemTemplate, ITEM_TEMPLATES,
} from '../constants/templates';
import {
    findCurseTemplate, resolveBlessingModifier,
} from '../../shared/constants/blessings';
import { ItemType } from '../../shared/types/item';
import type { ItemInstance } from '../../shared/types/item';
import { QuestAchievementProgressTracker } from './progress-tracker.service';
import {
    NodeType, disambiguateEnemyNames,
} from '../../shared/types/adventure';
import type {
    AdventureRun, CombatContext, CombatResolver, CombatResolution, CombatLogEntry, RunModifier,
    EnemyFaction, FacilitySeverity,
} from '../../shared/types/adventure';
import {
    EquipmentSlot, WeaponType, type Stats,
} from '../../shared/types/common';
import type { Character } from '../../shared/types/character';
import {
    PROFICIENCY_EXP_PER_HIT, PROFICIENCY_EXP_PER_CRIT, PROFICIENCY_MAX_LEVEL,
    PASSIVE_UNLOCK_LEVELS, WEAPON_PASSIVE_CONFIG, BLADE_PASSIVE_CONFIG, DUAL_WIELD_PASSIVE_CONFIG,
} from '../constants/weaponProficiency';

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
 * Resolve a run's granted Blessings/Curses (`run.blessings`/`run.curses`)
 * into their concrete `RunModifier` objects. Blessings are level-aware
 * (resolved via `resolveBlessingModifier` against the family's current
 * level — blessing-leveling/design.md Decision 4); Curses stay flat, id-only
 * lookups. An entry with no matching template is skipped rather than thrown —
 * it should not be possible to grant an unknown id, but combat must not fail
 * to resolve over stale/unrecognized data.
 */
export function resolveActiveModifiers(run: Pick<AdventureRun, 'blessings' | 'curses'>): RunModifier[] {
    const blessingModifiers = run.blessings
        .map(entry => resolveBlessingModifier(entry))
        .filter((modifier): modifier is RunModifier => modifier !== undefined);
    const curseModifiers = run.curses
        .map(modifierId => findCurseTemplate(modifierId))
        .filter((modifier): modifier is RunModifier => modifier !== undefined);
    return [...blessingModifiers, ...curseModifiers];
}

/**
 * `damage = round(ATK^2 / (ATK+DEF)) * (crit ? critMultiplier : 1)`, floored
 * at 1 whenever ATK > 0 — a decaying-return formula (known-issue.md #8): DEF
 * always reduces damage but never fully blocks it, so high-DEF enemies slow
 * a fight down instead of stalling it outright. ATK <= 0 deals no damage (no
 * artificial floor for an attacker with no attack power). Pure function,
 * exported for direct testing.
 */
export function computeDamage(atk: number, def: number, isCrit: boolean, critMultiplier: number): number {
    if (atk <= 0) return 0;
    const base = Math.max(1, Math.round((atk * atk) / (atk + def)));
    return isCrit ? base * critMultiplier : base;
}

// Safety cap on simulation loop iterations — HP is bounded and almost every
// attack deals >=1 damage, so real combats terminate well under this; this
// mainly guards against an unforeseen zero-progress bug turning into an
// infinite loop. (A mutual DEF>=2*ATK immunity stalemate on both sides could
// also reach this cap — computeDamage, known-issue.md #8 — in which case the
// loop simply exits with the player still alive.)
const MAX_ROUNDS = 500;

/**
 * A minimal, single-combat-only status effect (weapon-proficiency-system D5):
 * applies a flat delta to the unit's own `critChance`/`actionIntervalSec` on
 * its own next N attacks, or a damage-taken multiplier on the next N hits it
 * receives from anyone. Never persisted to Firestore. `kind` beyond `keyof
 * Stats` (`damageTaken`) is a deliberate extension of design.md's literal
 * `stat: keyof Stats` shape — a pure additive Stats delta can't express
 * "damage taken %", and design.md explicitly leaves magnitude/shape details
 * to the implementation (D5 ASSUMPTION).
 */
type StatusEffect = {
    kind: 'critChance' | 'actionIntervalSec' | 'damageTaken';
    magnitude: number;
    remainingAttacks: number;
};

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
    // Weapon proficiency passives (weapon-proficiency-system D5) — usable on
    // any unit (e.g. BLUNT's "target takes +15% damage" debuff on an enemy).
    statusEffects: StatusEffect[];
    // Player-only: consecutive un-dodged hits landed, reset to 0 on a dodge —
    // drives FIST/RANGED's "Nth consecutive hit" passive triggers.
    consecutiveHitCount: number;
    // One extra forced-crit charge, consumed by the next crit roll (RANGED B).
    forcedCritCharges: number;
};

/** Player's currently-equipped weapon context, computed once per combat (D3/D4/D5/D7). */
type PlayerWeaponContext = {
    // Distinct weaponTypes across both hands (0, 1, or 2 entries).
    weaponTypes: WeaponType[];
    bothHandsAreWeapons: boolean;
    baseAoeChance: number;
    baseSplashChance: number;
    levelByType: Partial<Record<WeaponType, number>>;
    dualWieldLevel: number;
};

function unitStatValue(unit: CombatUnit, kind: 'critChance' | 'actionIntervalSec', base: number): number {
    const bonus = unit.statusEffects
        .filter(effect => effect.kind === kind)
        .reduce((sum, effect) => sum + effect.magnitude, 0);
    return base + bonus;
}

function damageTakenMultiplier(unit: CombatUnit): number {
    const bonus = unit.statusEffects
        .filter(effect => effect.kind === 'damageTaken')
        .reduce((sum, effect) => sum + effect.magnitude, 0);
    return 1 + bonus;
}

function addStatusEffect(unit: CombatUnit, kind: StatusEffect['kind'], magnitude: number, durationAttacks: number): void {
    if (durationAttacks <= 0) return;
    unit.statusEffects.push({
        kind, magnitude, remainingAttacks: durationAttacks,
    });
}

/** Decrement + prune a unit's own-attack-scoped effects after it acts. */
function tickOwnAttackEffects(unit: CombatUnit): void {
    unit.statusEffects = unit.statusEffects
        .map(effect => (effect.kind === 'damageTaken' ? effect : {
            ...effect, remainingAttacks: effect.remainingAttacks - 1,
        }))
        .filter(effect => effect.remainingAttacks > 0);
}

/** Decrement + prune a unit's incoming-hit-scoped effects after it's hit. */
function tickIncomingHitEffects(unit: CombatUnit): void {
    unit.statusEffects = unit.statusEffects
        .map(effect => (effect.kind === 'damageTaken' ? {
            ...effect, remainingAttacks: effect.remainingAttacks - 1,
        } : effect))
        .filter(effect => effect.remainingAttacks > 0);
}

export class CombatService extends BaseService implements CombatResolver {
    protected serviceName = 'combat';
    private characterService: CharacterService;
    private rngService: RngService;
    private itemRepo: ItemRepository;
    private progressTracker: QuestAchievementProgressTracker;

    constructor() {
        super();
        this.characterService = new CharacterService();
        this.rngService = new RngService();
        this.itemRepo = new ItemRepository();
        this.progressTracker = new QuestAchievementProgressTracker();
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
        // Loot rolls (computeRewards) go off a separate in-memory cursor
        // keyed by `run.runId` (unique per attempt), not `seed`, so drops
        // differ across retries of the same Stage while enemies (which stay
        // on `cursor` above) keep reproducing identically (known-issue.md #1).
        const rewardCursor = this.rngService.createCursor(run.runId, run.rewardRngIndex ?? 0);

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
            nextAttackAt: modifiedStats.actionIntervalSec * 1000,
            archetypeIndex: -1,
            archetypeSlug: '',
            isBoss: false,
            canReinforce: false,
            statusEffects: [],
            consecutiveHitCount: 0,
            forcedCritCharges: 0,
        };

        const weaponContext = await this.getPlayerWeaponContext(character);

        const combatLog: CombatLogEntry[] = [];
        const defeated: CombatUnit[] = [];
        const encountered: CombatUnit[] = [];
        // Per-hit exp tally (weapon-proficiency-system D3/D2b) — accrued
        // across every wave, written once at the end of resolve().
        const proficiencyExpGained: Partial<Record<WeaponType, number>> = {};
        let dualWieldExpGained = 0;
        const addProficiencyExp = (isCrit: boolean) => {
            const amount = isCrit ? PROFICIENCY_EXP_PER_CRIT : PROFICIENCY_EXP_PER_HIT;
            for (const type of weaponContext.weaponTypes) {
                proficiencyExpGained[type] = (proficiencyExpGained[type] ?? 0) + amount;
            }
            if (weaponContext.bothHandsAreWeapons) {
                dualWieldExpGained += amount;
            }
        };

        for (let wave = 0; wave < context.waveCount && player.hp > 0; wave++) {
            // Each wave is its own discrete-event window: every unit — including
            // the player, who otherwise persists across waves — starts this
            // wave needing a full action-interval charge before its first
            // action, matching freshly spawned enemies (buildEnemyUnit always
            // sets nextAttackAt: archetype.actionIntervalSec * 1000). A flat 0
            // would let whoever's picked on the reduce() tie (always the
            // player) get a free first hit with no charge-up and no real
            // speed comparison; charging everyone the same way makes the
            // fastest unit act first on genuine merit, and keeps the pacing
            // consistent with every subsequent action in the fight (see
            // known-issue.md — first-attack-of-wave visually fired instantly
            // after the wave banner). Without resetting the player's own
            // nextAttackAt here, it would keep accumulating from the previous
            // wave while new enemies restart fresh, making combatLog
            // timestamps jump backwards at the wave boundary (see
            // combat-log-sequential-playback design.md — the frontend relies on
            // per-wave timestamps to build its playback schedule).
            player.nextAttackAt = player.actionIntervalSec * 1000;

            const enemies = this.spawnWave(
                cursor, context, mobArchetypes, bossArchetypes, severityTier, player.actionIntervalSec,
                wave === 0 ? context.firstWaveArchetypeIndices : undefined,
            );
            encountered.push(...enemies);

            // enemy-bestiary: "遇過" is recorded at first-wave spawn (seen at
            // the pre-fight preview already), independent of combat outcome —
            // see design.md Decision 1. Must happen before the fight loop can
            // return early on player death.
            if (wave === 0) {
                await this.characterService.recordEncounteredArchetypes(
                    run.characterId,
                    character.encounteredArchetypeSlugs,
                    enemies.map(enemy => enemy.archetypeSlug),
                );
            }
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
                const eventTimestamp = actor.nextAttackAt;

                if (actor === player) {
                    this.performPlayerAttack(cursor, player, alive, defeated, weaponContext, combatLog, wave, addProficiencyExp);
                } else {
                    this.performAttack(cursor, actor, player, combatLog, wave);
                    if (player.hp <= 0) {
                        combatLog.push({
                            timestamp: eventTimestamp, wave, actorId: actor.id, targetId: player.id, action: 'DEATH',
                        });
                    }
                }

                actor.nextAttackAt += unitStatValue(actor, 'actionIntervalSec', actor.actionIntervalSec) * 1000;

                if (bossUnit && bossUnit.canReinforce && bossUnit.hp > 0
                    && rounds % BOSS_REINFORCE_CONFIG.CHECK_INTERVAL_ROUNDS === 0
                    && reinforceCount < BOSS_REINFORCE_CONFIG.MAX_REINFORCEMENTS) {
                    const minionsAlive = alive.filter(unit => unit !== bossUnit).length;
                    if (minionsAlive < 2) {
                        const reinforceRoll = cursor.next();
                        if (reinforceRoll < BOSS_REINFORCE_CONFIG.CHANCE) {
                            // Reinforcements roll a fresh mob archetype too
                            // (known-issue.md #4), matching the initial
                            // escort composition rather than the boss's own.
                            const minionArchetypeRoll = cursor.next();
                            const minionArchetypeIndex = Math.floor(minionArchetypeRoll * mobArchetypes.length);
                            const minionArchetype = mobArchetypes[minionArchetypeIndex] as EnemyArchetype;
                            const minionMultipliers = getStatMultipliers(context.enemyLevel, 'BOSS_MINION', severityTier);
                            const minion = this.buildEnemyUnit(
                                minionArchetype, minionArchetypeIndex, minionMultipliers, context.enemyLevel, false, player.actionIntervalSec,
                            );
                            minion.nextAttackAt = eventTimestamp;
                            alive.push(minion);
                            encountered.push(minion);
                            reinforceCount += 1;
                        }
                    }
                }
            }
        }

        // enemy-bestiary kill-count tracking: tally every unit actually
        // defeated in this combat, independent of overall victory/defeat —
        // same "looked at outcome, not victory" stance as recordEncounteredArchetypes.
        await this.characterService.recordDefeatedArchetypes(
            run.characterId,
            character.defeatedArchetypeCounts,
            defeated.map(unit => unit.archetypeSlug),
        );

        // Weapon proficiency (weapon-proficiency-system D3/D9): a one-time
        // write of this fight's tallied exp, independent of victory/defeat —
        // hits landed regardless of outcome.
        const {
            weaponTypeLevelUps, dualWieldLevelUp, 
        } = await this.characterService.recordWeaponProficiency(
            run.characterId,
            character.weaponProficiency,
            character.dualWieldProficiency,
            proficiencyExpGained,
            dualWieldExpGained,
        );
        for (const levelUp of weaponTypeLevelUps) {
            await this.progressTracker.incrementProgress({
                accountId: run.accountId, characterId: run.characterId, type: 'WEAPON_LEVEL_REACHED', amount: levelUp.newLevel,
            });
            await this.progressTracker.incrementProgress({
                accountId: run.accountId, characterId: run.characterId, type: `WEAPON_LEVEL_REACHED_${levelUp.weaponType}`, amount: levelUp.newLevel,
            });
            if (levelUp.oldLevel < PROFICIENCY_MAX_LEVEL && levelUp.newLevel >= PROFICIENCY_MAX_LEVEL) {
                await this.progressTracker.incrementProgress({
                    accountId: run.accountId, characterId: run.characterId, type: 'WEAPON_TYPE_MASTERED', amount: 1,
                });
            }
        }
        if (dualWieldLevelUp) {
            await this.progressTracker.incrementProgress({
                accountId: run.accountId, characterId: run.characterId, type: 'WEAPON_LEVEL_REACHED_DUAL_WIELD', amount: dualWieldLevelUp.newLevel,
            });
        }

        const victory = player.hp > 0;
        const rewards = victory
            ? this.computeRewards(run, rewardCursor, context, defeated, character.attributes.LUCK, activeModifiers)
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
            finalRewardRngIndex: rewardCursor.index,
        };
    }

    /**
     * `archetypeIndices`, when provided (wave 0 only — see design.md), pins
     * each enemy slot to the archetype already decided and shown to the
     * player at node-generation time, instead of rolling a fresh one here.
     *
     * BOSS tier (chapter-level-structure): slot 0 is the boss (bossArchetypes,
     * NORMAL-tier stats — enemy-factions-and-severity design.md 決策 4, its own
     * baseAtk/baseDef/baseHp is already a boss-scale value, no longer stacked
     * with the BOSS tier multiplier); every other slot is an escort minion
     * rolled from the faction's *mob* archetypes at BOSS_MINION-tier stats
     * (known-issue.md #4 — escorts must not share the boss's own template).
     * `adventure-run.service.buildBossNodeData` already rolled
     * `enemyCountPerWave`/`archetypeIndices` this same way, so this only
     * needs to mirror the per-slot archetype-array choice.
     */
    private spawnWave(
        cursor: RngCursor,
        context: CombatContext,
        mobArchetypes: EnemyArchetype[],
        bossArchetypes: EnemyArchetype[],
        severityTier: FacilitySeverity,
        playerActionIntervalSec: number,
        archetypeIndices?: number[],
    ): CombatUnit[] {
        const enemyLevel = context.enemyLevel;
        const isBossTier = context.tier === NodeType.BOSS;
        const uniformMultipliers = isBossTier ? undefined : getStatMultipliers(enemyLevel, NODE_TYPE_TO_ENEMY_TIER[context.tier], severityTier);
        const bossMultipliers = isBossTier ? getStatMultipliers(enemyLevel, 'NORMAL', severityTier) : undefined;
        const minionMultipliers = isBossTier ? getStatMultipliers(enemyLevel, 'BOSS_MINION', severityTier) : undefined;

        const enemies: CombatUnit[] = [];
        for (let i = 0; i < context.enemyCountPerWave; i++) {
            const isBossUnit = isBossTier && i === 0;
            const archetypes = isBossUnit ? bossArchetypes : mobArchetypes;

            let archetypeIndex = archetypeIndices?.[i];
            if (archetypeIndex === undefined) {
                const roll = cursor.next();
                archetypeIndex = Math.floor(roll * archetypes.length);
            }
            const archetype = archetypes[archetypeIndex] as EnemyArchetype;
            const multipliers = isBossTier ? (isBossUnit ? bossMultipliers! : minionMultipliers!) : uniformMultipliers!;

            enemies.push(this.buildEnemyUnit(archetype, archetypeIndex, multipliers, enemyLevel, isBossUnit, playerActionIntervalSec));
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
        playerActionIntervalSec: number,
    ): CombatUnit {
        // Enemies must always act slower than the player currently fighting
        // them, independent of the player's own AGI/equipment build —
        // clamp up to at least ENEMY_ACTION_INTERVAL_MIN_MULTIPLIER x the
        // player's actionIntervalSec (known-issue.md — a fast archetype like
        // 失控搬運機 at 2.2s could otherwise outpace an AGI-less player at 3.0s).
        const actionIntervalSec = Math.max(
            archetype.actionIntervalSec,
            playerActionIntervalSec * ENEMY_ACTION_INTERVAL_MIN_MULTIPLIER,
        );
        return {
            id: crypto.randomUUID(),
            name: archetype.name,
            atk: Math.round(archetype.baseAtk * multipliers.atk),
            def: Math.round(archetype.baseDef * multipliers.def),
            hpMax: Math.round(archetype.baseHp * multipliers.hp),
            hp: Math.round(archetype.baseHp * multipliers.hp),
            actionIntervalSec,
            // LUK overrides (enemy-factions-and-severity design.md 決策 3):
            // an archetype's own critChanceOverride/dodgeChanceOverride wins
            // when set, otherwise fall back to the global default.
            critChance: archetype.critChanceOverride ?? ENEMY_COMBAT_STATS.critChance,
            critMultiplier: ENEMY_COMBAT_STATS.critMultiplier,
            dodgeChance: archetype.dodgeChanceOverride ?? ENEMY_COMBAT_STATS.dodgeChance,
            nextAttackAt: actionIntervalSec * 1000,
            level: enemyLevel,
            archetypeIndex,
            archetypeSlug: archetype.slug,
            isBoss,
            canReinforce: isBoss ? (archetype.canReinforce ?? false) : false,
            statusEffects: [],
            consecutiveHitCount: 0,
            forcedCritCharges: 0,
        };
    }

    /**
     * Resolve the player's currently-equipped hand items into weapon-
     * proficiency context (weapon-proficiency-system D3/D4/D7) — which
     * weaponTypes are in play, whether both hands are weapons, the max
     * aoeChance/splashChance across both hands, and each dimension's current
     * level (for stat/passive gating during the fight).
     */
    private async getPlayerWeaponContext(character: Character): Promise<PlayerWeaponContext> {
        const handItemIds = [character.equipment[EquipmentSlot.LEFT_HAND], character.equipment[EquipmentSlot.RIGHT_HAND]]
            .filter((id): id is string => Boolean(id));
        const handItems = handItemIds.length > 0 ? await this.itemRepo.getByIds(handItemIds) : [];
        const weaponItems = handItems.filter((item): item is ItemInstance & { weaponType: WeaponType } => Boolean(item.weaponType));

        const weaponTypes = [...new Set(weaponItems.map(item => item.weaponType))];
        const bothHandsAreWeapons = weaponItems.length === 2;

        const levelByType: Partial<Record<WeaponType, number>> = {};
        for (const type of weaponTypes) {
            levelByType[type] = character.weaponProficiency[type]?.level ?? 1;
        }

        return {
            weaponTypes,
            bothHandsAreWeapons,
            baseAoeChance: Math.max(0, ...weaponItems.map(item => item.aoeChance ?? 0)),
            baseSplashChance: Math.max(0, ...weaponItems.map(item => item.splashChance ?? 0)),
            levelByType,
            dualWieldLevel: character.dualWieldProficiency.level,
        };
    }

    /**
     * Effective aoeChance/splashChance for this attack (design.md D7 + POLEARM
     * B + dual-wield B pattern bonuses): the weapon-authored max across both
     * hands, plus POLEARM's own Mastery-level bonus (only when POLEARM is
     * equipped) and the dual-wield bonus (only when both hands are weapons).
     */
    private getEffectivePatternChances(ctx: PlayerWeaponContext): { aoeChance: number; splashChance: number } {
        let bonus = 0;
        const polearmLevel = ctx.levelByType[WeaponType.POLEARM];
        if (polearmLevel !== undefined && polearmLevel >= PASSIVE_UNLOCK_LEVELS.B_MASTERY) {
            bonus += WEAPON_PASSIVE_CONFIG[WeaponType.POLEARM].b.patternChanceBonus ?? 0;
        }
        if (ctx.bothHandsAreWeapons) {
            if (ctx.dualWieldLevel >= PASSIVE_UNLOCK_LEVELS.B_MASTERY) {
                bonus += DUAL_WIELD_PASSIVE_CONFIG.B_PATTERN_CHANCE_BONUS_MASTERY;
            } else if (ctx.dualWieldLevel >= PASSIVE_UNLOCK_LEVELS.B_UNLOCK) {
                bonus += DUAL_WIELD_PASSIVE_CONFIG.B_PATTERN_CHANCE_BONUS;
            }
        }
        return {
            aoeChance: Math.min(1, ctx.baseAoeChance + bonus),
            splashChance: Math.min(1, ctx.baseSplashChance + bonus),
        };
    }

    /** POLEARM A's splash secondary-target damage ratio (0.5 default, D5 passive A). */
    private getSplashSecondaryRatio(ctx: PlayerWeaponContext): number {
        const level = ctx.levelByType[WeaponType.POLEARM];
        if (level === undefined || level < PASSIVE_UNLOCK_LEVELS.A_UNLOCK) return 0.5;
        const config = WEAPON_PASSIVE_CONFIG[WeaponType.POLEARM].a;
        return level >= PASSIVE_UNLOCK_LEVELS.A_STRENGTHEN ? config.strengthenedMagnitude : config.magnitude;
    }

    /**
     * BLADE's inline (non-statusEffects) damage-time bonuses (design.md D5
     * ASSUMPTION): crit-damage bonus (A) and a target-hp-ratio execute bonus
     * (B). Both only apply when BLADE is currently equipped.
     */
    private applyBladeDamageBonus(ctx: PlayerWeaponContext, target: CombatUnit, isCrit: boolean, damage: number): number {
        const level = ctx.levelByType[WeaponType.BLADE];
        if (level === undefined) return damage;

        let result = damage;
        if (isCrit && level >= PASSIVE_UNLOCK_LEVELS.A_UNLOCK) {
            const bonus = level >= PASSIVE_UNLOCK_LEVELS.A_STRENGTHEN
                ? BLADE_PASSIVE_CONFIG.A_CRIT_DAMAGE_BONUS_STRENGTHENED
                : BLADE_PASSIVE_CONFIG.A_CRIT_DAMAGE_BONUS;
            result = Math.round(result * (1 + bonus));
        }
        if (level >= PASSIVE_UNLOCK_LEVELS.B_UNLOCK) {
            const threshold = level >= PASSIVE_UNLOCK_LEVELS.B_MASTERY
                ? BLADE_PASSIVE_CONFIG.B_HP_RATIO_THRESHOLD_MASTERY
                : BLADE_PASSIVE_CONFIG.B_HP_RATIO_THRESHOLD;
            const bonus = level >= PASSIVE_UNLOCK_LEVELS.B_MASTERY
                ? BLADE_PASSIVE_CONFIG.B_DAMAGE_BONUS_MASTERY
                : BLADE_PASSIVE_CONFIG.B_DAMAGE_BONUS;
            if (target.hpMax > 0 && target.hp / target.hpMax >= threshold) {
                result = Math.round(result * (1 + bonus));
            }
        }
        return result;
    }

    /** Full damage against one target: base formula + BLADE bonus + target's damageTaken statusEffects. */
    private computePlayerDamageAgainst(ctx: PlayerWeaponContext, player: CombatUnit, target: CombatUnit, isCrit: boolean): number {
        const base = computeDamage(player.atk, target.def, isCrit, player.critMultiplier);
        const withBlade = this.applyBladeDamageBonus(ctx, target, isCrit, base);
        return Math.round(withBlade * damageTakenMultiplier(target));
    }

    /**
     * On-hit passive triggers for FIST/BLUNT/POLEARM/RANGED (design.md D5) —
     * BLADE is handled inline in computePlayerDamageAgainst instead. Applied
     * once per player attack action (not per AoE/splash secondary target —
     * ASSUMPTION: keeps multi-target passive fan-out bounded, see design.md
     * Risks "被動效果系統範圍蔓延風險").
     */
    private applyOnHitPassives(
        ctx: PlayerWeaponContext, player: CombatUnit, primaryTarget: CombatUnit, isCrit: boolean, cursor: RngCursor,
    ): void {
        for (const type of ctx.weaponTypes) {
            const level = ctx.levelByType[type] ?? 1;

            if (type === WeaponType.FIST) {
                if (isCrit && level >= PASSIVE_UNLOCK_LEVELS.A_UNLOCK) {
                    const config = WEAPON_PASSIVE_CONFIG[WeaponType.FIST].a;
                    const strengthened = level >= PASSIVE_UNLOCK_LEVELS.A_STRENGTHEN;
                    addStatusEffect(
                        player, 'actionIntervalSec',
                        strengthened ? config.strengthenedMagnitude : config.magnitude,
                        strengthened ? config.strengthenedDurationAttacks : config.durationAttacks,
                    );
                }
                if (level >= PASSIVE_UNLOCK_LEVELS.B_UNLOCK) {
                    const b = WEAPON_PASSIVE_CONFIG[WeaponType.FIST].b;
                    const mastery = level >= PASSIVE_UNLOCK_LEVELS.B_MASTERY;
                    const threshold = mastery ? (b.masteryThreshold as number) : (b.threshold as number);
                    if (player.consecutiveHitCount >= threshold) {
                        player.consecutiveHitCount = 0;
                        addStatusEffect(
                            player, 'critChance',
                            mastery ? (b.masteryCritChanceBonus as number) : (b.critChanceBonus as number),
                            1,
                        );
                    }
                }
            }

            if (type === WeaponType.BLUNT) {
                if (level >= PASSIVE_UNLOCK_LEVELS.A_UNLOCK) {
                    const config = WEAPON_PASSIVE_CONFIG[WeaponType.BLUNT].a;
                    const strengthened = level >= PASSIVE_UNLOCK_LEVELS.A_STRENGTHEN;
                    addStatusEffect(
                        primaryTarget, 'damageTaken',
                        strengthened ? config.strengthenedMagnitude : config.magnitude,
                        strengthened ? config.strengthenedDurationAttacks : config.durationAttacks,
                    );
                }
                if (isCrit && level >= PASSIVE_UNLOCK_LEVELS.B_UNLOCK) {
                    const b = WEAPON_PASSIVE_CONFIG[WeaponType.BLUNT].b;
                    const mastery = level >= PASSIVE_UNLOCK_LEVELS.B_MASTERY;
                    const chance = mastery ? (b.masteryChance as number) : (b.chance as number);
                    if (cursor.next() < chance) {
                        primaryTarget.nextAttackAt += (b.extraIntervalRatio as number) * primaryTarget.actionIntervalSec * 1000;
                    }
                }
            }

            if (type === WeaponType.RANGED) {
                if (level >= PASSIVE_UNLOCK_LEVELS.A_UNLOCK) {
                    const config = WEAPON_PASSIVE_CONFIG[WeaponType.RANGED].a;
                    const strengthened = level >= PASSIVE_UNLOCK_LEVELS.A_STRENGTHEN;
                    addStatusEffect(
                        player, 'critChance',
                        strengthened ? config.strengthenedMagnitude : config.magnitude,
                        strengthened ? config.strengthenedDurationAttacks : config.durationAttacks,
                    );
                }
                if (level >= PASSIVE_UNLOCK_LEVELS.B_UNLOCK) {
                    const b = WEAPON_PASSIVE_CONFIG[WeaponType.RANGED].b;
                    const mastery = level >= PASSIVE_UNLOCK_LEVELS.B_MASTERY;
                    const threshold = mastery ? (b.masteryThreshold as number) : (b.threshold as number);
                    if (player.consecutiveHitCount >= threshold) {
                        player.consecutiveHitCount = 0;
                        player.forcedCritCharges += 1;
                    }
                }
            }
        }
    }

    /**
     * One player attack action against `alive` enemies (design.md D3/D5/D7).
     * A single dodge roll (against the primary target, `alive[0]`) gates the
     * whole action; once it passes, target-pattern (AoE/splash/single) is
     * decided and resolved, weapon-proficiency exp is tallied once, and
     * on-hit/crit passives trigger. Mutates `alive`/`defeated`/`combatLog` in
     * place and returns nothing.
     */
    private performPlayerAttack(
        cursor: RngCursor,
        player: CombatUnit,
        alive: CombatUnit[],
        defeated: CombatUnit[],
        ctx: PlayerWeaponContext,
        combatLog: CombatLogEntry[],
        wave: number,
        addProficiencyExp: (_isCrit: boolean) => void,
    ): void {
        const primary = alive[0] as CombatUnit;
        const timestamp = player.nextAttackAt;

        const dodgeRoll = cursor.next();
        if (dodgeRoll < primary.dodgeChance) {
            combatLog.push({
                timestamp, wave, actorId: player.id, targetId: primary.id, action: 'DODGE',
            });
            player.consecutiveHitCount = 0;
            tickOwnAttackEffects(player);
            return;
        }

        player.consecutiveHitCount += 1;

        const rollCrit = (): boolean => {
            if (player.forcedCritCharges > 0) {
                player.forcedCritCharges -= 1;
                return true;
            }
            const critRoll = cursor.next();
            return critRoll < unitStatValue(player, 'critChance', player.critChance);
        };

        const applyDamage = (target: CombatUnit, damage: number, isCrit: boolean, ratio = 1): void => {
            const finalDamage = ratio === 1 ? damage : Math.max(0, Math.round(damage * ratio));
            target.hp = Math.max(0, target.hp - finalDamage);
            tickIncomingHitEffects(target);
            combatLog.push({
                timestamp, wave, actorId: player.id, targetId: target.id, action: isCrit ? 'CRIT' : 'ATTACK', damage: finalDamage, targetHpRemaining: target.hp,
            });
            if (target.hp <= 0) {
                combatLog.push({
                    timestamp, wave, actorId: player.id, targetId: target.id, action: 'DEATH',
                });
                const index = alive.indexOf(target);
                if (index >= 0) {
                    alive.splice(index, 1);
                    defeated.push(target);
                }
            }
        };

        const {
            aoeChance, splashChance, 
        } = this.getEffectivePatternChances(ctx);
        const aoeRoll = cursor.next();
        const isAoe = aoeChance > 0 && aoeRoll < aoeChance;
        const splashRoll = isAoe ? -1 : cursor.next();
        const isSplash = !isAoe && splashChance > 0 && splashRoll < splashChance;

        if (isAoe) {
            const polearmMastery = (ctx.levelByType[WeaponType.POLEARM] ?? 0) >= PASSIVE_UNLOCK_LEVELS.B_MASTERY;
            const mainTargetBonus = polearmMastery ? (WEAPON_PASSIVE_CONFIG[WeaponType.POLEARM].b.masteryMainTargetBonus as number) : 0;
            let anyCrit = false;
            for (const target of [...alive]) {
                const isCrit = rollCrit();
                anyCrit = anyCrit || isCrit;
                let damage = this.computePlayerDamageAgainst(ctx, player, target, isCrit);
                if (target === primary && mainTargetBonus > 0) {
                    damage = Math.round(damage * (1 + mainTargetBonus));
                }
                applyDamage(target, damage, isCrit);
            }
            addProficiencyExp(anyCrit);
            this.applyOnHitPassives(ctx, player, primary, anyCrit, cursor);
        } else if (isSplash) {
            const isCrit = rollCrit();
            const mainDamage = this.computePlayerDamageAgainst(ctx, player, primary, isCrit);
            applyDamage(primary, mainDamage, isCrit);
            const secondaryRatio = this.getSplashSecondaryRatio(ctx);
            for (const secondary of alive.filter(unit => unit !== primary).slice(0, 2)) {
                const secondaryDamage = this.computePlayerDamageAgainst(ctx, player, secondary, isCrit);
                applyDamage(secondary, secondaryDamage, isCrit, secondaryRatio);
            }
            addProficiencyExp(isCrit);
            this.applyOnHitPassives(ctx, player, primary, isCrit, cursor);
        } else {
            const isCrit = rollCrit();
            const damage = this.computePlayerDamageAgainst(ctx, player, primary, isCrit);
            applyDamage(primary, damage, isCrit);
            addProficiencyExp(isCrit);
            this.applyOnHitPassives(ctx, player, primary, isCrit, cursor);
        }

        // Dual-wield extra-attack passive (D5 "雙持被動" A): one bonus swing
        // reusing this action's crit result, never itself re-triggers AoE/
        // splash/extra-attack (design.md D5 ASSUMPTION — bounded recursion).
        if (ctx.bothHandsAreWeapons && ctx.dualWieldLevel >= PASSIVE_UNLOCK_LEVELS.A_UNLOCK && alive.length > 0 && alive.includes(primary)) {
            const strengthened = ctx.dualWieldLevel >= PASSIVE_UNLOCK_LEVELS.A_STRENGTHEN;
            const chance = strengthened ? DUAL_WIELD_PASSIVE_CONFIG.A_EXTRA_ATTACK_CHANCE_STRENGTHENED : DUAL_WIELD_PASSIVE_CONFIG.A_EXTRA_ATTACK_CHANCE;
            if (cursor.next() < chance) {
                const extraIsCrit = player.forcedCritCharges > 0 ? rollCrit() : false;
                const extraDamage = this.computePlayerDamageAgainst(ctx, player, primary, extraIsCrit);
                applyDamage(primary, extraDamage, extraIsCrit, DUAL_WIELD_PASSIVE_CONFIG.A_EXTRA_ATTACK_DAMAGE_RATIO);
            }
        }

        tickOwnAttackEffects(player);
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
