## 1. 型別與常數

- [x] 1.1 `shared/types/adventure.ts`：`AdventureRun` 移除 `score`/`chapterStageCount`/`stageIndexInChapter`，新增 `expEarned: number`、`settlement?: SettleSummary`；`CombatResult`/`CombatSummary` 移除 `scoreGained`，新增 `expGained`；`AdventureEndReason` 新增 `COMPLETED`；`STAGE_CONFIG` 移除 `CHAPTER_STAGE_COUNT_MIN`/`CHAPTER_STAGE_COUNT_MAX`
- [x] 1.2 `shared/types/adventure.ts` 新增 `SettleSummary` 型別：`goldEarned`/`gemsEarned`（實際併入角色的金額）、`items: ItemInstance[]`（實際轉入永久背包的物品，取代單純數量）、`untransferredItemIds: string[]`、`expGained`、`leveledUp`、`newLevel`、`unspentAttributePointsGained`、`forfeitedGold`/`forfeitedGems`/`forfeitedItems: ItemInstance[]`（失敗時作廢的金額/物品；成功時皆為 0/空陣列），供 `run.settlement` 與 API 回應共用
- [x] 1.3 `shared/types/adventure.ts`：`getStageDisplayName` 簡化為只回傳 `getFacilityTheme(chapterIndex)`（移除章節內關卡序號拼接），呼叫端改成單一參數
- [x] 1.4 `shared/types/adventure.ts`：新增敵人陣容預覽型別 `EnemyPreview`（`archetypeIndex`/`name`/`description`/`level`/`hp`）；`currentNodeData` 的 COMBAT/ELITE/STRONG_ELITE/BOSS 分支新增 `firstWaveEnemies: EnemyPreview[]`、`waveCount`、`enemyCountPerWave`；`CombatContext` 新增可選的 `firstWaveArchetypeIndices?: number[]`
- [x] 1.5 `shared/types/character.ts`：`Character` 新增 `nextChapterIndex: number`
- [x] 1.6 `server/constants/combat.ts`：`scoreForKill`/`TIER_SCORE_MULTIPLIER` 改名 `expForKill`/`TIER_EXP_MULTIPLIER`（數值不變）；`ENEMY_ARCHETYPES` 每個項目新增 `description: string`（簡短風味文字）
- [x] 1.7 `shared/schemas/firestore/adventure.schema.ts`：同步 1.1/1.2/1.4 的欄位異動（`score`→`expEarned`、移除 `chapterStageCount`/`stageIndexInChapter`、新增 `settlement` 的 zod schema、`combatSummarySchema` 的 `scoreGained`→`expGained`）
- [x] 1.8 `shared/schemas/firestore/character.schema.ts`：新增 `nextChapterIndex: z.number().int().min(0)`

## 2. 戰鬥引擎（EXP 與敵人陣容）

- [x] 2.1 `server/services/combat.service.ts`：`computeRewards` 呼叫改用 `expForKill`，回傳欄位 `scoreGained`→`expGained`；`NODE_TYPE_TO_ENEMY_TIER` 對應不變
- [x] 2.2 確認戰鬥失敗（`victory=false`）路徑 `expGained=0`（沿用既有「無獎勵」分支，僅欄位改名）
- [x] 2.3 `server/services/combat.service.ts` 的 `spawnWave`：新增參數接收「已決定的 archetype 索引陣列」（僅第一波使用）；wave index 0 時若呼叫端有提供，依序取用對應的 `ENEMY_ARCHETYPES[index]`，不再自行 roll；wave index >= 1 維持原本每個敵人位置各自 roll 一次的邏輯不變
- [x] 2.4 `server/services/combat.service.ts` 的 `resolve`：把 `context.firstWaveArchetypeIndices` 傳給第一波的 `spawnWave` 呼叫

## 3. Run 生命週期（結束、結算、敵人陣容決定）

