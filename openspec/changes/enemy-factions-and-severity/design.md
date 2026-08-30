## Context

`docs/worldview.md` 第 3 節定案「設施風險分級」（深度荒廢／部分運作／高度運作）與「敵對陣營」（GkBot 殘部 vs 人類/合成人），第 7 節進一步定案兩個陣營各自 8 隻小兵 + 8 隻頭目的命名/風味/相對強弱基準，但完全沒有落地成資料或生成規則。

現行模型（`single-stage-run-settlement` 已歸檔實作）：一次 run＝一趟遠征＝一個 Stage，`chapterIndex` 是角色跨 run 的持久進度計數器（用來循環 `STAGE_CONFIG.FACILITY_THEMES`），run 內不再有「章節內多個 Stage」的結構。因此分級（`severityTier`）與陣營（`factionType`）只需要在 `createRun` 時骰一次、整趟 run 固定即可，不需要章節邊界推進邏輯。

## Goals / Non-Goals

**Goals:**
- `createRun` 時以決定性 RNG 決定 `severityTier`（三級）與 `factionType`（GkBot / 人類-合成人），整趟 run 固定
- `severityTier` 的機率隨角色的 `chapterIndex` 動態遞增（越到後期越容易抽到高分級），但設機率上限，永遠保留隨機性——不會變成後期必然結果
- `severityTier` 影響該趟 run 敵人的數量機率（wave/enemy count）與 hp/atk/def 倍率；`factionType` 決定敵人（含頭目）從哪一份範本清單抽取
- `severityTier` 越高，`factionType = HUMAN` 的機率越高，但 `DEEP_WRECK` 分級下仍保留較低但非零的機率（呼應 worldview「深度荒廢也可能有零星心懷不軌的人類/合成人」）
- 擴充敵人範本至 32 隻（GkBot 8 小兵 + 8 頭目、末世盜賊團 8 小兵 + 8 頭目），頭目改為獨立命名/獨立數值模板
- 新增每隻怪物可選的 LUK（爆擊/閃避）覆寫，讓「靈巧型」與「笨重型」敵人產生手感差異

**Non-Goals:**
- 不做「同一趟 run 內敵人陣營混合」——一趟 run 只有一種 `factionType`，混合陣營留待未來需要時再擴充
- 不改變既有的「Stage 最後一節點固定 Boss」機制本身，只改變 Boss 從哪份範本清單抽取、以及頭目數值不再疊加 `BOSS` tier 倍率
- 不設計任何技能觸發/冷卻機制——`docs/worldview.md` §7.5 挑出的 8 隻帶技能敵人，本 change 只在範本資料裡標註「這隻未來會有技能」的意圖，實際機制留給 `enemy-boss-skills` change
- 不新增敵人專屬美術/立繪，僅新增文字範本資料（name/baseAtk/baseDef/baseHp/actionIntervalSec/LUK 覆寫，比照既有 `EnemyArchetype` 格式擴充）
- 不影響既有的 `getEnemyLevel(step)` 全域難度曲線公式，`severityTier` 是疊加倍率，不是取代

## Decisions

### 1. Roll 時機：`createRun`，不是章節邊界

`severityTier`/`factionType` 在 `AdventureRunRepository.createRun()` 建立文件時一併決定，比照現行 `stageNodeCount` 的做法——用尚未寫入的 `seed` 透過 `random(seed, N)` 算出決定性亂數（不經過 `RngService.consumeRng()`，因為文件還不存在）。`chapterIndex` 由呼叫端（`AdventureRunService.startRun`）傳入，同現行邏輯。

### 2. `SEVERITY_CONFIG`（ASSUMPTION，數值待實測調整，方向已與使用者對齊）

