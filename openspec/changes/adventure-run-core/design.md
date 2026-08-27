## Context

`AdventureRun`（AGG-009，見 domain-model.yaml）是整個系統變動最頻繁、一致性要求最高的聚合：狀態機、目前節點、run 背包、生效中的 RunModifier、rngIndex 都必須在同一次 checkpoint 呼叫中原子地一起推進（CTX-CON-002：禁止 tick-based，只能事件驅動）。這是三個相關 change（本 change、`combat-engine`、`events-and-blessings`）共用的核心資料結構，必須先把邊界定清楚才能平行推進。

## Goals / Non-Goals

**Goals:**
- 一次 API 呼叫 = 一次 Firestore 讀 + 一次計算 + 一次寫回（NFR-001），不允許 per-round/per-tick 往返
- RNG 消耗必須嚴格單調且立即持久化（RULE-014），確保可稽核、不可預測
- 斷線重連窗口精確為 15 分鐘（NFR-006）

**Non-Goals:**
- 不在本 change 內實作戰鬥傷害/暴擊/閃避計算（`combat-engine`）
- 不在本 change 內實作事件模板/轉盤/祝福候選生成（`events-and-blessings`）
- 不解決 EXP 從何觸發的問題（分析階段已標記：來源文件未明確定義，本 change 假設「run 結算時依本次 run 分數/擊殺數授予 EXP」，若之後與相關人確認不同規則，回頭調整 `AdventureRunService.settleRun`）

## Decisions

- **狀態機推進與子流程呼叫用「策略介面」解耦**：`AdventureRunService.advance(runId)` 決定下一個 node type 後，若是 COMBAT 呼叫 `CombatEngine.resolve(run, enemyConfig)`（`combat-engine` change 提供），若是 EVENT 呼叫 `EventEngine.resolve(run)`（`events-and-blessings` change 提供）。本 change 先定義這兩個介面的 TypeScript type（放在 `shared/types/adventure.ts` 或新增 `server/services/interfaces/`），讓三個 change 可以平行開發、各自 mock 對方。
- **RNG 服務為單一真相來源**：`RngService.next(runId)` 內部讀取 `adventureRuns/{runId}.rngIndex`、計算 `random(seed, rngIndex)`、寫回 `rngIndex + 1`，全部包在同一次 Firestore transaction 內，任何需要隨機性的呼叫方（節點生成、combat、event）都必須透過這個服務，不得自行維護 index。
- **單一進行中 run 的檢查（RULE-002）**：`startAdventure` 在建立前先查詢該 characterId 是否有 `state != ENDED` 的 run；用 Firestore 查詢（`where('characterId','==',...).where('state','!=','ENDED')`）而非額外維護一個「目前 run id」欄位在 character 文件上，避免兩份資料的同步問題。
- **15 分鐘重連窗口**：`lastActivityAt` 於每次成功的 advance/combat/event/potion 操作更新；`GET /api/adventure/current` 檢查 `now - lastActivityAt > 15min` 時，先觸發結算（`endReason = DISCONNECT`）再回傳「已結束」，而不是回傳過期的 run 狀態讓前端自己判斷。

- **永久背包已滿時的結算行為（補齊分析階段的 RULE-006 未定義項目）**：`openspec/analysis/domain-model.yaml` 的 RULE-006 明確標註「超過上限的物品無法轉入，行為未定義，需另行補充」。本 change 做出明確決策：無法轉入的裝備 SHALL NOT 被靜默遺失，也 SHALL NOT 允許背包超過 500 格；改為在結算回應中明確列出「未能帶出的物品」清單，讓玩家知情（未來若要支援「事後回收」可再擴充，非本 change 範圍）。
- **使用藥水改為消耗一般物品，不再更新 Character 文件（2026-08-27 隨補血藥水改設計一併補上）**：`POST /api/adventure/rest/heal` 改為要求 `itemId` 參數，`AdventureRunService.useHealingItem(runId, itemId)` 依序：(1) 檢查 `run.state` 對應 Rest 節點；(2) 依 itemId 分別到 `run.runInventory` 與（透過 `items-and-equipment` change 的 `InventoryService`）永久背包尋找該實體，確認存在且 `type = POTION`；(3) 依其 `rolledStats.healPercent` 計算回復量並更新 `run.playerHp`（不超過 `playerHpMax`）；(4) 從找到的來源（run 背包或永久背包）移除該實體。整個操作不再觸碰 `characters/{accountId}` 文件（舊設計需要更新 `healingPotion.coolDownUntil`，新設計不需要），跨 aggregate 範圍縮小為 AGG-009 與（視物品位置）AGG-003。

## Risks / Trade-offs

- [風險] 三個 change（本 change/combat-engine/events-and-blessings）之間用介面解耦，若介面設計不夠好會導致之後大改 → [緩解] 介面故意設計得很薄（輸入 run 快照 + 上下文，輸出「結果 + 需要套用的狀態變更」），符合 checkpoint-driven 的單次讀寫模型，改動空間集中在各自的計算邏輯內部
- [風險] `where('state','!=','ENDED')` 需要 Firestore 複合索引 → [緩解] 於 `firestore.indexes.json` 補上對應索引，並在 tasks 中列為明確項目
- [風險] EXP 觸發規則的假設可能不符合最終需求 → [緩解] 已在 Non-Goals 中明確標注為待確認假設，實作時集中在 `settleRun` 單一函式，改動範圍可控
- [風險] 使用藥水時需要「先查 run 背包、找不到再查永久背包」兩次可能的讀取 → [可接受]：run 背包最多 50 筆、永久背包用 itemId 直接查找（非全表掃描），成本可忽略；且此邏輯只在玩家於 Rest 節點主動使用藥水時觸發，頻率遠低於戰鬥/事件

## Migration Plan

- `adventureRuns` 為新 collection，無既有資料
