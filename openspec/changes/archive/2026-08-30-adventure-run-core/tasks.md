## 1. 決定性 RNG

- [x] 1.1 新增 `server/services/rng.service.ts`：`random(seed, index)` 純函數（例如 mulberry32/xorshift 之類的可重現演算法）
- [x] 1.2 `RngService.next(runId)`：transaction 內讀取並遞增 `adventureRuns/{runId}.rngIndex`
- [x] 1.3 單元測試：同一 seed+index 永遠回傳相同值；index 嚴格遞增

## 2. 共用型別與介面（供 combat-engine / events-and-blessings 對接）

- [x] 2.1 於 `shared/types/adventure.ts` 定義 `CombatResolver`、`EventResolver` 介面型別
- [x] 2.2 定義 `RunModifier`（Blessing/Curse）的共用型別（若尚未存在於既有 `shared/types`）

## 3. Repository / 難度曲線常數

- [x] 3.1 新增 `server/repositories/adventure-run.repository.ts`
- [x] 3.2 新增 `server/constants/difficulty.ts`：`enemyLevel`、hp/atk/def 倍率、Elite/Strong Elite 倍率、wave/enemy 機率公式（依 `10_戰鬥模型.md`）

## 4. Service：狀態機與節點生成

- [x] 4.1 新增 `server/services/adventure-run.service.ts`：`startRun`、`getCurrentRun`（含逾時偵測與自動結束）、`advance`
- [x] 4.2 節點生成邏輯：保底 Rest > 固定精英節奏 > 隨機權重
- [x] 4.3 `advance` 依決定的節點類型呼叫對應介面（COMBAT → `CombatResolver`、EVENT → `EventResolver`；本 change 先提供 stub 實作，待其他 change 完成後替換）— 實作時發現 proposal.md 的「實作順序建議」實際上是指 COMBAT/EVENT 節點停在該狀態、回傳待處理，不在本 change 內呼叫 resolver，故未實例化 stub resolver 類別；`advance()` 對 COMBAT/EVENT 狀態呼叫會明確拋出「尚未實作」錯誤

## 5. Service：結算

- [x] 5.1 `settleRun(runId, endReason)`：併入 gold/gems（clamp）、轉移 run 背包內剩餘物品（裝備與未使用藥水）到永久背包（含滿倉時的明確標記）、呼叫 `LeaderboardUpdater.updateIfBetter`／`ProgressTracker.incrementProgress`（no-op stub，見 design.md）
- [x] 5.2 EXP 授予邏輯（假設：expGained = run.score；升級發放 1 點 unspentAttributePoints，見 design.md 的 Non-Goals 假設說明）

## 6. Service：使用藥水

- [x] 6.1 `AdventureRunService.useHealingItem(runId, itemId)`：檢查 run.state 對應 Rest 節點
- [x] 6.2 依 itemId 依序查找 run 背包（`run.runInventory`）與永久背包（`ItemRepository.getById` + 所有權檢查），找到後確認 `type = POTION`
- [x] 6.3 依 `rolledStats.healPercent` 計算回復量並更新 `run.playerHp`（clamp 於 `playerHpMax`），並從找到的來源移除該物品實體

## 7. API

- [x] 7.1 新增 `server/api/adventure/start.post.ts`
- [x] 7.2 新增 `server/api/adventure/current.get.ts`
- [x] 7.3 新增 `server/api/adventure/advance.post.ts`
- [x] 7.4 新增 `server/api/adventure/end.post.ts`
- [x] 7.5 新增 `server/api/adventure/rest/heal.post.ts`（驗證 request body 含 `itemId`）— 實作時發現這 5 個端點都沒有 `{characterId}` path 片段（不同於 `/api/character/{characterId}/...`），帳號可擁有多角色，故補上 `characterId` 到各自的 request body/query schema（`startAdventureRequestSchema`/`advanceAdventureRequestSchema`/`endAdventureRequestSchema`/`getCurrentAdventureQuerySchema`/`restHealRequestSchema`）
- [x] 7.6（新增）修正 `startAdventureResponseSchema`／`getCurrentAdventureResponseSchema` 會外洩 `seed` 欄位的問題（違反 deterministic-rng spec 的「seed 不透過 API 回應暴露」SHALL NOT），新增 `publicAdventureRunSchema`（`adventureRunSchema.omit({ seed: true })`）供所有回傳 run 資料的端點使用

## 8. Firestore 索引

- [x] 8.1 於 `firestore.indexes.json` 新增 `adventureRuns` 的 `characterId + state` 複合索引

## 9. 文件與驗證

- [x] 9.1 於 `server/utils/openapi.ts` 註冊 5 個新路徑的 request body/query，並更新 `shared/schemas/api/adventure.schema.ts` 的 `restHealRequestSchema`（新增 `characterId`；`itemId` 原本就有）
- [x] 9.2 執行 `pnpm nuxi typecheck` — 通過（僅剩 `systemBtn.vue`/`useApi.ts` 兩處與本 change 無關的既有型別錯誤，未新增任何錯誤）
- [x] 9.3 手動驗證：透過瀏覽器實際登入跑過「開始 run → 推進 → 節點決定（實測抽到 COMBAT 佔位 x2、手動改測 REST）→ RESOLUTION → 結束冒險結算」全流程，首頁 CTA 正確依 run 狀態切換。過程中發現並修正 3 個真的 bug：`SystemBtn` 綠底綠字看不到、Firestore 複合索引未部署、`seed` 外洩修復本身在 strict schema 下反而讓 `/api/adventure/current` 500 崩潰（已修正為 `stripSeed()` 顯式移除欄位再 parse）。**未實測**：重複開始 409（僅單元測試覆蓋）、逾時觸發 DISCONNECT（需等待 15 分鐘視窗，僅單元測試覆蓋 getCurrentRun 的逾時判斷邏輯）、排行榜/任務進度更新（目前是 no-op stub，無實際效果可驗證）
- [x] 9.4 手動驗證使用藥水：實測「使用 run 背包掉落的藥水」成功（HP 依 healPercent 正確回復、物品正確移除）。**未實測**：「使用永久背包的藥水」「非 Rest 節點使用被拒」「itemId 不存在或非 POTION 被拒」——這三者由 `adventure-run.service.test.ts` 的單元測試覆蓋，未額外手動驗證

## 10. 前端

- [x] 10.1 新增 `app/composables/useAdventureRun.ts`：封裝 start/current/advance/end/rest heal 五個 API
- [x] 10.2 `characterStage.vue` 新增「開始冒險」CTA：掛載時查詢 `GET /api/adventure/current` 判斷是否有進行中 run，依結果切換文字「開始冒險」／「繼續冒險（第 N 關）」
- [x] 10.3 新增 `app/pages/adventure.vue`：顯示目前 run 的 state/step/節點類型，非 COMBAT/EVENT 節點提供對應推進操作；COMBAT/EVENT/BLESSING_SELECT 節點顯示佔位文字
- [x] 10.4 `adventure.vue` 內 Rest 節點提供藥水選擇 UI，呼叫 `POST /api/adventure/rest/heal`
- [x] 10.5 手動驗證：使用者授權瀏覽器權限並完成登入後，實測「首頁點開始冒險 → 畫面推進 → COMBAT 佔位 → REST 用藥 → 結束休息 → 結束冒險結算 → 首頁 CTA 變回開始冒險」全流程成功。**未實測**：DISCONNECT/死亡結算後 CTA 變化（DISCONNECT 需等 15 分鐘視窗，死亡結算需 combat-engine 完成才能觸發）
