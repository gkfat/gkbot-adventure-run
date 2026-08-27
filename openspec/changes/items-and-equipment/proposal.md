## Why

`server/constants/templates.ts` 已有部分 `ITEM_TEMPLATES` 靜態資料，但完全沒有「依模板 roll 出物品實體」的生成邏輯、沒有永久背包（Inventory）的 Firestore 存取層，也沒有裝備/卸下 API。沒有這一塊，商店購買（shop change）與冒險掉落（combat-engine change）都無法真的把物品交到玩家手上。

> 更新（2026-08-27）：補血藥水已改回一般消耗品物品（type=POTION），與裝備（type=EQUIPMENT）共用同一套 Item Template/Instance 生成機制，本 change 的 `item-generation` capability 需一併涵蓋 POTION 類型（稀有度決定回復生命值百分比，而非戰鬥數值）。

## What Changes

- 新增物品生成引擎：依 `templateId` + rarity roll 出 `ItemInstance`（含 `itemId`、`rolledStats`、`source`），支援 `type: EQUIPMENT | POTION` 兩種類型
- 新增 `Inventory` repository/service：永久背包讀取、新增物品、上限 500 格檢查、捨棄物品
- 新增裝備/卸下 API：`POST /api/character/equip`、`POST /api/character/unequip`，槽位衝突需回傳需要確認替換的資訊（僅適用於 `type: EQUIPMENT`）
- 新增 `GET /api/inventory`：列出永久背包內容（裝備與藥水皆會出現）
- 新增 `DELETE /api/inventory/{itemId}`：捨棄物品（**見下方「待確認事項」**）

## Capabilities

### New Capabilities
- `item-generation`：Item Template → Item Instance 的生成規則（稀有度 roll、數值/回復% roll），涵蓋 EQUIPMENT 與 POTION 兩種類型
- `inventory`：永久背包容量與內容管理（含捨棄物品）
- `equipment`：裝備槽位、穿脫、槽位替換確認（僅 EQUIPMENT 類型適用）

### Modified Capabilities
（無）

## Impact

- `server/constants/templates.ts`：補齊 `ITEM_TEMPLATES` 的 `rarityWeights`/`baseStatsRange`/`priceRangeByRarity`（裝備）與 `healPercentRange`（藥水）（目前只有 `statRanges` 雛形，需對齊 `openspec/analysis/domain-model.yaml` 的 ENT-004 定義，並新增至少一個 `type: POTION` 的模板）
- 新增 `server/services/item.service.ts`：`generateItemInstance(templateId, context)`（依 DROP/SHOP/EVENT 情境決定可用 rarity 上限）
- 新增 `server/repositories/inventory.repository.ts`、`server/services/inventory.service.ts`
- 新增 `server/services/equipment.service.ts`（或併入 `character.service.ts`，見 design.md 的決策）：跨 `characters` 與 `inventories` 兩份文件的裝備/卸下邏輯，需要 Firestore transaction（RULE-019）
- 新增 `server/api/inventory/index.get.ts`、`server/api/inventory/[itemId].delete.ts`、`server/api/character/equip.post.ts`、`server/api/character/unequip.post.ts`
- 依賴 `character-progression` change 已完成的 `CharacterService`（裝備需要更新 `characters/{accountId}.equipment`）
- 對應分析：FR-015、FR-020~028、UC-008~010、AGG-003/AGG-004/ENT-003/ENT-004/ENT-005/VO-003/VO-005（domain-model.yaml）、API-009~012（api-model.yaml，其中 API-012 為 needs-review 項目）、DATA-003/004/011（data-model.yaml）、RULE-005/006/019

## 待確認事項

`DELETE /api/inventory/{itemId}`（捨棄物品）對應 `openspec/analysis/api-model.yaml` 的 API-012，該端點的 schema 早已存在於 `shared/schemas/api/inventory.schema.ts`，但來源文件 `docs/05_物品與裝備系統.md` 從未描述過丟棄機制，`requirements.yaml` 也沒有對應 FR（見 `traceability.yaml` 的 gap 清單，severity: medium）。本 change 先按既有 schema 實作（丟棄且不可復原，不進資源回收），若後續與相關人確認這不是需求，再回頭移除。
