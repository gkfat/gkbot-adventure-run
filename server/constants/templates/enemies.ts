/**
 * Enemy archetypes — static content data for combat encounters.
 *
 * ASSUMPTION (see combat-engine/design.md): none of this is defined anywhere
 * else in the repo — the referenced `10_戰鬥模型.md` doesn't exist, and
 * docs/worldview.md explicitly leaves monster naming/stats to this change.
 * Base stats are set at enemyLevel=1; actual combat stats are scaled via
 * getStatMultipliers() (../difficulty.ts) for the node's real enemyLevel/tier.
 */

export type EnemyArchetype = {
    // Stable, position-independent identifier used as the portrait filename
    // key (enemy-portrait-resolution) — kebab-case, unique across all 32
    // archetypes. Reordering/inserting entries in the arrays below MUST NOT
    // change an existing archetype's slug.
    slug: string;
    name: string;
    description: string;
    baseAtk: number;
    baseDef: number;
    baseHp: number;
    actionIntervalSec: number;
    // Boss composition (chapter-level-structure): when this archetype is
    // spawned as a BOSS-tier node's boss unit, it brings this many
    // STRONG_ELITE-tier minion escorts (0~2), and — if canReinforce — can
    // replace a fallen minion mid-fight (see CombatService.resolve).
    // Only meaningful on a *_BOSS_ARCHETYPES entry (mob archetypes are never
    // spawned as a BOSS-tier boss unit) — omitted defaults to 0/false.
    bossMinionCount?: 0 | 1 | 2;
    canReinforce?: boolean;
    // LUK (crit/dodge) overrides (enemy-factions-and-severity) — omitted
    // falls back to the global ENEMY_COMBAT_STATS default. Only "灵巧型"
    // archetypes set these, giving them a distinct feel from "笨重型" ones.
    critChanceOverride?: number;
    dodgeChanceOverride?: number;
};

// GkBot 陣營小兵 (enemy-factions-and-severity, design.md 決策 6) — the first
// four echo worldview.md's "維修設施殘存 GkBot 與失控機具" + logicard-duel's
// 工作/防禦/侵略/雜兵 flavor split (kept verbatim from the pre-expansion
// roster, no longer doubling as boss templates); the other four are new.
// ASSUMPTION: descriptions/stats/LUK overrides are invented, freely tunable —
// short flavor text for the pre-fight enemy preview.
export const ENEMY_ARCHETYPES: EnemyArchetype[] = [
    {
        slug: 'gkbot-repair', name: '維修型 GkBot', description: '殘存的維修機具，機械手臂仍徒勞地執行著早已過期的保養指令。', baseAtk: 8, baseDef: 4, baseHp: 60, actionIntervalSec: 2.5,
    },
    {
        slug: 'gkbot-security-unit', name: '保全機具', description: '失控的保全單位，將任何靠近的生物體視為入侵者。', baseAtk: 6, baseDef: 8, baseHp: 80, actionIntervalSec: 3.0,
    },
    {
        slug: 'gkbot-runaway-hauler', name: '失控搬運機', description: '原本負責搬運零件的機具，如今橫衝直撞、不辨敵我。', baseAtk: 12, baseDef: 2, baseHp: 50, actionIntervalSec: 2.2,
    },
    {
        slug: 'gkbot-scrap-pile', name: '廢棄零件堆', description: '拼湊而成的殘骸堆，靠著殘留電力勉強驅動、行動遲緩。', baseAtk: 4, baseDef: 2, baseHp: 30, actionIntervalSec: 3.5,
    },
    {
        slug: 'assembly-arm', name: '產線機械臂', description: '仍固定在生產線上的巨大機械臂，攻擊範圍隨舊有生產流程擺動。', baseAtk: 11, baseDef: 5, baseHp: 90, actionIntervalSec: 2.4,
    },
    {
        slug: 'synth-observer', name: '合成觀測員', description: '負責監控異常的輕型單位，反應敏捷，善於捕捉破綻。', baseAtk: 7, baseDef: 3, baseHp: 35, actionIntervalSec: 2.0, critChanceOverride: 0.15, dodgeChanceOverride: 0.18,
    },
    {
        slug: 'phantom-projector', name: '幻影投影體', description: '殘留的全息投影裝置，影像忽隱忽現，攻擊難以捉摸。', baseAtk: 7, baseDef: 2, baseHp: 32, actionIntervalSec: 2.1, dodgeChanceOverride: 0.23,
    },
    {
        slug: 'dealer-gkbot', name: '荷官型 GkBot', description: '曾在賭場服務的荷官機具，出手精準帶著職業性的狠勁。', baseAtk: 5, baseDef: 5, baseHp: 55, actionIntervalSec: 2.6, critChanceOverride: 0.17,
    },
];

