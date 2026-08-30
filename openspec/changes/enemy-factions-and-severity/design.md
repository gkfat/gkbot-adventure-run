## Context

`docs/worldview.md` 第 3 節已定案「設施風險分級」（深度荒廢／部分運作／高度運作）與「敵對陣營」（GkBot 殘部 vs 人類/合成人）的世界觀，但完全沒有落地成資料或生成規則。`adventure-stage-progression`（前置 change）引入了「章節＝一次造訪某個裂域設施實例」的結構，這正好是「分級」與「陣營」天然的掛鉤單位——同一個章節（同一次造訪同一個設施）內，分級與陣營應該保持一致，不會同一個設施忽然一半是 GkBot、一半是人類佔領軍。

本 change 依賴 `adventure-stage-progression` 已經存在的 `chapterIndex` 邊界推進點：每次進入新章節時，除了原本的 `chapterStageCount` 之外，額外 roll 出這個章節的 `severityTier` 與 `factionType`，整個章節內（所有 Stage、所有節點）沿用同一組值。

## Goals / Non-Goals

**Goals:**
- 每個章節開始時決定性 RNG 決定 `severityTier`（三級）與 `factionType`（GkBot / 人類-合成人）
- `severityTier` 影響該章節敵人的數量機率（wave/enemy count）與 hp/atk/def 倍率
- `factionType` 決定該章節敵人（含 Boss）從哪一份範本清單抽取
- `severityTier` 越高，`factionType = HUMAN` 的機率越高（呼應 worldview「整批人類佔領最常見於高度運作分級」）
- 呼應 `docs/worldview.md` 第 3.1 節「深度荒廢也可能有零星心懷不軌的人類/合成人」——`factionType = HUMAN` 不是「非黑即白」的全有全無，而是整個章節的敵人來源都切換成人類/合成人範本（含深度荒廢分級下的「零星掠奪者」情境）

**Non-Goals:**
- 不做「同一章節內敵人陣營混合」（例如同一個 wave 內 GkBot 跟人類同時出現）——本 change 一個章節只有一種 `factionType`，混合陣營留待未來需要時再擴充
- 不改變既有的 Boss 機制本身（`adventure-stage-progression` 定義的「Stage 最後一節點固定 Boss」不變），只改變 Boss 從哪份範本清單抽取
- 不新增敵人專屬美術/立繪，僅新增文字範本資料（name/baseAtk/baseDef/baseHp/actionIntervalSec，比照既有 `ENEMY_ARCHETYPES` 格式）
- 不影響既有的 `getEnemyLevel(step)` 全域難度曲線公式，`severityTier` 是疊加倍率，不是取代

## Decisions

- **章節開始時的 roll 時機**：比照 `adventure-stage-progression` 的 `chapterStageCount`，`chapterSeverityTier`/`chapterFactionType` 在同一個「進入新章節」的 checkpoint 一併 roll（`advanceFromResolution`/`selectBlessing` 判斷 Boss 且跨章節邊界的分支），避免多一次 Firestore 讀寫。

- **`SEVERITY_CONFIG`（ASSUMPTION，呼應 worldview 3.1 節但無明確數值，比照本 repo 既有假設慣例）**：
  ```ts
  export type FacilitySeverity = 'DEEP_WRECK' | 'PARTIAL_ACTIVE' | 'HIGHLY_ACTIVE';
  export type EnemyFaction = 'GKBOT' | 'HUMAN';

  export const SEVERITY_CONFIG = {
    // 章節開始時的加權隨機（三者之和無需為 100，僅比例有意義）
    SEVERITY_WEIGHTS: { DEEP_WRECK: 40, PARTIAL_ACTIVE: 40, HIGHLY_ACTIVE: 20 },

    // 疊加在既有 getStatMultipliers 結果之上的整體倍率
    SEVERITY_STAT_MULTIPLIER: {
      DEEP_WRECK: 0.85,
      PARTIAL_ACTIVE: 1.0,   // 等同不調整，維持既有數值曲線
      HIGHLY_ACTIVE: 1.25,
    },

    // 疊加在 getWave2Chance/getEnemy2Chance/getEnemy3Chance 之上的機率加成（clamp 到既有上限不變）
    SEVERITY_WAVE_ENEMY_BONUS: {
      DEEP_WRECK: -0.05,
      PARTIAL_ACTIVE: 0,
      HIGHLY_ACTIVE: 0.05,
    },

    // 依 severityTier 決定 factionType = HUMAN 的機率
    HUMAN_FACTION_CHANCE: {
      DEEP_WRECK: 0.15,     // 零星心懷不軌的人類/合成人
      PARTIAL_ACTIVE: 0.15,
      HIGHLY_ACTIVE: 0.30,  // 整批武裝勢力佔領最常見於此分級
    },
  } as const;
  ```