```ts
export type FacilitySeverity = 'DEEP_WRECK' | 'PARTIAL_ACTIVE' | 'HIGHLY_ACTIVE';
export type EnemyFaction = 'GKBOT' | 'HUMAN';

export const SEVERITY_CONFIG = {
  // 依 chapterIndex 動態遞增，clamp 保留隨機性（不會變成後期必然結果）
  HIGHLY_ACTIVE_BASE_CHANCE: 0.05,
  HIGHLY_ACTIVE_PER_CHAPTER: 0.02,
  HIGHLY_ACTIVE_CAP: 0.50,

  PARTIAL_ACTIVE_BASE_CHANCE: 0.25,
  PARTIAL_ACTIVE_PER_CHAPTER: 0.015,
  PARTIAL_ACTIVE_CAP: 0.40,
  // DEEP_WRECK = 1 - HIGHLY_ACTIVE - PARTIAL_ACTIVE（剩餘機率）

  // 疊加在既有 getStatMultipliers 結果之上的整體倍率
  // DEF 刻意保守（減法傷害模型 max(1, ATK-DEF) 對 DEF 倍率極敏感，
  // 太激進會把 ATK-DEF 打到地板值 1，戰鬥變成無意義拖磨）
  SEVERITY_STAT_MULTIPLIER: {
    DEEP_WRECK: { hp: 0.85, atk: 0.85, def: 0.90 },
    PARTIAL_ACTIVE: { hp: 1.0, atk: 1.0, def: 1.0 },  // 現行基準，不調整
    HIGHLY_ACTIVE: { hp: 1.25, atk: 1.15, def: 1.08 },
  },

  // 疊加在 getWave2Chance/getEnemy2Chance/getEnemy3Chance 結果之上的機率倍率
  // （相乘後仍 clamp 在既有的 WAVE_2_CAP/ENEMY_2_CAP/ENEMY_3_CAP 上限內）
  SEVERITY_WAVE_ENEMY_MULTIPLIER: {
    DEEP_WRECK: 0.8,
    PARTIAL_ACTIVE: 1.0,
    HIGHLY_ACTIVE: 1.3,
  },

  // 依 severityTier 決定 factionType = HUMAN 的機率
  HUMAN_FACTION_CHANCE: {
    DEEP_WRECK: 0.25,      // 零星心懷不軌的人類/合成人
    PARTIAL_ACTIVE: 0.15,
    HIGHLY_ACTIVE: 0.40,   // 整批武裝勢力佔領最常見於此分級
  },
} as const;
```

Boss 額外強度不再透過 `BOSS` tier 倍率取得（見決策 4），因此本設定不含 Boss 專屬的 severity 加成；`severityTier` 對頭目的影響與對小兵完全一致（同一份 `SEVERITY_STAT_MULTIPLIER`）。

### 3. `EnemyArchetype` 新增 LUK 覆寫欄位

```ts
export type EnemyArchetype = {
  name: string;
  description: string;
  baseAtk: number;
  baseDef: number;
  baseHp: number;
  actionIntervalSec: number;
  critChanceOverride?: number;   // 未填 = 沿用 ENEMY_COMBAT_STATS.critChance
  dodgeChanceOverride?: number;  // 未填 = 沿用 ENEMY_COMBAT_STATS.dodgeChance
};
```

`combat.service.ts` 判定爆擊/閃避時，優先讀取該隻敵人模板的覆寫值，沒有才回退全域 `ENEMY_COMBAT_STATS`——多數低 LUK 模板不填覆寫，高 LUK 模板才顯式設定較高的值。

### 4. 頭目改為獨立清單，不疊加 `BOSS` tier 倍率

現行 `getStatMultipliers(enemyLevel, tier)` 的 `BOSS` tier（hp×4.0/atk×2.8/def×2.0）**不再用於頭目**——頭目清單裡每隻的 `baseAtk/baseDef/baseHp` 本身就已經是「頭目基準值」，仍隨 `enemyLevel` 走 `NORMAL` tier 的縮放曲線（`baseHp * (1 + levelSteps*HP_MULT_PER_LEVEL)` 等），但不再乘上 `BOSS` 專屬倍率，避免雙重疊加把數值打到誇張的量級。`combat.service.ts` 呼叫 `getStatMultipliers` 時，Boss 節點一律傳入 `'NORMAL'` tier，只是選用的 base archetype 來自頭目清單而非小兵清單。