// GkBot 陣營頭目 (design.md 決策 6) — independent baseAtk/baseDef/baseHp
// templates, no longer a mob archetype scaled by the BOSS tier multiplier
// (see CombatService — Boss nodes now apply NORMAL tier to these values).
// bossMinionCount/canReinforce (escort composition) ASSUMPTION: invented to
// preserve the existing "some bosses bring/reinforce escorts" variety.
export const GKBOT_BOSS_ARCHETYPES: EnemyArchetype[] = [
    {
        slug: 'guard-hound-gkbot', name: '看門犬型 GkBot', description: '巡邏用重型機犬，對入侵者鎖定後絕不輕易鬆口。', baseAtk: 10, baseDef: 16, baseHp: 220, actionIntervalSec: 2.8, bossMinionCount: 2, canReinforce: true,
    },
    {
        slug: 'recon-drone', name: '偵察無人機', description: '高速飛行單位，靠著閃避與偷襲拉扯戰局。', baseAtk: 16, baseDef: 6, baseHp: 110, actionIntervalSec: 1.8, dodgeChanceOverride: 0.28,
    },
    {
        slug: 'core-repair-officer', name: '核心維修官', description: '核心區域的維修統籌單位，未來技能：自我修復（見 worldview §7.5）。', baseAtk: 14, baseDef: 10, baseHp: 170, actionIntervalSec: 2.5, bossMinionCount: 1, canReinforce: true,
    },
    {
        slug: 'assembly-overseer', name: '產線總管', description: '生產線的最高權限單位，未來技能：過載攻擊。', baseAtk: 22, baseDef: 6, baseHp: 150, actionIntervalSec: 2.2, bossMinionCount: 1,
    },
    {
        slug: 'illusion-mage-unit', name: '幻象法師型', description: '殘存的娛樂用投影單位，未來技能：幻影分身。', baseAtk: 15, baseDef: 5, baseHp: 120, actionIntervalSec: 2.3, dodgeChanceOverride: 0.32,
    },
    {
        slug: 'dealer-boss', name: '荷官頭目', description: '賭場核心荷官機具，出手比一般同型更快更狠。', baseAtk: 16, baseDef: 9, baseHp: 160, actionIntervalSec: 2.4, bossMinionCount: 1, critChanceOverride: 0.18,
    },
    {
        slug: 'warehouse-hauler-overlord', name: '倉儲搬運霸主', description: '巨型倉儲搬運機具，行動遲緩但幾乎打不穿。', baseAtk: 15, baseDef: 18, baseHp: 230, actionIntervalSec: 2.9, bossMinionCount: 2,
    },
    {
        slug: 'mall-security-core', name: '商場保全指揮核心', description: '商場保全系統的中樞單位，未來技能：警報連動。', baseAtk: 14, baseDef: 17, baseHp: 190, actionIntervalSec: 2.7, bossMinionCount: 2, canReinforce: true,
    },
];

