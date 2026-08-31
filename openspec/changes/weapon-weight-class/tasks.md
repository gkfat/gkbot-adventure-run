## 1. 型別與 Schema

- [ ] 1.1 `shared/types/item.ts`：`ItemStats` 新增 `dodgeChanceMod?: number`；`ItemTemplate` 新增 `weaponWeightClass?: 'LIGHT' | 'MEDIUM' | 'HEAVY'`（限 HAND 類）；`ItemInstance`/`RolledItem` 一併帶出 `weaponWeightClass`。
- [ ] 1.2 確認 `shared/schemas/api/*`、`shared/schemas/firestore/*` 中對應 item 相關 Zod schema 是否需要同步新增這兩個欄位（若 schema 是從型別衍生則檢查是否需手動補欄位）。

## 2. 前置查核（equip 行為變更風險）

- [ ] 2.1 盤點所有呼叫 `POST /api/character/{characterId}/equip` 的前端程式碼（`app/composables/useCharacter.ts` 等），確認目前是否已傳入 `requestedSlot`、是否有依賴現行靜默 fallback 行為的呼叫路徑。
- [ ] 2.2 若發現依賴現行 fallback 行為的呼叫，記錄下來並在後續任務一併調整。

## 3. 裝備槽位驗證（equipment capability）

- [ ] 3.1 `server/services/equipment.service.ts` 的 `equipItem`：`requestedSlot` 不屬於 `HAND_SLOTS`，或道具非 HAND 類卻帶入 `requestedSlot` 時，改為拋出 `ValidationError`（400），取代現行靜默 fallback。
- [ ] 3.2 補上對應單元測試（`equipment.service.test.ts` 或既有測試檔案）：涵蓋雙武器、雙防具、`requestedSlot` 不合法三種情境。
- [ ] 3.3 前端補上左右手選擇 UI（若目前裝備彈窗尚未支援指定 `requestedSlot`），讓玩家能選擇裝到哪一手。

## 4. Stats 累加（dodgeChanceMod）

- [ ] 4.1 `server/services/item.service.ts` 的 `sumEquipmentStats`：比照 `actionSpeedMod → acc.actionIntervalSec` 的寫法，新增 `dodgeChanceMod → acc.dodgeChance` 累加。
- [ ] 4.2 確認 `character.service.ts` 的 `withStats`/`getEquipmentBonus` 能正確把新的非零 `dodgeChance` 差值過濾進 `equipmentBonus`（沿用既有邏輯，理論上不需改動，僅需驗證）。
- [ ] 4.3 確認最終 `dodgeChance` 計算仍套用既有 `DODGE_CAP`（25%）與下限 0% 的 clamp（`COMBAT_CONFIG`），新增測試涵蓋「裝備懲罰後仍不低於 0%」的情境。

## 5. 道具生成（item-generation）

- [ ] 5.1 `server/constants/templates.ts`：`salvaged_wrench` 定義 `weaponWeightClass = 'MEDIUM'`；`riot_shield_scrap` 定義為 `LEFT_HAND` 適用的分類（依 design.md 決策，防具/盾牌是否套用同一套三分法，或另立分類——需先在 design 討論後決定，若沿用同一套則定為 `MEDIUM` 或依需求調整）。
- [ ] 5.2 `server/services/item.service.ts`（或負責 `generateItemInstance` 的模組）：生成 HAND 類物品時把 template 的 `weaponWeightClass` 帶入 `ItemInstance`。
- [ ] 5.3 生成邏輯：`weaponWeightClass = HEAVY` 的物品，依該稀有度 `baseStatsRange.dodgeChanceMod` 區間 roll 出負值寫入 `rolledStats`；非 `HEAVY` 不產生此欄位。
- [ ] 5.4 補上對應單元測試（`server/services/item.service.test.ts` 或既有生成測試）：涵蓋 HEAVY 物品含 `dodgeChanceMod`、LIGHT/MEDIUM 不含此欄位、`weaponWeightClass` 隨稀有度不變等情境。

## 6. 數值曲線設計與文件

- [ ] 6.1 依 `weapon-weight-class` spec 的稀有度加成通則（R 以上必須有可量測正向加成、僅 N 可為 0、HEAVY 懲罰隨稀有度加重），為 `salvaged_wrench`/`riot_shield_scrap` 設計具體的 `baseStatsRange` 數值區間（N→L）。
- [ ] 6.2 更新 `docs/game-design/item-drop-and-stats.md`：新增武器重量分類章節，記錄上述數值曲線。
- [ ] 6.3 更新 `docs/game-design/content/items.md`：在道具模板總覽表補上 `weaponWeightClass` 欄位。

## 7. 驗證

- [ ] 7.1 `pnpm lint`
- [ ] 7.2 `pnpm test`（含新增的 equipment/item/combat 相關測試）
- [ ] 7.3 `pnpm build`（確認型別編譯無誤）
- [ ] 7.4 手動驗證：裝備一把 HEAVY 武器後，角色 `dodgeChance` 確實下降且不低於 0%；裝備兩把武器到左右手成功；`requestedSlot` 帶入不合法值時前端顯示錯誤而非靜默失敗。