`EnemyTier` 型別（`difficulty.ts`）保留 `'BOSS'` 值僅供 `expForKill`/`blessingPointsForVictory`/`maxDropRarity` 等獎勵倍率使用（頭目擊殺獎勵仍要高於小兵），但 `getStatMultipliers` 不再把 `'BOSS'` 映射到額外的 hp/atk/def 倍率——直接改成頭目清單抽取本身的高數值 + `NORMAL` tier 縮放。

### 5. 陣營範本切換整份清單

`combat.service.ts` 依 `run.factionType` 選擇：
- 一般戰鬥（COMBAT/ELITE/STRONG_ELITE）：`factionType=GKBOT` 用 `ENEMY_ARCHETYPES`，`factionType=HUMAN` 用 `HUMAN_ARCHETYPES`
- Boss 節點：`factionType=GKBOT` 用 `GKBOT_BOSS_ARCHETYPES`，`factionType=HUMAN` 用 `HUMAN_BOSS_ARCHETYPES`

### 6. 32 隻怪物範本（ASSUMPTION，數值待實測調整；命名/風味/相對強弱傾向已在 `docs/worldview.md` §7.1~§7.4 定案）

HP/ATK/DEF 數值延續現行 `ENEMY_ARCHETYPES` 的量級（4~12 ATK／2~9 DEF／30~80 HP 為小兵區間），頭目整體再高一個量級；LUK 欄位僅高 LUK 模板才填覆寫值。

**GkBot 陣營 — 8 小兵**

| 模板 | ATK | DEF | HP | interval | LUK 覆寫 |
| --- | --- | --- | --- | --- | --- |
| 維修型 GkBot（沿用） | 8 | 4 | 60 | 2.5 | — |
| 保全機具（沿用） | 6 | 8 | 80 | 3.0 | — |
| 失控搬運機（沿用） | 12 | 2 | 50 | 2.2 | — |
| 廢棄零件堆（沿用） | 4 | 2 | 30 | 3.5 | — |
| 產線機械臂 | 11 | 5 | 90 | 2.4 | — |
| 合成觀測員 | 7 | 3 | 35 | 2.0 | crit +0.10, dodge +0.15 |
| 幻影投影體 | 7 | 2 | 32 | 2.1 | dodge +0.20 |
| 荷官型 GkBot | 5 | 5 | 55 | 2.6 | crit +0.12 |

**GkBot 陣營 — 8 頭目**

| 頭目 | ATK | DEF | HP | interval | LUK 覆寫 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| 看門犬型 GkBot | 10 | 16 | 220 | 2.8 | — | |
| 偵察無人機 | 16 | 6 | 110 | 1.8 | dodge +0.25 | |
| 核心維修官 | 14 | 10 | 170 | 2.5 | — | 未來技能：自我修復（見 worldview §7.5） |
| 產線總管 | 22 | 6 | 150 | 2.2 | — | 未來技能：過載攻擊 |
| 幻象法師型 | 15 | 5 | 120 | 2.3 | dodge +0.30 | 未來技能：幻影分身 |
| 荷官頭目 | 16 | 9 | 160 | 2.4 | crit +0.15 | |
| 倉儲搬運霸主 | 15 | 18 | 230 | 2.9 | — | |
| 商場保全指揮核心 | 14 | 17 | 190 | 2.7 | — | 未來技能：警報連動 |

**末世盜賊團 — 8 小兵**（整體比同定位 GkBot 小兵略低 HP、略高 LUK，呼應「人類更靈巧但較脆」）

