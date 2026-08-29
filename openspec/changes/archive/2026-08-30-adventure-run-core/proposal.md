## Why

冒險 Run 是本遊戲的核心迴圈：玩家所有的資源累積、分數、裝備掉落都發生在這裡。目前完全沒有 `adventureRuns` 資料層、狀態機、節點生成或 RNG 服務。沒有這一塊，`combat-engine` 與 `events-and-blessings` change 都無處掛載（它們都是 run 進行中才會發生的子流程）。

## What Changes

- 新增決定性 RNG 服務：`random(seed, rngIndex)`，且 rngIndex 單調遞增、僅 server 端使用
- 新增 Run 狀態機：INIT/EXPLORING/COMBAT/EVENT/BLESSING_SELECT/SHOP/RESOLUTION/ENDED 與合法轉移
- 新增節點生成邏輯：保底 Rest（距上次 Rest >= 4 step）> 固定精英節奏（step%9/%5）> 隨機權重
- 新增敵人難度曲線：`enemyLevel = 1 + floor(step/2)`、基礎與 Elite/Strong Elite 倍率、多波/多敵機率
- 新增 API：`POST /api/adventure/start`、`GET /api/adventure/current`、`POST /api/adventure/advance`、`POST /api/adventure/end`、`POST /api/adventure/rest/heal`
- 新增斷線重連（15 分鐘窗口）與逾時自動結束（DISCONNECT）
- 新增 run 結算：earnedGold/earnedGems 併入角色、run 背包裝備轉入永久背包、觸發排行榜與任務/成就進度更新
- 新增休息節點使用藥水：消耗玩家持有的 POTION 物品實體（永久背包或 run 背包皆可），依其稀有度回復生命值
- 新增首頁「開始冒險」CTA（`characterStage.vue`）：依是否有進行中的 run 切換為「開始冒險」／「繼續冒險（第 N 關）」
- 新增最基本的冒險進行畫面（`app/pages/adventure.vue`）：顯示目前節點/step、可推進動作、Rest 節點用藥 UI；COMBAT/EVENT 節點僅顯示「待處理」佔位（對應本 change 的 stub 實作），實際畫面留給 `combat-engine`/`events-and-blessings` 各自補上
- **不包含**：戰鬥模擬本身（`combat-engine` change）、事件/轉盤/祝福選擇（`events-and-blessings` change）——本 change 提供狀態機骨架與這些子流程的掛載點（呼叫介面），實際計算邏輯由後兩個 change 提供

> 更新（2026-08-27）：稽核發現 `POST /api/adventure/rest/heal`（UC-025）先前未被任何 change 認領，屬遺漏。同時補血藥水已改為一般消耗品物品（不再是角色固定欄位），使用藥水改為「消耗一個 POTION 物品實體」，與本 change 已有的 run 背包/永久背包存取模式一致，故一併補進本 change（見 `openspec/analysis/traceability.yaml` 的 gap 紀錄）。
>
> 更新（2026-08-29）：先前規劃只涵蓋後端，經討論後確認本 change 也需涵蓋「開始冒險」的最小前端（首頁 CTA + 最基本的節點推進畫面），COMBAT/EVENT 的實際畫面仍留給對應 change。

## Capabilities

### New Capabilities
- `deterministic-rng`：seed+rngIndex 的決定性亂數服務，供本 change 與 `combat-engine`/`events-and-blessings` 共用
- `adventure-run-lifecycle`：Run 的建立、狀態機推進、節點生成、斷線重連、結算

## Impact

- 新增 `server/services/rng.service.ts`：`random(seed, rngIndex)`、`nextIndex(runId)`（讀取並遞增 Firestore 內的 `rngIndex`，必須是每次消耗後立即持久化，見 RULE-014）
- 新增 `server/repositories/adventure-run.repository.ts`：`adventureRuns/{runId}` 讀寫
- 新增 `server/services/adventure-run.service.ts`：狀態機推進、節點生成、結算，呼叫 `combat-engine`/`events-and-blessings` change 提供的服務（以介面依賴，實作時序上可先用 stub）
- 新增 `server/constants/difficulty.ts`：敵人等級/倍率/wave 機率公式（依 `10_戰鬥模型.md`）
- 新增 `server/api/adventure/start.post.ts`、`current.get.ts`、`advance.post.ts`、`end.post.ts`、`rest/heal.post.ts`
- 新增 `app/pages/adventure.vue`：目前節點顯示與推進
- 新增 `app/composables/useAdventureRun.ts`：封裝 `/api/adventure/*` 呼叫（沿用 `useCharacter`/`useInventory` 既有 composable 模式）
- 修改 `app/components/game/characterStage.vue`：新增「開始冒險」CTA
- 依賴 `character-progression`（角色 HP/資源）、`items-and-equipment`（POTION 物品的生成/背包存取，`ItemService`/`InventoryService`）、`leaderboard`（結算更新排行榜）、`quests-and-achievements`（結算觸發 incrementProgress）
- 對應分析：FR-045~057、FR-060、FR-075~080、UC-020~023、UC-025、UC-026、UC-031~032、AGG-009/ENT-003/ENT-010（domain-model.yaml）、API-021~023/027/028（api-model.yaml）、DATA-004/005（data-model.yaml）、RULE-002/006/013/014/017/018/020、NFR-001/006

## 實作順序建議

由於 `combat-engine` 與 `events-and-blessings` 依賴本 change 的狀態機與 RNG 服務，建議先完成本 change 的 `deterministic-rng` capability 與 run 的建立/查詢/結算骨架，`advance` 端點在 COMBAT/EVENT 節點先回傳「待處理」狀態，待另外兩個 change 完成後再串接實際計算。
