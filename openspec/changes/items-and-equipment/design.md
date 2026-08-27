## Context

`ItemTemplate` 是 repo 內常數（`CTX-CON-001`：不落 Firestore，避免每個冒險 step 都查資料庫，見 NFR-005）。`ItemInstance` 則是 Firestore 內的 embedded 資料（存在於 `inventories.items[]`、之後的 `adventureRuns.runInventory[]`、`shopsGold/shopsGems` 的 slot 內），本 change 只負責「永久背包」這一份，run 背包留給 `adventure-run-core` change。

裝備（equip/unequip）是本專案第一個真正跨 aggregate 的操作：`characters/{accountId}.equipment` 與 `inventories/{accountId}.items[]` 必須在同一次請求內一起變動，對應 domain-model.yaml 的 RULE-019。

## Goals / Non-Goals

**Goals:**
- 建立可重複使用的物品生成引擎，供 shop（上架）與之後的 combat/event（掉落）呼叫同一份邏輯
- 永久背包的 500 格上限在寫入路徑上是硬限制，不能只在前端擋
- 裝備/卸下在單一 Firestore transaction 內完成，避免中間不一致狀態

**Non-Goals:**
- 不實作 run 背包（50 格，run-only）——那是 `adventure-run-core` change 的範圍
- 不實作交易/拍賣（CTX-CON-007 明確排除）
- 不做詞綴/附魔系統（spec 標記為可選、暫緩）

## Decisions

- **物品生成邏輯放在獨立的 `ItemService`，不放進 `InventoryService`**：生成（roll 稀有度/數值）是純函數式邏輯、無 Firestore 依賴，之後 shop/combat 兩個完全不同的呼叫端都要用，獨立出來避免循環依賴。
- **`type: EQUIPMENT | POTION` 共用同一套生成流程，只是 rolled 的欄位不同**：`generateItemInstance` 依 template 的 `type` 決定要用 `baseStatsRange`（EQUIPMENT，roll 出 ATK/DEF/HP 等）還是 `healPercentRange`（POTION，roll 出單一 `healPercent`），稀有度權重與掉落/價格機制對兩者一視同仁，不另外拆一套「藥水專屬」的生成引擎。
- **裝備/卸下用 Firestore `runTransaction`**：在同一個 transaction 內讀取 `characters/{accountId}` 與 `inventories/{accountId}`，確認物品存在、equipSlot 相符後，一次性寫入兩份文件。捨棄「先寫 character 再寫 inventory」的兩階段作法，因為中間失敗會留下不一致狀態。
- **裝備效果不複製到 Character 文件**：`characters.equipment` 只存 `slot -> itemId` 引用（沿用既有 schema），實際數值加成在 `GET /api/character` 計算 stats 時，即時查詢 `inventories` 內對應 itemId 的 `rolledStats` 加總，不做反正規化冗餘存儲（避免物品被卸下/丟棄後兩邊資料不同步）。
- **背包上限檢查在寫入前用 `items.length < 500` 判斷**：不用複雜的分頁/counter 文件，因為每個帳號的背包是單一文件（見 data-model.yaml DATA-003），讀取一次即可拿到目前數量。

## Risks / Trade-offs

- [風險] 單一 `inventories/{accountId}` 文件塞 500 個 ItemInstance，Firestore 單文件 1MB 限制可能在大量高稀有度物品（欄位較多）時被觸及 → [緩解] 先以現行設計上線，若真的接近 1MB（可加監控告警），再拆成 subcollection（`inventories/{accountId}/items/{itemId}`），屆時需回頭調整 data-model.yaml 的 DATA-003/DATA-004 設計
- [風險] 裝備 transaction 需要同時鎖 `characters` 與 `inventories` 兩份文件，高併發下（同玩家連續快速操作）可能偶發 contention → [緩解] 是同一玩家的操作序列化本來就合理（不會有第二個 writer），Firestore transaction 的 retry 機制足以處理

## Migration Plan

- `inventories/{accountId}` 為新 collection，無既有資料，不需遷移
