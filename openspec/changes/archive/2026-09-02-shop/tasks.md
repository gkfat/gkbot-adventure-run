## 1. Repository

- [x] 1.1 新增 `server/repositories/shop.repository.ts`：`getGoldShop(characterId, date)`、`getGemsShop(characterId, date)`、`createGoldShop`、`createGemsShop`（用 Firestore `create` 而非 `set`）、`markSlotSold`、`deleteGoldShop(characterId, date)`、`deleteGemsShop(characterId, date)`（皆 best-effort，文件不存在不視為錯誤，供懶銷毀使用）

## 2. Service

- [x] 2.1 新增 `server/services/shop.service.ts`：`getOrGenerateGoldShop`、`getOrGenerateGemsShop`（懶生成邏輯，皆以 `characterId` 為單位；generate 直接用 `Math.random()`，不接 `RngService`——決定性 RNG 只適用於 adventure run 內部）。兩者於觸發生成新一天商店時，額外 best-effort 呼叫對應的 `deleteGoldShop`/`deleteGemsShop(characterId, 昨天日期)`
- [x] 2.2 商品生成：固定格數（例如 6），呼叫 `item.service.ts` 既有的 `generateItemInstance`，金幣商店 rarity 上限 N/R/SR、紅寶石商店 SR/SSR/L
- [x] 2.3 `purchaseItem(accountId, characterId, shopType, slotId, destination, replaceSlot?)`：先用 `characterRepo.getByIdForAccount` 驗證角色屬於該帳號，再於單一 Firestore transaction 內完成「檢查未售出 + 檢查資源 + 扣款 + 標記售出 + 發放物品」；發放的是 shop 文件裡**已生成好**的那個 `ItemInstance`，不得重新呼叫 `generateItemInstance` 重新 roll。**INVENTORY / EQUIP 兩種 destination 都要**在同一 transaction 內直接（不透過 `InventoryService`，避免巢狀 transaction）把 item 寫入 `items/{itemId}`、把 `itemId` 加入 `inventories.items` 參照；背包已滿（500 格）則拋出、整筆交易回滾（不扣款、不標記售出）。`destination = EQUIP` 額外在同一 transaction 內寫入 `characters.equipment[slot]`（比照 `EquipmentService.equipItem` 的槽位替換規則，回傳 `unequipped`）
- [x] 2.5 `deleteShopsForCharacter(characterId)`：best-effort 刪除該角色今天+昨天的 `shopsGold`/`shopsGems` 文件；`CharacterService.deleteCharacter` 刪除角色時呼叫，避免角色刪除後其商店文件因為再也不會觸發懶生成/懶銷毀而永久孤兒化

## 3. API

- [x] 3.1 新增 `server/api/character/[characterId]/shop/gold.get.ts`
- [x] 3.2 新增 `server/api/character/[characterId]/shop/gems.get.ts`
- [x] 3.3 新增 `server/api/character/[characterId]/shop/purchase.post.ts`

## 4. 文件與驗證

- [x] 4.1 於 `server/utils/openapi.ts` 註冊 3 個新路徑
- [x] 4.2 執行 `pnpm nuxt typecheck`（專案沒有獨立的 typecheck script，依 CLAUDE.md 改用 `npx tsc --noEmit -p .nuxt/tsconfig.server.json`；唯二錯誤在既有、與本次改動無關的 `combat.service.test.ts`/`event.service.test.ts`）
- [ ] 4.3 手動驗證：跨日重新查詢商店會重新生成（且前一天的 `shopsGold` 文件被刪除）；同一帳號連續查詢商品不變；購買成功（INVENTORY / EQUIP 兩種 destination）/資源不足/重複購買/背包已滿五種情境；購買成功時交付的物品與商店列表顯示的一致（rarity/stats 不重新 roll）