- [x] 3.1 `server/services/adventure-run.service.ts` 的 `resolveCombat`：`run.expEarned + resolution.expGained` 取代原本的 `run.score + resolution.scoreGained`；組 `CombatContext` 時，`waveCount`/`enemyCountPerWave`/`firstWaveArchetypeIndices` 直接從 `nodeData`（節點生成時已決定）讀取，不再呼叫 `rollWaveCount`/`rollEnemyCount`（BOSS 沿用固定 1/1，一併從 `nodeData` 讀出）
- [x] 3.2 `server/services/adventure-run.service.ts` 的 `advanceFromExploring`：COMBAT/ELITE/STRONG_ELITE/BOSS 分支新增決定 `waveCount`/`enemyCountPerWave`（BOSS 固定 1/1，其餘沿用既有機率公式，呼叫時機從 `resolveCombat` 提前到這裡）與第一波敵人陣容（對每個敵人位置 roll 一次 archetype，用 `getStatMultipliers(enemyLevel, tier)` 算出顯示用 HP，取 archetype 的 `name`/`description`），存入 `currentNodeData.firstWaveEnemies`/`waveCount`/`enemyCountPerWave`
- [x] 3.3 `server/services/adventure-run.service.ts` 的 `advanceFromResolution`：`run.currentNodeType === NodeType.BOSS` 時，不檢查 `blessingPoints` 門檻，直接呼叫 `settleRun(run, AdventureEndReason.COMPLETED)` 並回傳；移除 `buildStageProgressionPatch` 呼叫與定義（連同其私有方法、`rollInRange` 的章節部分）
- [x] 3.4 `server/services/adventure-run.service.ts` 的 `selectBlessing`：因 3.3 已在 Boss 節點略過 BLESSING_SELECT，理論上不會再以 `currentNodeType===BOSS` 進入這裡；移除其中呼叫 `buildStageProgressionPatch` 的分支，保留一般（非 Boss）祝福選擇後 `stageNodeIndex + 1` 的行為
- [x] 3.5 `server/services/adventure-run.service.ts` 的 `settleRun`：新增 `endReason` 分流——`COMPLETED` 沿用既有邏輯（gold/gems 併入、run 背包轉入永久背包）；`DEAD`/`DISCONNECT` 時 `goldEarned`/`gemsEarned` 傳 0 給 `characterRepo.settleRunRewards`、不呼叫任何背包轉移（run 背包直接捨棄），並把原始 `run.goldEarned`/`run.gemsEarned`/`run.runInventory` 填入結算摘要的 `forfeitedGold`/`forfeitedGems`/`forfeitedItems`；擴充 `SettleResult`（`newLevel`/`unspentAttributePointsGained`，由呼叫 `characterRepo.settleRunRewards` 前後的 `level` 差計算；`items` 改存實際轉入的 `ItemInstance[]` 而非數量）；`expGained` 參數改傳 `run.expEarned`；把完整結算摘要寫入 `run.settlement`；額外傳入 `endReason` 給 `characterRepo.settleRunRewards`
- [x] 3.6 `server/services/adventure-run.service.ts`：`resolveCombat`（戰鬥失敗分支）、`advanceFromResolution`（Boss/COMPLETED 分支）、`getCurrentRun`（斷線逾時分支）在觸發 `settleRun` 後，把回傳的 `SettleResult` 一併回傳給各自的呼叫端（改變這三個方法的回傳型別，讓 API 層能取得結算摘要）
- [x] 3.7 `server/repositories/adventure-run.repository.ts` 的 `createRun`：改為讀取角色目前的 `nextChapterIndex` 設定 `run.chapterIndex`（呼叫端需先查詢角色，或由 service 層傳入），移除 `chapterStageCount` 的 roll 與欄位初始化
- [x] 3.8 `server/repositories/adventure-run.repository.ts` 的 `getById`/`getActiveByCharacterId` 讀取容錯：移除對 `chapterStageCount`/`stageIndexInChapter` 的容錯，新增 `expEarned ?? 0` 容錯（沿用既有「不做資料回填」策略，見 design.md Migration Plan——因決策為不相容既有 run，這裡容錯只需覆蓋型別完整性，不必保證舊 run 能繼續遊玩）
- [x] 3.9 `server/repositories/character.repository.ts` 的 `settleRunRewards`：新增 `endReason` 參數，只在 `endReason === AdventureEndReason.COMPLETED` 時把 `nextChapterIndex + 1`（同一 transaction 內）；讀取角色文件時對 `nextChapterIndex` 容錯 `?? 0`
- [x] 3.10 `server/repositories/character.repository.ts` 的 `prepareCharacterData`：新角色初始化 `nextChapterIndex: 0`

## 4. API

- [x] 4.1 `shared/schemas/api/adventure.schema.ts`：`advanceAdventureResponseSchema`、`startCombatResponseSchema` 新增可選的 `settlement`（`SettleSummary` 的 API schema，確認不含 `seed` 等敏感欄位，與 `stripSeed` 一致）
- [x] 4.2 `server/api/adventure/advance.post.ts`：`data` 新增 `settlement`（來自 3.6 的回傳值，僅在本次呼叫觸發結算時存在）
- [x] 4.3 `server/api/adventure/combat/start.post.ts`：確認戰鬥失敗導致的結算摘要同樣回傳（沿用 3.6 的變更）
- [x] 4.4 `server/api/adventure/current.get.ts`：確認斷線逾時自動結算的路徑也能把結算摘要回傳給前端（`getCurrentRun` 回傳型別需能表達「run 已結算」與摘要內容，而非單純回傳 `null`）

