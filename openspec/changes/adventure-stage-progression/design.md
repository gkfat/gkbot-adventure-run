## Context

`AdventureRun`（`adventure-run-core`，已封存）目前只有一個無限遞增的 `step`：`decideNextNode` 依 `step` 決定下一節點類型（保底 Rest > 固定 Elite/Strong Elite 節奏 > 加權隨機），敵人難度也直接用 `step` 算 `enemyLevel`。這個模型完全沒有「關卡邊界」或「Boss」的概念，也沒有呼應 `docs/worldview.md` 已定案的裂域四類設施敘事（補給/研究/維修/VR）。

本 change 在既有的 `step`（保留作為全域難度曲線的輸入，不更動既有的 `getEnemyLevel(step)` 公式）之上，疊加一層「章節（Chapter）→ 關卡（Stage）→ 節點」的敘事/結構分層：Stage 是「10~20 個節點、最後一個節點是 Boss」的一個單位，Chapter 是「連續 N 個 Stage 共用同一種設施主題」的敘事分組。這一層只影響**節點生成的優先序**與**顯示文案**，不影響既有的全域難度曲線、RNG 服務、combat/event 解算介面。

## Goals / Non-Goals

**Goals:**
- 每個 Stage 固定 10~20 個節點（開始時決定性 RNG roll 一次，不逐節點重擲）
- 每個 Stage 的最後一個節點固定是 Boss combat，優先序高於保底 Rest 與既有 Elite/Strong Elite 節奏
- 章節（Chapter）＝一次造訪某個裂域設施實例，該章節的關卡（Stage）數量＝該設施的複雜度，是可變動的（非固定值）
- 關卡命名呼應 `docs/worldview.md` 的設施主題清單，格式「{設施名稱}-{章節內關卡序號}」（例如「廢棄研究所-3」），不在名稱中出現全域章節編號
- 維持既有 roguelike「無限循環、只靠死亡/斷線結束」的精神，不引入「通關」結局（使用者已確認）
- 對 `combat-engine`/`events-and-blessings` 既有的 Resolver 介面零破壞：Boss 節點沿用 `CombatResolver`，只是多一個 tier

**Non-Goals:**
- 不改變全域難度曲線公式（`getEnemyLevel(step)` 維持不變，Boss 強度用獨立的 tier 倍率疊加，不是另開一套難度公式）
- 不新增「通關結局」或任何新的 `AdventureEndReason`
- 不處理既有進行中 run（開發階段資料量小，見下方 Migration Plan）
- 不新增 Boss 專屬的 UI 互動流程（沿用既有 COMBAT 節點的「開始戰鬥」按鈕與結果顯示，只加 Boss 標籤與強度警示文案）
- **不實作 `docs/worldview.md` 第 3 節「設施風險分級與敵對陣營」的機制**（毀損程度對應的敵人數量/強度倍率、GkBot vs 人類/合成人陣營選擇）——已與使用者確認世界觀先定案，機制留待專屬後續 change 設計；本 change 的 Boss/一般敵人仍全部沿用既有 `ENEMY_ARCHETYPES`（GkBot 風味）

## Decisions

- **Stage/Chapter 欄位設計**：`AdventureRun` 新增 5 個欄位：
  - `chapterIndex: number`（0-based，全域遞增，每完成一個章節的最後一個 Stage 加 1；同時驅動設施主題循環）
  - `chapterStageCount: number`（本章節的關卡總數＝該設施實例的複雜度，章節開始時以決定性 RNG roll 一次，值域見 `STAGE_CONFIG.CHAPTER_STAGE_COUNT_MIN/MAX`）
  - `stageIndexInChapter: number`（0-based，本章節內的關卡序號，跨章節時歸零）
  - `stageNodeIndex: number`（0-based，目前 Stage 內的節點序號，Boss 通過後歸零）
  - `stageNodeCount: number`（本 Stage 的節點總數，Stage 開始時 roll 一次，值域 10~20）

  不維護全域的「第幾個 Stage」計數欄位——關卡顯示名稱只需要「目前設施名稱」+「章節內序號」，不需要全域編號（見下方顯示文案決策）。設施主題 = `STAGE_CONFIG.FACILITY_THEMES[chapterIndex % STAGE_CONFIG.FACILITY_THEMES.length]`，純函式，不落地存成獨立欄位。