- **敵人範本依陣營切換整份清單，而非逐隻混搭**：`combat.service.ts` 依 `run.chapterFactionType` 選擇 `ENEMY_ARCHETYPES`（`factionType=GKBOT`）或新增的 `HUMAN_ARCHETYPES`（`factionType=HUMAN`），一般敵人與 Boss 都從對應清單抽取。既有 `ENEMY_ARCHETYPES`/新增的 `HUMAN_ARCHETYPES` 各自標註 `bossCapable: boolean`，Boss tier 只從各自清單裡 `bossCapable=true` 的項目抽取（GkBot 陣營目前 4 型全部 `bossCapable=true`，沿用 `adventure-stage-progression` design.md 的既有決策；人類陣營則區分一般範本與 boss 專屬範本）。

- **`HUMAN_ARCHETYPES`（ASSUMPTION，自由發揮，呼應 worldview 第 3.2 節）**：
  ```ts
  export const HUMAN_ARCHETYPES: EnemyArchetype[] = [
    { name: '掠奪者民兵', baseAtk: 10, baseDef: 5, baseHp: 65, actionIntervalSec: 2.3, bossCapable: false },
    { name: '裂域私兵', baseAtk: 9, baseDef: 7, baseHp: 75, actionIntervalSec: 2.6, bossCapable: false },
    { name: '潛伏合成人', baseAtk: 11, baseDef: 4, baseHp: 55, actionIntervalSec: 2.0, bossCapable: false },
    { name: '佔領軍指揮官', baseAtk: 14, baseDef: 9, baseHp: 110, actionIntervalSec: 2.8, bossCapable: true },
  ];
  ```
  既有 `ENEMY_ARCHETYPES` 補上 `bossCapable: true`（4 型全部可當 Boss，沿用既有決策不變）。

- **`Enemy`/`EnemyArchetype` 型別新增 `faction` 欄位**：純粹是顯示與紀錄用（combatLog/圖鑑可標示陣營），不影響戰鬥計算公式本身（傷害/暴擊/閃避公式不區分陣營）。

- **前端章節開場提示（輕量，非新流程）**：`app/pages/adventure.vue` 偵測到 `stageNodeIndex === 0 && stageIndexInChapter === 0`（章節剛開始的第一個節點）時，在既有的關卡資訊區塊下方顯示一行分級/陣營提示文案（例如「⚠️ 警戒森嚴：偵測到大量敵對武裝」），純顯示、不阻擋任何操作，資料來源是 `chapterSeverityTier`/`chapterFactionType` 對應的固定文案表（ASSUMPTION 文案，可事後調整）。

## Risks / Trade-offs

- [風險] `SEVERITY_CONFIG` 全部是本 change 發明的假設權重/倍率，可能跟之後數值設計衝突 → [緩解] 集中在單一常數物件，改動面小，已明確標註 ASSUMPTION
- [風險] 「一個章節只有一種陣營」的簡化可能削弱「深度荒廢設施裡零星人類」的敘事張力（原文暗示是「零星」而非整章節都是人類） → [接受，已在 Decisions 說明]：本 change 用「切換整份範本清單」的簡單模型近似「這個章節主要是什麼威脅」，深度荒廢分級下即使切到 HUMAN 陣營，敵人數量本身也因 `SEVERITY_STAT_MULTIPLIER`/`SEVERITY_WAVE_ENEMY_BONUS` 偏低而顯得「零星」，不需要額外的節點級陣營混合機制
- [風險] 依賴 `adventure-stage-progression` 尚未實作完成，若先實作本 change 會找不到 `chapterIndex` 等欄位 → [緩解] proposal.md 已明確標註依賴順序，`/opsx:apply` 前需確認 `adventure-stage-progression` 的 tasks 已完成

## Migration Plan

- 依賴 `adventure-stage-progression` 已經處理的「舊 run 缺欄位」情境；本 change 新增的 `chapterSeverityTier`/`chapterFactionType` 同樣採用「讀取時容錯預設值」策略：缺欄位時視為 `PARTIAL_ACTIVE`/`GKBOT`（等同完全不調整的既有行為），不做資料回填
- `createRun` 初始化第一個章節時一併 roll 這兩個欄位（與 `chapterStageCount` 同一批 roll）