## 5. 前端

- [x] 5.1 `app/composables/useAdventureRun.ts`：新增 `lastSettlement` 狀態（比照 `lastCombatResult`/`lastEventResult` 模式）；`advance()`/`startCombat()`/`fetchCurrent()` 偵測回應中的 `settlement` 並存入；`AdventureRunView` 型別移除 `score`、新增 `expEarned`
- [x] 5.2 `app/pages/adventure.vue`：`!currentRun && lastSettlement` 時渲染結算頁——金幣/寶石/EXP 動畫、升級演繹、`unspentAttributePointsGained > 0` 時的屬性點提示文案；成功時列出 `items`（沿用 `describeItem`/`RARITY_COLOR` 的物品格子樣式）；失敗時額外顯示 `forfeitedGold`/`forfeitedGems`/`forfeitedItems`（以警示色標示「已作廢」），取代目前單純的「目前沒有進行中的冒險」空狀態；移除頂部「分數」顯示
- [x] 5.3 `app/pages/adventure.vue`：結算頁「返回首頁」按鈕清空 `lastSettlement` 並導頁
- [x] 5.4 `app/pages/adventure.vue`：COMBAT/ELITE/STRONG_ELITE/BOSS 節點的「遭遇敵人，準備戰鬥」區塊新增陣容清單——列出 `currentNodeData.firstWaveEnemies` 每隻敵人的名稱、描述、生命值；若 `waveCount > 1`，額外顯示一行固定提示（例如「偵測到後續增援，數量不明」），不揭露第二波內容
- [x] 5.5 `app/components/game/combatResultPanel.vue`：戰鬥結果面板的分數顯示改為 EXP
- [x] 5.6 `app/components/game/characterStage.vue`：CTA 文案呼叫簡化後的 `getStageDisplayName(chapterIndex)`（單一參數）

## 6. 測試與驗證

- [x] 6.1 `combat.service.test.ts`：`expGained` 相關斷言取代 `scoreGained`；BOSS/STRONG_ELITE/ELITE/NORMAL 的 EXP 遞增關係回歸測試；新增測試涵蓋「傳入 `firstWaveArchetypeIndices` 時第一波使用指定 archetype，不再隨機」
- [x] 6.2 `combat.test.ts`（`server/constants`）：`expForKill`/`TIER_EXP_MULTIPLIER` 取代 `scoreForKill`/`TIER_SCORE_MULTIPLIER` 的既有測試；`ENEMY_ARCHETYPES` 新增對 `description` 非空字串的斷言
- [x] 6.3 `adventure-run.service.test.ts`：新增/修改測試涵蓋：Boss 勝利 → `endReason=COMPLETED`；Boss 勝利且 `blessingPoints` 達門檻 → 略過 BLESSING_SELECT 直接結算；`settleRun` 回傳的 `SettleResult` 含 `newLevel`/`unspentAttributePointsGained`；`DEAD`/`DISCONNECT` 結算時 `goldEarned=0`/`items=[]`、`forfeitedGold`/`forfeitedGems`/`forfeitedItems` 反映原始累積值、角色 gold/gems 未增加、`nextChapterIndex` 未異動；`COMPLETED` 結算時角色 gold/gems 正常增加、`nextChapterIndex+1`；`createRun` 依角色 `nextChapterIndex` 設定 `run.chapterIndex`；`advanceFromExploring` 產生 COMBAT 節點時 `currentNodeData.firstWaveEnemies` 長度等於 `enemyCountPerWave`
- [x] 6.4 `character.repository.test.ts`（若存在，否則新增對應測試檔）：`settleRunRewards` 在 `endReason=COMPLETED` 時 `nextChapterIndex+1`，`DEAD`/`DISCONNECT` 時不變
- [x] 6.5 既有回歸測試（`difficulty.test.ts` 等未直接受影響的檔案）維持全綠
- [x] 6.6 手動驗證（瀏覽器）：
  - 推進到 Stage 最後一個節點擊敗 Boss，確認 run 立即結束並顯示結算頁（EXP 動畫、若升級則有升級演繹與屬性點提示、實際列出取得的物品）
  - 故意戰死，確認結算頁只增加 EXP、金幣/寶石/物品維持原樣未增加，並顯示「作廢」的數量/物品
  - 一般 COMBAT 節點在按下「開始戰鬥」前，確認能看到敵人名稱/描述/生命值；多波節點確認只顯示第一波、有「後續增援」提示但不洩漏內容
  - 下一次「開始冒險」的設施主題依前次是否 `COMPLETED` 正確切換或維持
