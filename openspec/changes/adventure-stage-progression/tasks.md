## 1. 型別與常數

- [x] 1.1 `shared/types/adventure.ts`：`NodeType` 新增 `BOSS`；`AdventureRun` 新增 `chapterIndex`/`chapterStageCount`/`stageIndexInChapter`/`stageNodeIndex`/`stageNodeCount`（number）；`CombatContext.tier` 型別加入 `NodeType.BOSS`
- [x] 1.2 `shared/types/adventure.ts` 新增 `STAGE_CONFIG`（`NODE_COUNT_MIN`/`NODE_COUNT_MAX`/`CHAPTER_STAGE_COUNT_MIN`/`CHAPTER_STAGE_COUNT_MAX`/`FACILITY_THEMES`，見 design.md，`FACILITY_THEMES` 依 `docs/worldview.md` 第 2 節設施清單，可持續擴充）
- [x] 1.3 新增純函式（放 `shared/types/adventure.ts` 或新增 `shared/utils/stage.ts`）：`getFacilityTheme(chapterIndex)`、`getStageDisplayName(chapterIndex, stageIndexInChapter)`（回傳「{設施名稱}-{stageIndexInChapter+1}」，不含全域章節編號）
- [x] 1.4 `server/constants/difficulty.ts`：`EnemyTier` 新增 `'BOSS'`；`getStatMultipliers` 的 tierMult 新增 BOSS 倍率（hp 4.0/atk 2.8/def 2.0）
- [x] 1.5 `server/constants/combat.ts`：`TIER_SCORE_MULTIPLIER`/`TIER_BLESSING_POINTS`/`TIER_MAX_DROP_RARITY` 新增 BOSS 條目（8 / 5 / Rarity.L）
- [x] 1.6 `shared/schemas/firestore/adventure.schema.ts`：`adventureRunSchema` 新增 5 個新欄位對應的 zod schema（`chapterIndex`/`chapterStageCount`/`stageIndexInChapter`/`stageNodeIndex`/`stageNodeCount`，皆 `z.number().int().min(0)`）

## 2. 節點生成與狀態機

- [x] 2.1 `server/services/adventure-run.service.ts` 的 `decideNextNode`：新增 Stage 邊界判定（`run.stageNodeIndex === run.stageNodeCount - 1` → 回傳 `NodeType.BOSS`），優先序調整為 Stage 邊界 > 保底 Rest > 固定精英節奏 > 加權隨機
- [x] 2.2 `advanceFromExploring`：處理 `nodeType === NodeType.BOSS` 分支，`currentNodeData` 比照 COMBAT/ELITE/STRONG_ELITE 帶 `enemyLevel`/`tier`
- [x] 2.3 新增 Stage/Chapter roll 邏輯：新 Stage 開始時用 `RngService` roll `stageNodeCount`（10~20 之間，含頭尾）；新章節開始時另外 roll `chapterStageCount`（3~6 之間，含頭尾）
- [x] 2.4 `advanceFromResolution`（非 BLESSING_SELECT 分支）與 `selectBlessing`：離開 RESOLUTION/BLESSING_SELECT 進入下個 EXPLORING 前，依 `run.currentNodeType === NodeType.BOSS` 判斷推進方式（見 design.md「Stage/Chapter 邊界推進」決策）：
  - 非 Boss → 僅 `stageNodeIndex + 1`
  - Boss 且 `stageIndexInChapter === chapterStageCount - 1`（本章節最後一關）→ `chapterIndex + 1`、重新 roll `chapterStageCount`、`stageIndexInChapter = 0`、`stageNodeIndex = 0`、重新 roll `stageNodeCount`
  - Boss 且非本章節最後一關 → `stageIndexInChapter + 1`、`stageNodeIndex = 0`、重新 roll `stageNodeCount`
