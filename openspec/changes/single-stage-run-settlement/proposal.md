## Why

`adventure-stage-progression`（尚未 archive，但程式碼已實作）把 run 設計成「章節（Chapter）→ 關卡（Stage）→ 節點」無限 roguelike 循環，只靠死亡/斷線結束，沒有「通關」結局；獎勵是抽象的 `score`，只在 run 結束時才 1:1 折算成角色 EXP。這個設計讓玩家難以感受到「一次遠征」的完整節奏，也讓 EXP 成長被延遲到 run 死亡才看得到。現在要把 run 改成「單一 Stage 制」：打完一個 Stage（含 Boss）就自然結束該次遠征、進入結算頁；戰鬥中擊敗敵人直接發放 EXP（而非抽象 score），結算頁明確演繹「這次遠征賺了多少、有沒有升級、升級後有沒有屬性點可分配」，強化每次 run 的完整感與成長回饋。

## What Changes

- **BREAKING**：run 的邊界從「無限章節循環」改為「一個 Stage（含 Boss）＝一次完整遠征」：Boss 戰勝利並離開其 RESOLUTION/BLESSING_SELECT 時，run 立即結算並以新的 `AdventureEndReason.COMPLETED` 結束（不再推進到下一個 Stage/Chapter，`buildStageProgressionPatch` 的章節內推進分支移除）
- **BREAKING**：移除 `AdventureRun.score`、`CombatResult.scoreGained`、`TIER_SCORE_MULTIPLIER`、`scoreForKill`；改為戰鬥擊敗敵人直接發放 `expGained`（`CombatResult.expGained`、`AdventureRun.expEarned` 累加），run 結算時把 `expEarned` 計入角色 EXP（取代原本「score 在結算時 1:1 折算 EXP」的間接機制）
- **BREAKING**：`AdventureRun` 移除 `chapterStageCount`/`stageIndexInChapter`（單 Stage 制下「章節內第幾關」不再有意義）；`chapterIndex`（設施主題）改為角色層級的持久狀態（`Character.nextChapterIndex`），只在 run 以 `COMPLETED` 結算時才 +1（死亡/斷線則保留原設施主題重試），新 run 建立時從角色目前的 `nextChapterIndex` 取值
- 新增「Run 結算摘要」：run 以任何原因結束時，把 `SettleResult`（金幣/寶石/物品/EXP/是否升級/新等級/新增可分配屬性點）寫入 `run.settlement`，並在觸發結算的那次 API 回應中一併回傳一次（比照既有 `lastCombatSummary` 只回傳一次的模式）
- **BREAKING**：冒險失敗（`endReason` 為 `DEAD`/`DISCONNECT`）時，run 期間累積的金幣/寶石/物品全部作廢、不併入角色資源或永久背包，只有 EXP 會保留；只有 `endReason = COMPLETED` 才把金幣/寶石/物品正常帶回。`SettleResult`/`run.settlement` 新增 `forfeitedGold`/`forfeitedGems`/`forfeitedItemsCount`，讓結算頁能明確顯示「這次其實賺了多少、但因為戰敗損失了」
- 新增冒險畫面的「結算頁」：顯示本次遠征實際保留的金幣/寶石/物品/EXP（失敗時另外顯示作廢的數量），EXP 增長以動畫呈現；若升級則演繹升級效果（等級數字跳動 + 特效），並在有新增 `unspentAttributePoints` 時提示玩家「有新的屬性點可分配」（沿用角色畫面既有的 `unspentAttributePoints` 顯示，不新增分配 UI）
- 移除冒險畫面與戰鬥結果面板上「分數」的顯示，改顯示本次戰鬥/整趟遠征獲得的 EXP
- 首頁「繼續冒險」CTA 文案改用設施名稱（不再帶「章節內關卡序號」後綴，因單 Stage 制下該序號恆為 1）
- 新增「戰鬥前顯示敵人陣容」：`advanceFromExploring` 決定 COMBAT/ELITE/STRONG_ELITE/BOSS 節點時，一併決定第一波敵人陣容（種類、名稱、描述、依 tier/等級計算後的生命值）並存入 `currentNodeData`；冒險畫面「遭遇敵人，準備戰鬥」區塊顯示這第一波的陣容，若還有後續波次則只提示「還有更多敵人增援」不揭露細節，維持多波戰鬥的驚喜感；`ENEMY_ARCHETYPES` 新增 `description` 欄位；`CombatContext`/`CombatResolver.resolve` 改為使用節點生成時已決定的第一波陣容（後續波次仍在戰鬥解算當下才 roll），避免玩家能看穿全部波次

