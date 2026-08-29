## Context

`ItemTemplate` 是 repo 內常數（`CTX-CON-001`：不落 Firestore，避免每個冒險 step 都查資料庫，見 NFR-005）。

> **更新（2026-08-28）**：`ItemInstance` 改為獨立的頂層 Firestore collection `items/{itemId}`（一個 item 一份文件，全域唯一），不再內嵌複製於 `inventories.items[]`、`adventureRuns.runInventory[]`、`shopsGold/shopsGems` 的 slot 內——這些容器現在只存 `itemId` 字串參照。原因：同一份物品資料不該在多個容器間各自複製一份（容易產生不同步），且解除了「單一 `inventories` 文件塞 500 個完整物件恐觸及 Firestore 1MB 上限」的風險（見下方 Risks）。本 change 負責 `items` collection 本身與「永久背包」這份參照清單；run 背包/商店 slot 的參照存放留給 `adventure-run-core`/`shop` change。

裝備（equip/unequip）是本專案第一個真正跨 aggregate 的操作：`characters/{characterId}.equipment` 只存 `slot -> itemId` 參照，實際物品資料在 `items/{itemId}`。因為 `items` 文件本身帶有 `characterId`（擁有者）欄位，equip/unequip 只需在同一個 transaction 內讀 `characters/{characterId}` + `items/{itemId}` 即可驗證擁有權與 slot 是否相符，不再需要讀取 `inventories` 文件。

> **更新（2026-08-29）**：物品與永久背包的擁有者從 `accountId` 改為 `characterId`。一個帳號最多 3 個角色（`character.schema.ts` 註明「1 account : up to 3 characters」），等級、屬性、裝備欄位都已是 character-scoped 的成長狀態，物品/背包理應跟隨同一個單位，不應在帳號底下的多個角色間共用——共用會讓「角色 A 撿到的裝備角色 B 也能穿」「角色刪除時物品該歸誰」等問題失去明確邊界。以下所有原本描述 `accountId` 擁有者/驗證的段落，讀者請一律理解為 `characterId`；文字本身已同步更新。連帶地，`GET /api/inventory`、`DELETE /api/inventory/{itemId}` 兩個帳號層級端點改為 character-scoped：`GET /api/character/{characterId}/inventory`、`DELETE /api/character/{characterId}/inventory/{itemId}`（與 equip/unequip 的路徑風格一致）。

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
- **`items` 獨立為頂層 Firestore collection，其餘容器只存 `itemId` 參照**（更新，取代原本的內嵌設計）：`generateItemInstance` roll 出的結果在交付給玩家的當下，同步寫入 `items/{itemId}`（文件帶 `characterId` 擁有者欄位）；`inventories/{characterId}.items` 改為 `string[]`（itemId 陣列）。理由：同一 itemId 不該在多個容器（背包／run 背包／商店 slot）各自存一份拷貝，避免不同步，也解除了單一背包文件塞 500 個完整物件可能撞到 Firestore 1MB 限制的風險。
- **物品/背包擁有者為 `characterId` 而非 `accountId`**（2026-08-29 更新）：`inventories` 文件以 `characterId` 為 doc id（而非 `accountId`），`items/{itemId}` 的擁有者欄位是 `characterId`。理由見上方 Context 更新說明——角色是遊戲內成長/持有狀態的單位，不應在同一帳號的多個角色間共用背包與裝備。
- **`GET /api/character/{characterId}/inventory` 由 server 端組裝**：讀出 `inventories.items`（itemId 陣列）後，批次查詢 `items` collection 補齊完整 ItemInstance 才回傳；Firestore `in` 查詢單次上限 30 筆，500 筆需分批（約 17 次）查詢後合併；路由需驗證 `characterId` 屬於當前登入帳號（與 equip/unequip 既有的驗證方式一致）。
- **裝備/卸下用 Firestore `runTransaction`，改讀 `characters` + `items`**：在同一個 transaction 內讀取 `characters/{characterId}` 與 `items/{itemId}`，用 `item.characterId === characterId` 驗證擁有權、`item.equipSlot` 驗證槽位相符，只需寫入 `characters` 一份文件（`items`/`inventories` 都不變，物品本體與背包參照皆不受裝備狀態影響）。
- **裝備效果不複製到 Character 文件**：`characters.equipment` 只存 `slot -> itemId` 引用，實際數值加成在 `GET /api/character` 計算 stats 時，即時查詢 `items` 內對應 itemId 的 `stats` 加總，不做反正規化冗餘存儲（避免物品被卸下/丟棄後兩邊資料不同步）。
- **捨棄物品 = 移除參照 + 刪除本體**：`DELETE /api/character/{characterId}/inventory/{itemId}` 除了從 `inventories.items` 陣列移除該 itemId，還要刪除 `items/{itemId}` 文件本身——捨棄後不可復原，且該物品此後不會再被任何容器參照，留著只會變成孤兒文件。
- **背包上限檢查在寫入前用 `items.length < 500` 判斷**：不用複雜的分頁/counter 文件，因為每個角色的背包參照清單是單一文件（見 data-model.yaml DATA-003），讀取一次即可拿到目前數量（現在存的是 itemId 字串，文件大小已不是問題，但上限本身是遊戲規則，不因儲存方式改變而放寬）。
- **前端背包頁不新增 API**：頂部裝備總覽用既有 `GET /api/character` 的 `equipment`（slot -> itemId），下方格狀背包用既有 `GET /api/character/{characterId}/inventory` 的完整 ItemInstance 陣列，前端自行以 itemId 對照組合；篩選（裝備/道具）與排序（依稀有度 L→N）皆為前端本地運算。
- **`ItemTemplate` 依世界觀重新設計，新增 `description` 欄位**：`server/constants/templates.ts` 的道具命名/描述改為呼應 `docs/worldview.md` 的「裂域」場景素材（補給設施拾荒、維修設施殘存 GkBot 零件、研究設施殘留藥劑），藥水描述需暗示玩家角色局部機械化但不可明講；`description` 只是靜態文案欄位，不影響生成邏輯（roll 稀有度/數值）。

