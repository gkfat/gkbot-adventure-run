> **更新（2026-08-28）**：`items` 改為獨立頂層 collection（見 proposal.md/design.md 的架構調整），下方 2.x / 3.1 / 3.4 已改回未勾選並標註需重構；新增第 5 節（`items` collection 存取層）、第 6 節（前端）、第 7 節（重新驗證）。第 1 節（生成引擎的 roll 邏輯本身）與 4.1 的舊 4 條路徑註冊不受影響，維持已完成。

> **更新（2026-08-29）**：兩項變更再次牽動既有完成項目：
> 1. 物品擁有權從 `accountId` 改為 `characterId`（見 proposal.md/design.md 2026-08-29 更新）——影響第 2、3、4、5 節所有涉及擁有者欄位、路由路徑、驗證邏輯的項目。
> 2. `ITEM_TEMPLATES` 依 `docs/worldview.md` 世界觀重新設計內容，`ItemTemplate` 新增 `description` 欄位——影響 1.1、1.4（新增）。
>
> 兩項變更已於本次實作完成（見下方勾選狀態）。`app/utils/equipmentDisplay.ts` 的前端展示用 `TEMPLATE_NAMES`/`TEMPLATE_ICON`/`TEMPLATE_FLAVOR` 也同步更新為新 templateId 與世界觀文案（原計畫未列出此檔案，但重新命名 templateId 後必須同步，否則背包頁會顯示 fallback 樣式）。6.3 的實作方式與原計畫略有出入：`characterId` 由 `useInventory.ts` 內部透過 `useCharacter().selectedCharacterId` 取得（與 `useCharacter.ts` 自身 `fetchCharacter` 的既有模式一致），因此 `app/pages/inventory.vue` 呼叫端不需改動。

## 1. 物品模板與生成引擎

- [x] 1.1（重構）`shared/types/item.ts` 的 `ItemTemplate` 新增 `description: string` 欄位（`shared/schemas/firestore/item.schema.ts` 沒有對應模板 schema，模板本身是常數不落 Firestore，故無需同步調整）
- [x] 1.2 `server/services/item.service.ts`：`rollRarity(templateId, context)`、`rollStats(templateId, rarity)`（依 template.type 決定用 `baseStatsRange` 或 `healPercentRange`）、`generateItemInstance(templateId, context)`（roll 邏輯本身不受本次兩項變更影響）
- [x] 1.3 單元測試：稀有度分布、數值/回復% roll 邊界、未知 templateId 錯誤處理
- [x] 1.4（新增）依 `docs/worldview.md` 世界觀重寫 `server/constants/templates.ts` 的 `ITEM_TEMPLATES`：命名與 `description` 呼應「裂域」場景素材（補給設施拾荒零件、維修設施殘存 GkBot 部件、研究設施殘留藥劑），涵蓋 HEAD/BODY/SHOES/LEFT_HAND/RIGHT_HAND/RING 各一件裝備 + 一種藥水；藥水描述暗示玩家角色局部機械化但不明講

## 2. 永久背包（改為 characterId 參照，需重構）

- [x] 2.1（重構）`shared/schemas/firestore/item.schema.ts` 的 `inventorySchema`：`accountId` 欄位改為 `characterId`
- [x] 2.2（重構）`server/repositories/inventory.repository.ts`：doc id / 查詢改以 `characterId` 為 key（`getByAccountId` 改名為 `getByCharacterId`，`addItem`/`removeItem` 皆改用 `characterId`）；`items` 欄位維持 `itemId[]`
- [x] 2.3（重構）`server/services/inventory.service.ts`：`getInventoryWithItems(characterId)`、`grantItem(characterId, templateId, context)`、`discardItem(characterId, itemId)` 皆改用 `characterId`；`discardItem` 的已裝備檢查簡化為只讀該角色自己的 `equipment`（不再需要 `listByAccountId` 查整個帳號的角色）
- [x] 2.4（重構）路由搬遷：`server/api/inventory/index.get.ts` → `server/api/character/[characterId]/inventory/index.get.ts`；`server/api/inventory/[itemId].delete.ts` → `server/api/character/[characterId]/inventory/[itemId].delete.ts`；新增 `characterId` 屬於當前登入帳號的驗證（`CharacterRepository.getByIdForAccount`，與 equip/unequip 一致）

