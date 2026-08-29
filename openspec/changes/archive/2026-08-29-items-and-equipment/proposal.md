## Why

`server/constants/templates.ts` 已有部分 `ITEM_TEMPLATES` 靜態資料，但完全沒有「依模板 roll 出物品實體」的生成邏輯、沒有永久背包（Inventory）的 Firestore 存取層，也沒有裝備/卸下 API。沒有這一塊，商店購買（shop change）與冒險掉落（combat-engine change）都無法真的把物品交到玩家手上。

> 更新（2026-08-27）：補血藥水已改回一般消耗品物品（type=POTION），與裝備（type=EQUIPMENT）共用同一套 Item Template/Instance 生成機制，本 change 的 `item-generation` capability 需一併涵蓋 POTION 類型（稀有度決定回復生命值百分比，而非戰鬥數值）。

> 更新（2026-08-28 之二）：裝備槽位從 8 個收斂為 6 個，移除 `GLOVES`（手套）與 `NECKLACE`（項鍊），保留 HEAD/BODY/SHOES/LEFT_HAND/RIGHT_HAND/RING。`shared/types/common.ts` 的 `EquipmentSlot` enum、主畫面裝備欄位（改為左右各 3 格）、背包頁頂部總覽皆同步調整。

> 更新（2026-08-28）：`ItemInstance` 改為獨立的頂層 Firestore collection `items/{itemId}`，每個 item 全域唯一，裝備與藥水都是 `items` collection 裡的一筆文件、僅用 `type` 欄位區分，不再內嵌複製於各個容器（背包、角色裝備欄位）中——這些容器現在只存 `itemId` 參照（詳見 design.md）。同時新增前端呈現：主畫面角色左右新增裝備欄位小格，BottomNav 的「角色」入口改為「背包」並導向新背包頁（頂部裝備總覽 + 下方可篩選/排序的格狀背包）。
>
> 更新（2026-08-29）：物品擁有權從 accountId 改為 characterId——一個帳號最多 3 個角色，各自的等級/屬性/裝備都已是 character-scoped，永久背包與物品理應跟隨相同單位，不應在帳號底下的多個角色間共用（避免角色間背包容量互相排擠、裝備驗證邏輯混淆）。`items/{itemId}` 的擁有者欄位改為 `characterId`；`inventories` 文件改以 `characterId` 為 key；`GET /api/inventory`、`DELETE /api/inventory/{itemId}` 兩個帳號層級端點改為 character-scoped 路徑 `GET /api/character/{characterId}/inventory`、`DELETE /api/character/{characterId}/inventory/{itemId}`（equip/unequip 原本就已是 `/api/character/{characterId}/...`，不受影響）。
>
> 更新（2026-08-29 之二）：`ITEM_TEMPLATES` 依 `docs/worldview.md` 世界觀重新設計——道具命名與描述呼應「裂域」（GK 公司廢棄設施）場景素材，`ItemTemplate` 新增 `description` 欄位；藥水（機油）描述需暗示玩家角色局部機械化但不可明講（例如「為什麼我喝機油會補血...？但真好喝」的語氣），其餘裝備命名可呼應補給/維修設施拾荒零件、殘存 GkBot 素材。

## What Changes

- 新增物品生成引擎：依 `templateId` + rarity roll 出 `ItemInstance`（含 `itemId`、`rolledStats`、`source`），支援 `type: EQUIPMENT | POTION` 兩種類型
- 新增獨立的 `items` Firestore collection：物品生成時同步持久化為 `items/{itemId}` 文件（帶擁有者 `characterId`），為系統中唯一一份物品資料
- 新增 `Inventory` repository/service：永久背包以 `characterId` 為 key，只存 `itemId` 參照陣列、上限 500 格檢查、捨棄物品（含同步刪除 `items` 文件本體）
- 新增裝備/卸下 API：`POST /api/character/{characterId}/equip`、`POST /api/character/{characterId}/unequip`，槽位衝突需回傳需要確認替換的資訊（僅適用於 `type: EQUIPMENT`），驗證邏輯改為直接讀 `items/{itemId}` 的擁有者欄位（`characterId`）
- 新增 `GET /api/character/{characterId}/inventory`：列出該角色永久背包內容（裝備與藥水皆會出現），server 端批次查詢 `items` collection 組裝完整資料回傳
- 新增 `DELETE /api/character/{characterId}/inventory/{itemId}`：捨棄物品（**見下方「待確認事項」**）
- 新增前端：主畫面角色圖像左右新增裝備欄位小格（6 槽位、含空槽位樣式）；BottomNav「角色」入口改為「背包」；新增背包頁面（頂部裝備總覽 + 下方格狀背包，可依裝備/道具篩選、依稀有度排序）
- `ITEM_TEMPLATES` 依世界觀重新設計：`ItemTemplate` 新增 `description` 欄位，內容呼應「裂域」場景素材與機械化暗示文案（見 `docs/worldview.md`）