- [x] 2.5 `server/repositories/adventure-run.repository.ts` 的 `createRun`：初始化 `chapterIndex=0, stageIndexInChapter=0, stageNodeIndex=0`，並在建立時各 roll 一次 `chapterStageCount`、`stageNodeCount`
- [x] 2.6 讀取既有 run 文件時，對這 5 個新欄位容錯 `?? 0`（`chapterStageCount` 容錯 `?? STAGE_CONFIG.CHAPTER_STAGE_COUNT_MIN`、`stageNodeCount` 容錯 `?? STAGE_CONFIG.NODE_COUNT_MIN`），涵蓋 change 上線前已存在的進行中 run（見 design.md Migration Plan）

## 3. 戰鬥引擎（Boss）

- [x] 3.1 `server/services/adventure-run.service.ts` 的 `resolveCombat`：`tier === NodeType.BOSS` 時略過 `rollWaveCount`/`rollEnemyCount`，固定 `waveCount=1, enemyCountPerWave=1`
- [x] 3.2 `server/services/combat.service.ts`：確認掉落計算對 BOSS tier 強制 `itemDropChance = 1`（保底掉落，不吃 LUCK 門檻）

## 4. API 與文件

- [x] 4.1 確認 `GET /api/adventure/current`／`POST /api/adventure/advance` 等既有回應 schema（`publicAdventureRunSchema` 系列）自動涵蓋新欄位（透過 `.omit({seed:true})` 衍生，無需手動增列），必要時更新 openapi 範例
- [x] 4.2 確認 `docs/worldview.md` 第 2/3/6 節（設施類型擴充、設施風險分級與敵對陣營、章節/關卡/節點結構）內容與本 change 一致（本次更新已隨 worldview 一併完成，僅需 review 無需再改）

## 5. 前端

- [x] 5.1 `app/composables/useAdventureRun.ts`：`AdventureRunView` 型別新增 `chapterIndex`/`chapterStageCount`/`stageIndexInChapter`/`stageNodeIndex`/`stageNodeCount`；新增顯示用 helper（`getStageDisplayName` 等，從 shared 匯入或本地重算）
- [x] 5.2 `app/pages/adventure.vue`：頂部區塊從「第 {{ step+1 }} 關」改為顯示 `getStageDisplayName(...)`（例如「廢棄研究所-3」）+ Stage 內節點進度「{{ stageNodeIndex+1 }} / {{ stageNodeCount }}」
- [x] 5.3 `app/pages/adventure.vue` 的 COMBAT 節點區塊：`currentNodeType === BOSS` 時顯示 Boss 專屬標籤/警示文案（沿用既有「開始戰鬥」按鈕與 `GameCombatResultPanel`，不新增互動流程）
- [x] 5.4 首頁「繼續冒險」CTA（`app/pages/main.vue` 或對應 composable）文案改用關卡名稱，比照 spec.md 更新後的場景

## 6. 測試與驗證

- [x] 6.1 `decideNextNode` 單元測試：Stage 邊界優先於保底 Rest；Stage 邊界優先於固定精英節奏；非邊界時既有優先序不受影響（回歸測試）
- [x] 6.2 Boss 戰鬥單元測試：`waveCount`/`enemyCountPerWave` 固定為 1；同 enemyLevel 下 BOSS 三項倍率皆高於 STRONG_ELITE；保底掉落至少一件裝備
- [x] 6.3 Stage/Chapter 推進單元測試：Boss 勝利且非本章節最後一關 → 只 `stageIndexInChapter+1`／`stageNodeIndex=0`／重新 roll `stageNodeCount`；Boss 勝利且是本章節最後一關 → `chapterIndex+1`／重新 roll `chapterStageCount`／`stageIndexInChapter=0`；一般節點只 `stageNodeIndex+1`
- [x] 6.4 既有回歸測試（`adventure-run.service.test.ts`／`combat.service.test.ts`／`difficulty.test.ts`）維持全綠
- [x] 6.5 手動驗證（瀏覽器）：一路推進到 Stage 最後一個節點確認觸發 Boss、擊敗 Boss 後確認關卡名稱/章節內序號正確更新、連續打完一整個章節（例如 3 關）確認換章節時設施名稱切換、首頁 CTA 與冒險畫面頂部文案正確顯示