- **`STAGE_CONFIG` 數值（ASSUMPTION，未見於任何來源文件，比照本 repo 既有慣例記錄於此，之後可調整）**：
  ```ts
  export const STAGE_CONFIG = {
    NODE_COUNT_MIN: 10,
    NODE_COUNT_MAX: 20,             // inclusive，決定性 RNG uniform roll，Stage 開始時 roll 一次
    CHAPTER_STAGE_COUNT_MIN: 3,
    CHAPTER_STAGE_COUNT_MAX: 6,     // inclusive，決定性 RNG uniform roll，章節開始時 roll 一次（設施複雜度）
    FACILITY_THEMES: [
      '廢棄補給站', '廢棄研究所', '廢棄維修廠', '崩壞VR體驗館',
      '廢棄工廠', '荒廢遊樂場', '廢棄百貨公司', '無主小賣店',
    ], // 依 docs/worldview.md 第 2 節表格順序循環，清單可持續擴充
  } as const;
  ```

- **`decideNextNode` 優先序調整為「Stage 邊界 > 保底 Rest > 固定 Elite 節奏 > 加權隨機」**：Boss 判定 (`run.stageNodeIndex === run.stageNodeCount - 1`) 放在最前面，即使同時符合保底 Rest 也優先出 Boss——Stage 的最後一個節點語意上就是「這個 Stage 的終點」，不該被 Rest 保底規則截走。若 Boss 判定沒觸發，其餘優先序（保底 Rest > Elite/Strong Elite 節奏 > 加權隨機）完全比照既有 `adventure-run-lifecycle` spec 不變。

- **Boss 戰固定 1 wave 1 敵**：`resolveCombat` 對 `tier === NodeType.BOSS` 略過 `rollWaveCount`/`rollEnemyCount`，直接使用 `waveCount=1, enemyCountPerWave=1`（ASSUMPTION：Boss 強度用單體數值堆高呈現，不靠疊加雜兵數量，符合敘事上「頭目」的單一個體形象）。

- **Boss 難度/獎勵倍率（ASSUMPTION，比照 `combat-engine` design.md 對 Elite/Strong Elite 的既有假設模式延伸）**：
  ```ts
  // difficulty.ts 的 getStatMultipliers tierMult
  BOSS: { hp: 4.0, atk: 2.8, def: 2.0 }

  // combat.ts 的三張 tier map
  TIER_SCORE_MULTIPLIER.BOSS = 8
  TIER_BLESSING_POINTS.BOSS = 5
  TIER_MAX_DROP_RARITY.BOSS = Rarity.L  // 沿用既有最高稀有度上限，不新增稀有度分級
  ```
  另外 Boss 節點的掉落判定強制 `itemDropChance = 1`（保底掉落，不吃 LUCK 機率門檻）——Boss 是 Stage 的敘事高潮，不該讓玩家打完 Boss 空手而回。

- **Stage/Chapter 邊界推進放在「Boss 節點的 RESOLUTION 離開時」，而非戰鬥當下**：比照既有 `step` 只在離開 RESOLUTION 時才 +1 的節奏，Stage/Chapter 相關欄位的更新同樣放在 `advanceFromResolution`（非 BLESSING_SELECT 分支）與 `selectBlessing`（Boss 觸發 BLESSING_SELECT 的情境）這兩個「即將進入下一個 EXPLORING」的出口，用 `run.currentNodeType === NodeType.BOSS` 判斷本次離開的是不是 Boss 節點：
  - 不是 Boss → 只有 `stageNodeIndex + 1`（一般節點推進，Stage/Chapter 不動）
  - 是 Boss → 先判斷 `run.stageIndexInChapter === run.chapterStageCount - 1`（本章節最後一關）：
    - 是 → 本章節結束：`chapterIndex + 1`、重新 roll `chapterStageCount`、`stageIndexInChapter = 0`
    - 否 → 章節內還有下一關：`stageIndexInChapter + 1`（`chapterIndex`/`chapterStageCount` 不動）
    - 兩種情況都要：`stageNodeIndex = 0`、重新 roll `stageNodeCount`（開新的一關）
  `run.step` 維持原本「每離開一次 RESOLUTION/BLESSING_SELECT 就 +1」的全域語意不變，繼續驅動 `getEnemyLevel`。

