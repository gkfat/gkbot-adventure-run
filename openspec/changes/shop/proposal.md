## Why

商店是玩家花費金幣/紅寶石換取裝備與消耗品（藥水）的主要管道，也是每日任務/成就發放的 gems 唯一有意義的出口。目前完全沒有商店相關的 repository/service/API，玩家賺到的資源無處可花。

## What Changes

- 新增金幣商店（per-account）與紅寶石商店（全服共享）的每日懶生成邏輯
- 新增 `GET /api/shop/gold`、`GET /api/shop/gems`：查詢時若當日商店尚未生成則觸發生成
- 新增 `POST /api/shop/purchase`：檢查未售出、扣款、發放物品，並依玩家選擇放入永久背包或直接裝備

## Capabilities

### New Capabilities
- `shop`：每日商店生成（per-account 金幣商店 + 全服紅寶石商店）與購買流程

## Impact

- 依賴 `items-and-equipment` change 的 `ItemService.generateItemInstance`（商店上架即生成物品實體）與 `InventoryService`/`EquipmentService`（購買後放入背包或直接裝備）
- 依賴 `character-progression` change 的 `CharacterService`（扣款）
- 新增 `server/repositories/shop.repository.ts`（`shopsGold`、`shopsGems` 兩個 collection）
- 新增 `server/services/shop.service.ts`：懶生成（依 lastGeneratedAt 判斷是否過期）、決定性 seed（`日期+accountId` / `日期`）、購買交易
- 新增 `server/api/shop/gold.get.ts`、`server/api/shop/gems.get.ts`、`server/api/shop/purchase.post.ts`
- 對應分析：FR-029~035、UC-011~013、AGG-005/ENT-006/VO-006（domain-model.yaml）、API-013~015（api-model.yaml）、DATA-006/007（data-model.yaml）、RULE-001/009、NFR-002/004