## Capabilities

### New Capabilities
- `item-generation`：Item Template → Item Instance 的生成規則（稀有度 roll、數值/回復% roll），涵蓋 EQUIPMENT 與 POTION 兩種類型；生成即持久化進 `items` collection
- `inventory`：永久背包容量與內容管理（含捨棄物品），以及背包頁面的前端呈現（篩選、排序）
- `equipment`：裝備槽位、穿脫、槽位替換確認（僅 EQUIPMENT 類型適用），以及主畫面裝備欄位的前端呈現

### Modified Capabilities
（無）

## Impact

- `server/constants/templates.ts`：依世界觀重寫 `ITEM_TEMPLATES` 內容（命名/描述），新增 `description` 欄位；`rarityWeights`/`baseStatsRange`/`priceRangeByRarity`（裝備）與 `healPercentRange`（藥水）結構維持，對齊 `openspec/analysis/domain-model.yaml` 的 ENT-004 定義
- `shared/types/item.ts`：`ItemTemplate` 新增 `description: string` 欄位；`ItemInstance`/`RolledItem` 的擁有者欄位 `accountId` 改為 `characterId`
- `shared/schemas/firestore/item.schema.ts`：`itemInstanceSchema` 的 `accountId` 改為 `characterId`；`inventorySchema` 的 `accountId` 改為 `characterId`
- 新增 `server/services/item.service.ts`：`generateItemInstance(templateId, context)`（依 DROP/SHOP/EVENT 情境決定可用 rarity 上限）
- 新增 `server/repositories/item.repository.ts`：`items` collection 的存取層（`create`、`getById`、`getByIds`——需處理 Firestore `in` 查詢 30 筆上限的分批、`delete`）
- 新增/改寫 `server/repositories/inventory.repository.ts`、`server/services/inventory.service.ts`：以 `characterId` 為 key，`items` 欄位改為 `itemId[]`，讀取時需與 `item.repository.ts` 組合出完整 ItemInstance
- 新增 `server/services/equipment.service.ts`（或併入 `character.service.ts`，見 design.md 的決策）：跨 `characters` 與 `items` 兩份文件的裝備/卸下邏輯，需要 Firestore transaction（RULE-019），擁有權驗證改用 `item.characterId === characterId`
- 新增 `server/api/character/[characterId]/inventory/index.get.ts`、`server/api/character/[characterId]/inventory/[itemId].delete.ts`（取代原本帳號層級的 `server/api/inventory/*`）、`server/api/character/[characterId]/equip.post.ts`、`server/api/character/[characterId]/unequip.post.ts`
- 依賴 `character-progression` change 已完成的 `CharacterService`（裝備需要更新 `characters/{characterId}.equipment`）
- 前端：`app/components/game/characterStage.vue`（新增裝備欄位小格）、`app/components/game/bottomNav.vue`（「角色」改為「背包」）、`app/pages/inventory.vue`、`app/composables/useInventory.ts`（呼叫改為 character-scoped 端點）
- 對應分析：FR-015、FR-020~028、UC-008~010、AGG-003/AGG-004/ENT-003/ENT-004/ENT-005/VO-003/VO-005（domain-model.yaml）、API-009~012（api-model.yaml，其中 API-012 為 needs-review 項目，且 API-011/012 的路徑需改為 character-scoped）、DATA-003/004/011（data-model.yaml，DATA-004 由「embedded shape」改為獨立 top-level collection、擁有者欄位由 accountId 改為 characterId，需回頭更新 data-model.yaml）、RULE-005/006/019

## 待確認事項

- `DELETE /api/inventory/{itemId}`（捨棄物品）對應 `openspec/analysis/api-model.yaml` 的 API-012，該端點的 schema 早已存在於 `shared/schemas/api/inventory.schema.ts`，但來源文件 `docs/05_物品與裝備系統.md` 從未描述過丟棄機制，`requirements.yaml` 也沒有對應 FR（見 `traceability.yaml` 的 gap 清單，severity: medium）。本 change 先按既有 schema 實作（丟棄且不可復原，不進資源回收），若後續與相關人確認這不是需求，再回頭移除。
- 主畫面裝備欄位小格、背包頁面（篩選/排序）目前在 `openspec/analysis/domain-model.yaml`/`requirements.yaml` 中沒有對應的 FR/UC，是本次更新直接依使用者描述新增的前端需求。先按本文件描述實作，之後如跑 `analysis-validator` 會被標記為 needs-review，需要回頭補上游來源或視情況忽略。
