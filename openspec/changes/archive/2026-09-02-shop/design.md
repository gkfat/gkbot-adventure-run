## Context

依 `openspec/analysis/context.yaml` 的 CTX-CON-005，每日重置邊界固定在 UTC+0 00:00；依 `02_技術棧與架構規劃.md` 的建議，採「懶生成」而非 cron，避免額外排程基礎設施。金幣商店與紅寶石商店皆為 **per-character**（`shopsGold/{characterId}_{date}`、`shopsGems/{characterId}_{date}`）——`gold`/`gems` 本身就是 `Character` 的欄位（每帳號最多 3 個角色、各自獨立持有貨幣），商店與購買自然也應該以角色為單位，不跨角色共用。

> 更新（2026-09-01）：原設計將金幣商店定為 per-account、紅寶石商店定為全服共享；因為 `gold`/`gems` 實際上屬於 `Character` 而非 `Account`，兩者統一改為 per-character，避免「共用商店但各自扣不同角色的錢」的不一致。連帶地，商店端點也從原本規劃的 `GET /api/shop/gold` 改為掛在角色路徑下（見下方 Decisions），比照既有 `equip`/`unequip`/`inventory` 端點的慣例。

## Goals / Non-Goals

**Goals:**
- 同一天（UTC+0）、同一角色的商店內容不變，避免「刷新刷到想要」——靠 Firestore 文件 create-once 持久化保證，不需要決定性 RNG（見下方 Decisions）
- 購買為原子操作：檢查未售出 + 扣款 + 標記售出 + 發放物品，四步驟中任一失敗都不留下部分狀態

**Non-Goals:**
- 不做商店歷史保留策略的最終決定（NFR-014 仍是 needs-review，本 change 先不刪除歷史文件，留給之後的資料保留 change 處理）

> 更新（2026-08-27）：補血藥水已改為一般消耗品物品（type=POTION），與裝備一樣可透過既有 `item-generation` capability 的 `generateItemInstance` 生成並上架，商店端不需要任何藥水專屬邏輯——原本標記為 Non-Goal 的「補血藥水商店入口」已隨此設計變更自然涵蓋於一般商品購買流程中。

## Decisions

