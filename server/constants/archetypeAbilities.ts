/**
 * Per-archetype core ability definitions. Each selectable archetype (see
 * characterArchetypes.ts) has exactly one ArchetypeAbility, keyed by a stable
 * `trigger` enum other systems (events-and-blessings, items-and-equipment,
 * adventure-run-core, combat-engine) can branch on without hardcoding the
 * archetype/mechanic mapping themselves. Actual probabilities/multipliers are
 * NOT defined here — they belong to whichever change consumes each trigger.
 */

export enum ArchetypeAbilityTrigger {
    /** Fighter: Physical Adaptation — boosts the effect of body-enhancing Blessings */
    BlessingEffectBoost = 'blessing_effect_boost',
    /** Adventurer: Explorer — chance to find extra content when passing non-combat nodes */
    NonCombatNodeBonus = 'non_combat_node_bonus',
    /** Scholar: Study — records encountered enemy/event types, grants bonuses on repeat encounters */
    EnemyEncounterRecord = 'enemy_encounter_record',
    /** Tinkerer: Salvage — chance to gain salvageable materials from mechanical enemies/chests */
    SalvageMaterialDrop = 'salvage_material_drop',
    /** Gambler: Risk & Reward — extra high-risk/high-reward choices on roulette/event nodes */
    RiskRewardChoice = 'risk_reward_choice',
}

export type ArchetypeAbility = {
    archetypeId: string;
    abilityId: string;
    trigger: ArchetypeAbilityTrigger;
    name: string;
    /** Player-facing blurb. Content must follow docs/worldview.md's narrative rules: GK 宇宙/裂域 can be stated openly, but any hint of the player's own mechanization stays implicit. */
    description: string;
};

export const ARCHETYPE_ABILITIES: readonly ArchetypeAbility[] = [
    {
        archetypeId: 'fighter',
        abilityId: 'physical_adaptation',
        trigger: ArchetypeAbilityTrigger.BlessingEffectBoost,
        name: 'Physical Adaptation',
        description: '身體素質類的祝福，對你的效果總是好一些。',
    },
    {
        archetypeId: 'adventurer',
        abilityId: 'explorer',
        trigger: ArchetypeAbilityTrigger.NonCombatNodeBonus,
        name: 'Explorer',
        description: '路過非戰鬥的地方時，你總能多發現一點別人沒注意到的東西。',
    },
    {
        archetypeId: 'scholar',
        abilityId: 'study',
        trigger: ArchetypeAbilityTrigger.EnemyEncounterRecord,
        name: 'Study',
        description: '你會記下遇過的對手與狀況，下次再遇到，就沒那麼手忙腳亂了。',
    },
    {
        archetypeId: 'tinkerer',
        abilityId: 'salvage',
        trigger: ArchetypeAbilityTrigger.SalvageMaterialDrop,
        name: 'Salvage',
        description: '打倒機械類的對手、翻找戰利品時，你總能多撿到一些零件——而且莫名其妙就知道怎麼用。',
    },
    {
        archetypeId: 'gambler',
        abilityId: 'risk_and_reward',
        trigger: ArchetypeAbilityTrigger.RiskRewardChoice,
        name: 'Risk & Reward',
        description: '遇到輪盤或抉擇時，你永遠多一個別人沒有的選項——賭大的。',
    },
] as const;

export function getArchetypeAbilityByArchetypeId(archetypeId: string): ArchetypeAbility | undefined {
    return ARCHETYPE_ABILITIES.find(ability => ability.archetypeId === archetypeId);
}
