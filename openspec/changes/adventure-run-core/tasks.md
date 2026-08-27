## 1. 決定性 RNG

- [ ] 1.1 新增 `server/services/rng.service.ts`：`random(seed, index)` 純函數（例如 mulberry32/xorshift 之類的可重現演算法）
- [ ] 1.2 `RngService.next(runId)`：transaction 內讀取並遞增 `adventureRuns/{runId}.rngIndex`
- [ ] 1.3 單元測試：同一 seed+index 永遠回傳相同值；index 嚴格遞增

## 2. 共用型別與介面（供 combat-engine / events-and-blessings 對接）

- [ ] 2.1 於 `shared/types/adventure.ts` 定義 `CombatResolver`、`EventResolver` 介面型別
- [ ] 2.2 定義 `RunModifier`（Blessing/Curse）的共用型別（若尚未存在於既有 `shared/types`）

## 3. Repository / 難度曲線常數

- [ ] 3.1 新增 `server/repositories/adventure-run.repository.ts`
- [ ] 3.2 新增 `server/constants/difficulty.ts`：`enemyLevel`、hp/atk/def 倍率、Elite/Strong Elite 倍率、wave/enemy 機率公式（依 `10_戰鬥模型.md`）

## 4. Service：狀態機與節點生成

- [ ] 4.1 新增 `server/services/adventure-run.service.ts`：`startRun`、`getCurrentRun`（含逾時偵測與自動結束）、`advance`
- [ ] 4.2 節點生成邏輯：保底 Rest > 固定精英節奏 > 隨機權重
- [ ] 4.3 `advance` 依決定的節點類型呼叫對應介面（COMBAT → `CombatResolver`、EVENT → `EventResolver`；本 change 先提供 stub 實作，待其他 change 完成後替換）

## 5. Service：結算

- [ ] 5.1 `settleRun(runId, endReason)`：併入 gold/gems（clamp）、轉移 run 背包內剩餘物品（裝備與未使用藥水）到永久背包（含滿倉時的明確標記）、呼叫 `LeaderboardService.updateIfBetter`、呼叫 `QuestService`/`AchievementService` 的 `incrementProgress`
- [ ] 5.2 EXP 授予邏輯（假設：依本次 run 分數/擊殺數，見 design.md 的 Non-Goals 假設說明）

## 6. Service：使用藥水

- [ ] 6.1 `AdventureRunService.useHealingItem(runId, itemId)`：檢查 run.state 對應 Rest 節點
- [ ] 6.2 依 itemId 依序查找 run 背包（`run.runInventory`）與永久背包（呼叫 `items-and-equipment` change 的 `InventoryService.findItem`），找到後確認 `type = POTION`
- [ ] 6.3 依 `rolledStats.healPercent` 計算回復量並更新 `run.playerHp`（clamp 於 `playerHpMax`），並從找到的來源移除該物品實體

## 7. API

- [ ] 7.1 新增 `server/api/adventure/start.post.ts`
- [ ] 7.2 新增 `server/api/adventure/current.get.ts`
- [ ] 7.3 新增 `server/api/adventure/advance.post.ts`
- [ ] 7.4 新增 `server/api/adventure/end.post.ts`
- [ ] 7.5 新增 `server/api/adventure/rest/heal.post.ts`（驗證 request body 含 `itemId`）

## 8. Firestore 索引

- [ ] 8.1 於 `firestore.indexes.json` 新增 `adventureRuns` 的 `characterId + state` 複合索引

## 9. 文件與驗證

- [ ] 9.1 於 `server/utils/openapi.ts` 註冊 5 個新路徑，並更新 `shared/schemas/api/adventure.schema.ts` 的 `restHealResponseSchema` 對應請求（新增 `restHealRequestSchema: { itemId: string }`）
- [ ] 9.2 執行 `pnpm nuxt typecheck`
- [ ] 9.3 手動驗證：開始 run → 重複開始被拒 → 推進節點的優先序（保底/精英/隨機）→ 模擬逾時觸發 DISCONNECT → 結算後角色資源/背包/排行榜/任務進度皆正確更新
- [ ] 9.4 手動驗證使用藥水：分別測試「使用永久背包的藥水」「使用 run 背包掉落的藥水」「非 Rest 節點使用被拒」「itemId 不存在或非 POTION 被拒」