- **首頁/冒險畫面顯示文案**：`GET /api/adventure/current` 回傳的 run 快照新增上述 5 個欄位（前端純顯示用，不影響狀態機邏輯本身）；`getStageDisplayName(chapterIndex, stageIndexInChapter)` 回傳「{設施名稱}-{stageIndexInChapter+1}」（例如「廢棄研究所-3」，不含章節編號）；`app/pages/adventure.vue` 頂部從「第 {{ step+1 }} 關」改為顯示這個關卡名稱 +「{{ stageNodeIndex+1 }} / {{ stageNodeCount }}」節點進度；首頁「繼續冒險」CTA 文案比照同樣格式（原本引用 `adventure-run-lifecycle` spec 的「第 N 關」場景需一併更新為新格式）。

## Risks / Trade-offs

- [風險] `CHAPTER_STAGE_COUNT_MIN/MAX=3~6`、Boss 倍率等全部是本 change 發明的假設值，可能跟之後美術/數值設計的正式規劃衝突 → [緩解] 全部集中在 `STAGE_CONFIG` 與 `difficulty.ts`/`combat.ts` 的 tier map，改動面小，且已在此明確標註 ASSUMPTION
- [風險] 本 change 刻意不實作 `docs/worldview.md` 第 3 節的設施分級/敵對陣營機制，Boss 與一般敵人在所有設施主題下都長得一樣（都是既有 GkBot 風味），敘事上「工廠 vs 百貨商場」的差異感會不足 → [接受，非本 change 範圍]：已與使用者確認世界觀先定案、機制另開 change，本 change 只需確保 Chapter/Stage 結構與顯示名稱正確
- [風險] Boss 固定 1 wave 1 敵 + hp x4 的單體強度曲線，若跟一般 Elite/Strong Elite 的多波多敵曲線差距抓太大會不好調 → [緩解] 倍率是純數值常數，可事後依實測手感調整，不影響架構
- [風險] `decideNextNode` 新增的 Stage 邊界判斷若寫錯順序，可能讓保底 Rest 永遠排不進最後一個節點前 → [緩解] 已在 spec.md 明確寫出「Stage 邊界優先於保底 Rest」的場景，並補單元測試涵蓋「保底 Rest 條件成立但同時是 Stage 最後一個節點」的情境
- [風險] Boss 節點目前沿用 `EnemyTier`/`ENEMY_ARCHETYPES`（維修型/保全機具等既有 4 型），沒有專屬 Boss 造型/命名，敘事上「頭目」辨識度不足 → [接受，非本 change 範圍]：本 change 先確保機制正確（Boss 節點觸發時機、數值強度），Boss 專屬敵人範本/美術留待後續內容製作 change 補上，`ENEMY_ARCHETYPES` 陣列裡先用既有 4 型隨機挑一個套用 BOSS tier 倍率即可

## Migration Plan

- `adventureRuns` 尚在早期開發階段，目前僅有測試帳號的少量進行中 run；新欄位 (`chapterIndex`/`chapterStageCount`/`stageIndexInChapter`/`stageNodeIndex`/`stageNodeCount`) 對這些既有文件而言會是 `undefined`。決策：**不做資料回填**，`AdventureRunService` 讀取時對這 5 個欄位一律以 `?? 0` 容錯，`chapterStageCount` 額外容錯 `?? STAGE_CONFIG.CHAPTER_STAGE_COUNT_MIN`、`stageNodeCount` 容錯 `?? STAGE_CONFIG.NODE_COUNT_MIN`，讓舊 run 在下一次 `advance()` 時自然被視為「章節 1（第一個設施主題）- 章節內第 1 關 - 第 0 個節點」接續下去，不需要中斷玩家目前進行中的 run
- `createRun`（`AdventureRunRepository`）初始化新欄位為 `chapterIndex=0, stageIndexInChapter=0, stageNodeIndex=0`，並在建立時各 roll 一次 `chapterStageCount`、`stageNodeCount`
