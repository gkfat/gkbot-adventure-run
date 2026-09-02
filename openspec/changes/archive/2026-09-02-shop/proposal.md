## Why

商店是玩家花費金幣/紅寶石換取裝備與消耗品（藥水）的主要管道，也是每日任務/成就發放的 gems 唯一有意義的出口。目前完全沒有商店相關的 repository/service/API，玩家賺到的資源無處可花。

## What Changes

- 新增金幣商店與紅寶石商店的每日懶生成邏輯，兩者皆為 per-character（`gold`/`gems` 是 `Character` 的欄位，同帳號底下的角色各自獨立商店，不共用）
- 新增 `GET /api/character/{characterId}/shop/gold`、`GET /api/character/{characterId}/shop/gems`：查詢時若當日商店尚未生成則觸發生成
- 新增 `POST /api/character/{characterId}/shop/purchase`：檢查未售出、扣款、發放物品，並依玩家選擇放入永久背包或直接裝備

## Capabilities

### New Capabilities
- `shop`：每日商店生成（per-character 金幣商店 + per-character 紅寶石商店）與購買流程

## Impact

- 依賴既有 `item-generation` capability 的 `generateItemInstance`（商店上架即生成物品實體，沿用其 `Math.random()`，不接 `deterministic-rng` capability——後者範圍限定在 adventure run 內）
- 依賴既有 `equipment` capability 的槽位替換規則（`destination = EQUIP` 時比照辦理）
- 新增 `InventoryService.deliverItem(characterId, item)`（`inventory` capability 既有的 `InventoryService` 新增一個方法）：交付商店文件裡已生成好的物品，不透過會重新 roll 的 `grantItem`
- 新增 `server/repositories/shop.repository.ts`（`shopsGold`、`shopsGems` 兩個 collection，皆以 `{characterId}_{date}` 為文件 id，含 best-effort 刪除方法）
- 新增 `server/services/shop.service.ts`：懶生成（依 `date` 判斷是否過期）、懶銷毀（刪除該角色前一天文件）、購買交易
- 新增 `server/api/character/[characterId]/shop/gold.get.ts`、`server/api/character/[characterId]/shop/gems.get.ts`、`server/api/character/[characterId]/shop/purchase.post.ts`
- 對應分析：FR-029~035、UC-011~013、AGG-005/ENT-006/VO-006（domain-model.yaml）、API-013~015（api-model.yaml）、DATA-006/007（data-model.yaml）、RULE-001/009、NFR-002/004