## Risks / Trade-offs

- [風險] `items` collection 沒有內建的孤兒清理機制——若某次寫入在「新增 items 文件」之後、「寫入 inventories 參照」之前失敗，會留下沒有任何容器參照的孤兒 item 文件 → [緩解] 生成物品時先寫 `items/{itemId}`、再寫參照容器，孤兒文件不會被任何人讀到也不影響遊戲邏輯正確性，之後可用排程清理未被引用超過一段時間的 item 文件（本 change 暫不實作排程，只留意此風險）
- [風險] `GET /api/character/{characterId}/inventory` 批次查詢 `items` 需要分批 `in` 查詢（單次 30 筆上限），500 筆物品時對單一請求造成約 17 次 Firestore 讀取 → [緩解] 背包上限本身只有 500，這在讀取延遲上可接受；若之後有效能疑慮，可考慮快取或改為 `inventories` 文件內同時鏡像一份精簡摘要（rarity/type）供列表排序用，詳細數值再依需要查詢
- [風險] 裝備 transaction 需要同時鎖 `characters` 與 `items` 兩份文件，高併發下（同玩家連續快速操作）可能偶發 contention → [緩解] 是同一玩家的操作序列化本來就合理（不會有第二個 writer），Firestore transaction 的 retry 機制足以處理

## Migration Plan

- `items`、`inventories` 皆為新 collection，正式環境無既有資料，不需遷移。
- **Breaking schema change**：本機/開發環境若已依原本「`inventories.items` 為完整 ItemInstance 陣列」的設計寫入過測試資料，格式與新版（`itemId` 字串陣列）不相容，需清空重建，不做欄位轉換腳本。