- **端點掛在角色路徑下**：`GET /api/character/{characterId}/shop/gold`、`GET /api/character/{characterId}/shop/gems`、`POST /api/character/{characterId}/shop/purchase`——比照既有 `equip`/`unequip`/`inventory` 端點的路徑慣例（`characterId` 走路徑參數而非 request body），purchase 的 request body 因此維持原本 `shopType`/`slotId`/`destination`/`replaceSlot` 四個欄位即可，不需要額外加 `characterId`。
- **懶生成時機：GET 端點內判斷**：GET 端點先讀當日文件（`{characterId}_{date}`），不存在或 `date` 不等於今天（UTC+0）則呼叫 `ShopService.regenerate`，用 Firestore `create`（非 `set` 覆蓋）避免併發重複生成時互相覆蓋；`create` 失敗（文件已存在，代表另一個併發請求贏了）則直接改讀該文件，不視為錯誤。
- **商品生成不使用決定性 RNG**：`deterministic-rng` capability（`RngService`/`random(seed, index)`）的適用範圍限定在單一 adventure run 內（節點生成/戰鬥/事件），商店不屬於這個範圍。商店商品沿用 `item.service.ts` 既有的 `generateItemInstance`（內部使用 `Math.random()`），「同一天商品不變」單純靠 Firestore 文件 create-once 後的持久化保證——一旦生成就寫入 `shopsGold`/`shopsGems` 文件，之後同一天的查詢都是讀文件、不重新 roll，因此不需要、也不應該讓商店去呼叫 `RngService`。
- **角色刪除時一併清理商店文件**：懶銷毀（下一則決策）只在「該角色再次觸發懶生成」時才會清舊文件；角色被刪除後不會再有任何請求觸發懶生成，殘留的 `shopsGold`/`shopsGems` 文件會變成永久孤兒。`CharacterService.deleteCharacter` 因此額外呼叫 `ShopService.deleteShopsForCharacter(characterId)`，best-effort 刪除該角色今天/昨天的商店文件（跟懶銷毀同一套「只清已知的兩個日期」容忍度，不做全域查詢刪除所有歷史文件）。
- **懶銷毀，兩個商店一致處理**：`shopsGold`/`shopsGems` 皆為 per-character、每角色每天一份，會隨角色數 × 活躍天數線性累積；在懶生成觸發「生成新一天商店」的同一次呼叫中，best-effort 刪除「已知的前一天」文件（`{characterId}_{昨天日期}`，找不到就略過，不視為錯誤）——沿用「懶生成、避免額外排程基礎設施」的既有原則，不引入 Firestore TTL 設定或 cron。玩家連續多天未上線時，中間的舊文件不會被清除，但可接受（絕對數量仍以「活躍天數」為界，非無限累積）。
- **購買交易用單一 Firestore `runTransaction`，`ShopService` 內直接讀寫，不透過 `InventoryService`**：Firestore Admin SDK 不支援巢狀 transaction——若 `purchaseItem` 呼叫一個內部自己開 `runTransaction` 的 `InventoryService` 方法，該呼叫會變成獨立於外層交易之外提交，破壞「四步驟任一失敗都不留部分狀態」的原子性承諾。因此 `purchaseItem` 比照 `EquipmentService.equipItem` 現有的作法：在同一個 `this.db.runTransaction` 內，直接用 `tx.get`/`tx.set`/`tx.update` 操作 `shopsGold`/`shopsGems`、`characters`、`items`、`inventories` 四個 collection，不呼叫 `InventoryService`/`InventoryRepository`。
  - transaction 內讀 shop 文件確認 slot 未售出、讀 character 確認資源足夠，然後一次寫入 shop（標記 sold）與 character（扣款），並交付商店文件裡**已經生成好**的那個 `ItemInstance`（不可重新呼叫 `generateItemInstance`／現有的 `InventoryService.grantItem`，那個方法內部會重新 roll 一個新物品，導致玩家買到的物品跟商店列表上看到、付費當下的不是同一件）。
  - **兩種 destination 都要**把該 `ItemInstance` 寫入 `items/{itemId}`（`characterId` 設為該角色）並把 `itemId` 加入 `inventories.items` 參照（讀出現有 `inventories` 文件、检查 500 格上限、`tx.set` 寫回累加後的陣列——不存在則視為空陣列）；背包已達 500 格上限（`RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX`）則整個 transaction 拋出例外中止，不留部分狀態。這點兩種 destination 一致——比對現有 `equipItem`/`unequipItem` 實作與 `app/pages/inventory.vue` 的呈現邏輯（背包格狀清單會列出所有 `inventories.items`，已裝備的物品仍在清單中、只是疊加 `pixel-slot--equipped` 樣式，並未被移除），確認「物品無論是否裝備中，都必須留在 `inventories.items`」是既有慣例，`destination = EQUIP` 不該是特例、繞過 `inventories`。
  - `destination = EQUIP` 在寫入 `items`/`inventories` 之後，額外在同一 transaction 內寫入 `characters.equipment[slot]`，比照 `EquipmentService.equipItem` 現有的槽位替換規則（若目標槽位已有裝備，回傳 `unequipped`，`unequipped` 物品本身不受影響，繼續留在 `inventories.items`）。

## Risks / Trade-offs

- [風險] 懶生成的 `create`-then-fallback-read 模式在極端併發下仍可能有短暫的重試延遲 → [可接受]：使用者體感為多一次讀取，不影響正確性
- [風險] 商店購買橫跨 3 個 aggregate（Shop/Character/Inventory）的 transaction，若 Firestore transaction 大小/讀寫數量限制被觸及（不太可能，皆為單文件級操作）→ [緩解]：目前設計每個 aggregate 各自一份文件，讀寫數量固定為 3，遠低於 Firestore transaction 上限
- [風險] 懶銷毀只清「已知的前一天」文件，連續多天未上線的角色會累積多份舊文件 → [可接受]：絕對數量仍以「該角色活躍天數」為界，非無限成長；若之後量測發現有問題，可再疊加 Firestore TTL 當保底