// 末世盜賊團陣營小兵 (design.md 決策 6) — 整體比同定位 GkBot 小兵略低 HP、
// 略高 LUK，呼應「人類更靈巧但較脆」。ASSUMPTION: 數值/LUK 覆寫皆為假設值。
export const HUMAN_ARCHETYPES: EnemyArchetype[] = [
    {
        slug: 'guard-dog', name: '看門狗', description: '盜賊團豢養的兇猛看門犬，撲咬速度極快。', baseAtk: 7, baseDef: 8, baseHp: 70, actionIntervalSec: 2.6,
    },
    {
        slug: 'human-scout', name: '偵查者（人類斥候）', description: '負責摸清地形的斥候，擅長迴避正面交鋒。', baseAtk: 8, baseDef: 3, baseHp: 40, actionIntervalSec: 2.0, dodgeChanceOverride: 0.18,
    },
    {
        slug: 'gang-enforcer', name: '幫派打手', description: '街頭出身的打手，招式粗暴但殺傷力十足。', baseAtk: 13, baseDef: 3, baseHp: 55, actionIntervalSec: 2.1,
    },
    {
        slug: 'rabble-raider', name: '烏合掠奪者', description: '臨時拼湊的散兵游勇，戰力薄弱但成群結隊。', baseAtk: 4, baseDef: 2, baseHp: 28, actionIntervalSec: 2.8,
    },
    {
        slug: 'synth-soldier', name: '合成士兵', description: '經過改造的合成人士兵，動作精準帶有機械式的冷靜。', baseAtk: 12, baseDef: 6, baseHp: 65, actionIntervalSec: 2.2, critChanceOverride: 0.11,
    },
    {
        slug: 'sniper-raider', name: '狙擊掠奪者', description: '擅長遠距離致命一擊的掠奪者，出手講求一擊必殺。', baseAtk: 14, baseDef: 2, baseHp: 38, actionIntervalSec: 2.0, critChanceOverride: 0.22,
    },
    {
        slug: 'private-guard', name: '私兵護衛', description: '受雇於盜賊團高層的護衛，訓練有素、進退有據。', baseAtk: 9, baseDef: 6, baseHp: 60, actionIntervalSec: 2.4,
    },
    {
        slug: 'casino-bouncer', name: '賭場保鑣', description: '地下賭場的保鑣，出手快狠準，不留活口。', baseAtk: 9, baseDef: 6, baseHp: 58, actionIntervalSec: 2.5, critChanceOverride: 0.14,
    },
];

// 末世盜賊團陣營頭目 (design.md 決策 6) — 獨立基準值模板，不再疊加 BOSS tier
// 倍率（見 CombatService）。bossMinionCount/canReinforce 為 ASSUMPTION。
export const HUMAN_BOSS_ARCHETYPES: EnemyArchetype[] = [
    {
        slug: 'centurion', name: '百夫長', description: '盜賊團前線指揮官，未來技能：腎上腺素爆發。', baseAtk: 20, baseDef: 11, baseHp: 180, actionIntervalSec: 2.0, bossMinionCount: 2, canReinforce: true,
    },
    {
        slug: 'vault-keeper', name: '財庫守門員', description: '死守盜賊團財庫的重裝守衛，防禦滴水不漏。', baseAtk: 15, baseDef: 17, baseHp: 210, actionIntervalSec: 2.6, bossMinionCount: 1,
    },
    {
        slug: 'berserker-boss', name: '狂暴幫主', description: '盜賊團現任幫主，未來技能：嗜血狂化。', baseAtk: 24, baseDef: 6, baseHp: 150, actionIntervalSec: 2.1,
    },
    {
        slug: 'synth-legion-commander', name: '合成軍團長', description: '統率合成士兵部隊的軍團長，攻防兼備。', baseAtk: 21, baseDef: 12, baseHp: 200, actionIntervalSec: 2.3, bossMinionCount: 2,
    },
    {
        slug: 'shadow-assassin', name: '影武者', description: '擅長背刺的暗殺者頭目，未來技能：背刺爆擊。', baseAtk: 22, baseDef: 5, baseHp: 100, actionIntervalSec: 1.8, critChanceOverride: 0.22,
    },
    {
        slug: 'casino-kingpin', name: '賭場莊家王', description: '地下賭場的實質掌控者，出手精準毫不留情。', baseAtk: 16, baseDef: 10, baseHp: 160, actionIntervalSec: 2.4, bossMinionCount: 1, critChanceOverride: 0.17,
    },
    {
        slug: 'bandit-strategist', name: '盜賊團軍師', description: '幕後策劃者，擅長調度手下伺機而動。', baseAtk: 14, baseDef: 9, baseHp: 150, actionIntervalSec: 2.5, bossMinionCount: 1, canReinforce: true,
    },
    {
        slug: 'last-stand-maniac', name: '末路狂人', description: '不計後果的亡命之徒，未來技能：自爆終結技。', baseAtk: 30, baseDef: 4, baseHp: 90, actionIntervalSec: 2.2,
    },
];