## Capabilities

### Modified Capabilities
- `adventure-run-lifecycle`：run 結束條件新增「Boss 戰勝利＝ Stage 完成」路徑與 `AdventureEndReason.COMPLETED`（含更新角色 `nextChapterIndex` 決定下次遠征的設施主題）；Run 結算新增回傳一次性 `SettleResult` 摘要（EXP/升級/屬性點/失敗時的作廢金額）；失敗結算不再併入金幣/寶石/物品；首頁 CTA 文案調整
- `combat-engine`：戰鬥獎勵從 `scoreGained` 改為 `expGained`，移除 `TIER_SCORE_MULTIPLIER`；新增節點生成時決定第一波敵人陣容並可預覽

## Impact

- `shared/types/adventure.ts`：`AdventureRun` 移除 `score`/`chapterStageCount`/`stageIndexInChapter`，新增 `expEarned`、`settlement?: SettleSummary`；`CombatResult` 移除 `scoreGained`，新增 `expGained`；`AdventureEndReason` 新增 `COMPLETED`；`STAGE_CONFIG` 移除 `CHAPTER_STAGE_COUNT_MIN/MAX`；`CombatContext` 新增第一波敵人陣容欄位；`currentNodeData`（combat 分支）新增敵人陣容預覽型別
- `shared/types/character.ts`：`Character` 新增 `nextChapterIndex: number`
- `shared/schemas/firestore/adventure.schema.ts`、`shared/schemas/firestore/character.schema.ts`：同步上述欄位異動
- `server/constants/combat.ts`：`scoreForKill`/`TIER_SCORE_MULTIPLIER` 改為 `expForKill`/`TIER_EXP_MULTIPLIER`；`ENEMY_ARCHETYPES` 新增 `description`
- `server/services/adventure-run.service.ts`：`resolveCombat` 累加 `expEarned`（取代 `score`）；`advanceFromExploring` 新增決定第一波敵人陣容（archetype/HP）並存入 `currentNodeData`；`advanceFromResolution`/`selectBlessing` 的 Boss 分支改為呼叫 `settleRun(..., COMPLETED)`，移除章節推進分支；`settleRun` 依 `endReason` 決定是否套用金幣/寶石/物品獎勵，寫入 `run.settlement` 並在 `SettleResult` 新增 `newLevel`/`unspentAttributePointsGained`/`forfeitedGold`/`forfeitedGems`/`forfeitedItemsCount`
- `server/services/combat.service.ts`：`spawnWave` 第一波改吃 `context` 傳入的已決定陣容，不再自行 roll archetype（其餘波次不變）
- `server/repositories/adventure-run.repository.ts`：`createRun` 從角色目前 `nextChapterIndex` 取值，不再 roll `chapterStageCount`
- `server/repositories/character.repository.ts`：`settleRunRewards` 新增 `endReason` 參數，一併處理 `nextChapterIndex`（僅 `COMPLETED` 時 +1）與是否套用 gold/gems
- `server/api/adventure/advance.post.ts`、`server/api/adventure/combat/start.post.ts`、`server/api/adventure/blessing/select.post.ts`：回應 schema 新增可選的 `settlement` 欄位
- `app/composables/useAdventureRun.ts`：新增 `lastSettlement` 狀態；`AdventureRunView` 同步型別異動
- `app/pages/adventure.vue`：新增結算頁區塊（EXP 動畫、升級演繹、屬性點提示、失敗時的作廢金額顯示）；移除分數顯示；COMBAT 節點新增敵人陣容預覽 UI
- `app/components/game/combatResultPanel.vue`：分數改為 EXP
- `app/components/game/characterStage.vue`：CTA 文案調整
- 依賴既有 `character-progression`（`settleRunRewards` 升級/屬性點計算沿用既有公式，不變更升級所需 EXP 或每級屬性點數）
- **不在範圍內**：`leaderboard`/`quest` 相關 spec 中對 `score`（`LeaderboardEntry.score`、`QuestType.MAX_SCORE`）的定義沿用不動；兩者目前皆僅有 `Noop*` stub 尚未真正實作，本 change 不修改其型別，`LeaderboardUpdater.updateIfBetter` 暫以 `expEarned` 作為傳入值（沿用既有介面簽章，不更名），真正的排行榜/任務指標重新設計留待各自專屬 change