| 模板 | ATK | DEF | HP | interval | LUK 覆寫 |
| --- | --- | --- | --- | --- | --- |
| 看門狗 | 7 | 8 | 70 | 2.6 | — |
| 偵查者（人類斥候） | 8 | 3 | 40 | 2.0 | dodge +0.15 |
| 幫派打手 | 13 | 3 | 55 | 2.1 | — |
| 烏合掠奪者 | 4 | 2 | 28 | 2.8 | — |
| 合成士兵 | 12 | 6 | 65 | 2.2 | crit +0.08 |
| 狙擊掠奪者 | 14 | 2 | 38 | 2.0 | crit +0.20 |
| 私兵護衛 | 9 | 6 | 60 | 2.4 | — |
| 賭場保鑣 | 9 | 6 | 58 | 2.5 | crit +0.12 |

**末世盜賊團 — 8 頭目**

| 頭目 | ATK | DEF | HP | interval | LUK 覆寫 | 備註 |
| --- | --- | --- | --- | --- | --- | --- |
| 百夫長 | 20 | 11 | 180 | 2.0 | — | 未來技能：腎上腺素爆發 |
| 財庫守門員 | 15 | 17 | 210 | 2.6 | — | |
| 狂暴幫主 | 24 | 6 | 150 | 2.1 | — | 未來技能：嗜血狂化 |
| 合成軍團長 | 21 | 12 | 200 | 2.3 | — | |
| 影武者 | 22 | 5 | 100 | 1.8 | crit +0.20 | 未來技能：背刺爆擊 |
| 賭場莊家王 | 16 | 10 | 160 | 2.4 | crit +0.15 | |
| 盜賊團軍師 | 14 | 9 | 150 | 2.5 | — | |
| 末路狂人 | 30 | 4 | 90 | 2.2 | — | 未來技能：自爆終結技 |

### 7. `Enemy`/`EnemyArchetype` 新增 `faction` 欄位

純顯示/紀錄用（combatLog、未來圖鑑可標示陣營），不影響戰鬥計算公式本身。

### 8. 前端 Stage 開場提示（輕量，非新流程）

`app/pages/adventure.vue` 在 run 開始（`stageNodeIndex === 0`）時，於既有關卡資訊區塊下方顯示一行分級/陣營提示文案（例如「⚠️ 警戒森嚴：偵測到大量敵對武裝」），純顯示、不阻擋任何操作，文案來源是 `severityTier`/`factionType` 對應的固定文案表（ASSUMPTION 文案，可事後調整）。

## Risks / Trade-offs

- [風險] `SEVERITY_CONFIG` 與 32 隻怪物的數值全部是本 change 的假設值，可能跟之後實測平衡衝突 → [緩解] 集中在單一常數物件與 `combat.ts` 範本清單，改動面小，已明確標註 ASSUMPTION
- [風險] 「一趟 run 只有一種陣營」的簡化可能削弱「深度荒廢設施裡零星人類」的敘事張力 → [接受]：`DEEP_WRECK` 分級下即使骰到 `HUMAN`，敵人數量本身也因 `SEVERITY_WAVE_ENEMY_MULTIPLIER` 偏低而顯得「零星」，不需要額外的節點級陣營混合機制
- [風險] 頭目數值移除 `BOSS` tier 倍率、改成獨立清單，若清單數值抓太保守可能導致頭目強度不增反減 → [緩解] 上表頭目 base 值已刻意設在小兵的 1.5~4 倍區間，且仍隨 `enemyLevel` 縮放，正式上線前需搭配 `combat.service.test.ts` 的數值回歸測試檢查

## Migration Plan

- 新增的 `severityTier`/`factionType` 欄位採用「讀取時容錯預設值」策略：缺欄位的既有 run 視為 `PARTIAL_ACTIVE`/`GKBOT`（等同完全不調整的既有行為），不做資料回填
- `createRun` 建立新文件時一併 roll 這兩個欄位（與 `stageNodeCount` 同一批用 `seed` 算出的決定性亂數）
