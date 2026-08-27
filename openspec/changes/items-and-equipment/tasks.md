## 1. 物品模板與生成引擎

- [ ] 1.1 補齊 `server/constants/templates.ts` 的 `ITEM_TEMPLATES`：對齊 `rarityWeights`/`baseStatsRange`/`priceRangeByRarity`（EQUIPMENT）結構，並新增至少一個 `type: POTION` 模板（含 `healPercentRange`，例如 N:20%、L:50%，可參考先前設計草案的曲線）
- [ ] 1.2 新增 `server/services/item.service.ts`：`rollRarity(templateId, context)`、`rollStats(templateId, rarity)`（依 template.type 決定用 `baseStatsRange` 或 `healPercentRange`）、`generateItemInstance(templateId, context)`
- [ ] 1.3 單元測試：稀有度分布、數值/回復% roll 邊界、未知 templateId 錯誤處理

## 2. 永久背包

- [ ] 2.1 新增 `server/repositories/inventory.repository.ts`：`getByAccountId`、`addItem`、`removeItem`
- [ ] 2.2 新增 `server/services/inventory.service.ts`：容量檢查（500 格）、捨棄前檢查是否已裝備
- [ ] 2.3 新增 `server/api/inventory/index.get.ts`
- [ ] 2.4 新增 `server/api/inventory/[itemId].delete.ts`

## 3. 裝備 / 卸下

- [ ] 3.1 新增 `server/services/equipment.service.ts`：`equipItem`、`unequipItem`，內部使用 Firestore `runTransaction` 同時操作 `characters` 與 `inventories`
- [ ] 3.2 新增 `server/api/character/equip.post.ts`
- [ ] 3.3 新增 `server/api/character/unequip.post.ts`
- [ ] 3.4 更新 `character-progression` change 產出的 stats 計算：`GET /api/character` 依 `equipment` 引用查詢 `inventories` 內對應物品的 `rolledStats` 並加總進 `calculateBaseStats` 的 `equipmentBonus` 參數

## 4. 文件與驗證

- [ ] 4.1 於 `server/utils/openapi.ts` 註冊 4 個新路徑
- [ ] 4.2 執行 `pnpm nuxt typecheck`
- [ ] 4.3 手動驗證流程：生成物品 → 放入背包 → 裝備 → 確認 `/api/character` 的 stats 反映裝備加成 → 卸下 → stats 恢復 → 捨棄未裝備物品成功／捨棄已裝備物品被拒
