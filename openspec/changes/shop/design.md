## Context

依 `openspec/analysis/context.yaml` 的 CTX-CON-005，每日重置邊界固定在 UTC+0 00:00；依 `02_技術棧與架構規劃.md` 的建議，採「懶生成」而非 cron，避免額外排程基礎設施。金幣商店為 per-account（`shopsGold/{accountId}_{date}`），紅寶石商店為全服共享（`shopsGems/{date}`）。

## Goals / Non-Goals

**Goals:**
- 商店商品的生成具決定性（同一天、同一帳號永遠 roll 出同一組商品），避免「刷新刷到想要」
- 購買為原子操作：檢查未售出 + 扣款 + 標記售出 + 發放物品，四步驟中任一失敗都不留下部分狀態

**Non-Goals:**
- 不做商店歷史保留策略的最終決定（NFR-014 仍是 needs-review，本 change 先不刪除歷史文件，留給之後的資料保留 change 處理）

> 更新（2026-08-27）：補血藥水已改為一般消耗品物品（type=POTION），與裝備一樣可透過 `items-and-equipment` change 的 `ItemService.generateItemInstance` 生成並上架，商店端不需要任何藥水專屬邏輯——原本標記為 Non-Goal 的「補血藥水商店入口」已隨此設計變更自然涵蓋於一般商品購買流程中。

## Decisions

- **懶生成時機：GET 端點內判斷**：`GET /api/shop/gold`（或 `/gems`）先讀當日文件，不存在或 `date` 不等於今天（UTC+0）則呼叫 `ShopService.regenerate`，用 Firestore `create`（非 `set` 覆蓋）避免併發重複生成時互相覆蓋；`create` 失敗（文件已存在，代表另一個併發請求贏了）則直接改讀該文件，不視為錯誤。
- **決定性 seed**：金幣商店 `seed = hash(date + accountId)`，紅寶石商店 `seed = hash(date)`，兩者都呼叫同一個 `RngService`（見 `adventure-run-core` change 的 `random(seed, index)`），確保「決定性 RNG」的實作只有一份。
- **購買交易用 Firestore `runTransaction`**：同一 transaction 內讀 shop 文件確認 slot 未售出、讀 character 確認資源足夠，然後一次寫入 shop（標記 sold）與 character（扣款），並呼叫 `InventoryService`/`EquipmentService`（來自 `items-and-equipment` change）完成物品交付。

## Risks / Trade-offs

- [風險] 懶生成的 `create`-then-fallback-read 模式在極端併發下仍可能有短暫的重試延遲 → [可接受]：使用者體感為多一次讀取，不影響正確性
- [風險] 商店購買橫跨 3 個 aggregate（Shop/Character/Inventory）的 transaction，若 Firestore transaction 大小/讀寫數量限制被觸及（不太可能，皆為單文件級操作）→ [緩解]：目前設計每個 aggregate 各自一份文件，讀寫數量固定為 3，遠低於 Firestore transaction 上限