## 3. 裝備 / 卸下（擁有權驗證改用 characterId，需部分重構）

- [x] 3.1（重構）`server/services/equipment.service.ts`：`equipItem`/`unequipItem` 的擁有權驗證由 `item.accountId === accountId` 改為 `item.characterId === characterId`（Firestore `runTransaction` 讀 `characters/{characterId}` + `items/{itemId}` 的架構不變）
- [x] 3.2 `server/api/character/[characterId]/equip.post.ts`（路由已是 character-scoped，不受影響）
- [x] 3.3 `server/api/character/[characterId]/unequip.post.ts`（路由已是 character-scoped，不受影響）
- [x] 3.4 `GET /api/character` 的 stats 計算：`equipmentBonus` 依 `equipment` 的 itemId 批次查詢 `items` collection 取得 `stats` 加總（此計算本身不涉及擁有者欄位，不受影響）

## 4. 文件與驗證（需部分重跑）

- [x] 4.1（重構）`server/utils/openapi.ts`：更新 2 條 inventory 路徑為 `/api/character/{characterId}/inventory`、`/api/character/{characterId}/inventory/{itemId}`（equip/unequip 2 條路徑不變）
- [x] 4.2 重新執行 `pnpm nuxt typecheck`：本次變更觸及的檔案皆無型別錯誤；既有的 2 個前端型別錯誤（`app/components/system/systemBtn.vue`、`app/composables/useApi.ts`）與本次變更無關，維持原狀
- [ ] 4.3 重新執行手動驗證流程（路由路徑變更，舊有的 401 驗證結果需重新確認；需使用者以真實登入 token/帳號補測，同 6.4/7.2）

## 5. `items` collection 存取層（需部分重構）

- [x] 5.1 `server/repositories/item.repository.ts`：`create(item)`、`getById`/`delete` 沿用 `BaseRepository`、`getByIds(itemIds)`（改用 Firestore 多文件 `getAll(...refs)`，不受擁有者欄位變更影響）
- [x] 5.2（重構）`InventoryService.grantItem(characterId, templateId, context)`：呼叫 `generateItemInstance` 產生 `RolledItem`，補上 `characterId`（原為 `accountId`）後呼叫 `item.repository.ts.create` 持久化，並在 `inventories.items` 加入該 `itemId` 參照
- [x] 5.3 單元測試：`getByIds` 對超過批次大小（100 筆）時的分批查詢邏輯（不受擁有者欄位變更影響）

## 6. 前端：裝備欄位與背包頁（改用 character-scoped 端點，需部分重構）

- [x] 6.1 `app/components/game/characterStage.vue`：角色圖像左右各新增 3 個裝備欄位小格（6 槽位），依 `character.equipment` 顯示（不受本次變更影響）
- [x] 6.2 `app/components/game/bottomNav.vue`：`leftItems` 的「角色」改為「背包」，導向新背包頁面（不受本次變更影響）
- [x] 6.3（重構）`app/composables/useInventory.ts`：呼叫端點由 `GET /api/inventory`、`DELETE /api/inventory/{itemId}` 改為 `GET /api/character/{characterId}/inventory`（`characterId` 取自 `useCharacter().selectedCharacterId`，不需呼叫端傳入）；`app/utils/equipmentDisplay.ts` 的展示用常數同步更新為新 templateId 與世界觀文案
- [x] 6.4 重新手動驗證：`pnpm dev` 啟動、確認 `/inventory` 頁面呼叫新路徑、未登入時正確導向 `/login`（需使用者實機驗證）

## 7. 重新驗證（架構調整後）

- [x] 7.1 重新執行 `pnpm nuxt typecheck` 與 `pnpm test`：accountId → characterId 的變更、新的 description 欄位、路由搬遷型別皆正確；`pnpm test` 19/19 通過
- [x] 7.2 手動驗證完整流程：生成物品（寫入 `items`，擁有者為 characterId）→ 放入背包（`inventories/{characterId}` 新增參照）→ 裝備（讀 `items` 以 characterId 驗證擁有權）→ `/api/character` 的 stats 反映裝備加成 → 卸下 → 捨棄未裝備物品（`items` 文件一併刪除）／捨棄已裝備物品被拒 → 主畫面裝備小格與背包頁（呼叫新端點）同步反映（因無可用 Firebase 測試帳號，需使用者以真實登入 token/帳號手動補測）
