## 1. 型別與 Schema

- [x] 1.1 `shared/types/item.ts`：`ItemStats` 新增 `dodgeChanceMod?: number`；`ItemTemplate` 新增 `weaponWeightClass?: 'LIGHT' | 'MEDIUM' | 'HEAVY'`（限 `type: EQUIPMENT`，全部 6 個槽位皆適用，不限 HAND 類）；`ItemInstance`/`RolledItem` 一併帶出 `weaponWeightClass`。
- [x] 1.2 確認 `shared/schemas/api/*`、`shared/schemas/firestore/*` 中對應 item 相關 Zod schema 是否需要同步新增這兩個欄位（若 schema 是從型別衍生則檢查是否需手動補欄位）。
- [x] 1.3 `shared/types/adventure.ts`：`COMBAT_CONFIG` 新增 `HEAVY_PENALTY_MITIGATION_PER_POINT`、`MAX_HEAVY_PENALTY_MITIGATION` 常數（比照 `CRIT_PER_AGI`/`DODGE_PER_AGI` 風格），具體數值待 6.1 一併定案。

## 2. 前置查核（equip 行為變更風險）

- [x] 2.1 盤點所有呼叫 `POST /api/character/{characterId}/equip` 的前端程式碼（`app/composables/useCharacter.ts` 等），確認目前是否已傳入 `requestedSlot`、是否有依賴現行靜默 fallback 行為的呼叫路徑。
- [x] 2.2 若發現依賴現行 fallback 行為的呼叫，記錄下來並在後續任務一併調整。

> **查核結果**：唯一呼叫路徑是 `app/components/game/itemDetailDialog.vue` → `useCharacter().equipItem(itemId, slot)` → `POST /api/character/:characterId/equip { itemId, slot }`。`slot` 由 `app/utils/equipmentDisplay.ts` 的 `pickTargetSlot()` 算出：HAND 類道具會挑一個空手（`HAND_SLOTS.find(slot => !equipment[slot])`），**非 HAND 類道具目前回傳 `item.equipSlot` 本身**（而非 `undefined`）。這代表非 HAND 類道具目前一律會帶入 `requestedSlot`（值等於自己的 `equipSlot`），在新規則下會被新版 3.1 的驗證判為「非 HAND 類道具卻帶入 requestedSlot」而回 400，屬於會被新驗證邏輯打破的既有呼叫路徑。已在 3.1 一併修正 `pickTargetSlot()`：非 HAND 類道具改回傳 `undefined`。

## 3. 裝備槽位驗證（equipment capability）

- [x] 3.1 `server/services/equipment.service.ts` 的 `equipItem`：`requestedSlot` 不屬於 `HAND_SLOTS`，或道具非 HAND 類卻帶入 `requestedSlot` 時，改為拋出 `ValidationError`（400），取代現行靜默 fallback。連帶修正 `app/utils/equipmentDisplay.ts` 的 `pickTargetSlot()`（2.1 查核發現的既有 bug）：非 HAND 類道具改回傳 `undefined`，不再回傳 `item.equipSlot` 觸發新的 400。
- [x] 3.2 補上對應單元測試（`equipment.service.test.ts`，新建檔案）：涵蓋雙武器、雙防具、`requestedSlot` 不合法（不屬於 HAND_SLOTS／非 HAND 類道具帶入）四種情境，另加「未帶 requestedSlot 用預設槽位」情境，共 6 個測試皆通過。
- [x] 3.3 前端左右手選擇：既有 `pickTargetSlot()` 已會自動挑選空手（雙武器/雙防具走這條路徑），本次只修正非 HAND 類道具誤帶 `requestedSlot` 的 bug（見 3.1），未新增手動選手 UI（超出本次範圍所需）。

## 4. Stats 累加（dodgeChanceMod）與負重折扣

- [x] 4.1 `server/services/item.service.ts` 的 `sumEquipmentStats`：比照 `actionSpeedMod → acc.actionIntervalSec` 的寫法，新增 `dodgeChanceMod → acc.dodgeChance` 累加；`HEAVY` 分類裝備的 `dodgeChanceMod`/`actionSpeedMod` 在累加前先依角色 `STR`+`CON` 套用負重折扣（`1 - min(MAX_HEAVY_PENALTY_MITIGATION, (STR + CON) × HEAVY_PENALTY_MITIGATION_PER_POINT)`）。`sumEquipmentStats` 簽章新增 `attributes: Attributes` 參數，呼叫端（`character.service.ts`）同步更新傳入 `character.attributes`。
- [x] 4.2 確認 `character.service.ts` 的 `withStats`/`getEquipmentBonus` 能正確把新的非零 `dodgeChance` 差值過濾進 `equipmentBonus`（沿用既有邏輯，理論上不需改動，僅需驗證）。
- [x] 4.3 確認最終 `dodgeChance` 計算仍套用既有 `DODGE_CAP`（25%）與下限 0% 的 clamp（`COMBAT_CONFIG`），新增測試涵蓋「裝備懲罰後仍不低於 0%」的情境。**發現並修正既有 bug**：`shared/utils/calculateStats.ts` 的 `applyEquipmentStats` 先前完全忽略裝備 `dodgeChance` 加總（永遠回傳 `baseStats.dodgeChance`），現已補上加總與 clamp 至 `[0, DODGE_CAP]`。
- [x] 4.4 新增測試涵蓋負重折扣：`STR`+`CON` 越高、`HEAVY` 裝備的 `actionSpeedMod`/`dodgeChanceMod` 懲罰幅度越小；折扣達上限（`MAX_HEAVY_PENALTY_MITIGATION`）時懲罰仍非零；`LIGHT`/`MEDIUM` 裝備不受此折扣影響。見 `item.service.test.ts` `sumEquipmentStats` describe block。
- [x] 4.5 依 `specs/character-progression/spec.md`（MODIFIED Requirements）落地：`GET /api/character/:characterId` 計算 `actionIntervalSec` 時，`HEAVY` 裝備 `actionSpeedMod` 需先套用負重折扣，比照 4.1 的折扣公式；補上對應單元測試。**實作方式**：`actionIntervalSec` 與 `dodgeChance` 的裝備加總共用同一個 `sumEquipmentStats`（`character.service.ts` `withStats` → `getEquipmentBonus` → `sumEquipmentStats`），4.1 的折扣邏輯已同時涵蓋兩者，不需另立第二條路徑。

## 5. 道具生成（item-generation）

- [x] 5.1 `server/constants/templates.ts`：全部 6 個 `type: EQUIPMENT` template 皆定義 `weaponWeightClass`——`salvaged_wrench`=MEDIUM（不變）、`riot_shield_scrap`=HEAVY（新增 actionSpeedMod/dodgeChanceMod 懲罰曲線）、`gkbot_faceplate`=MEDIUM（不變）、`supply_crate_vest`=HEAVY（新增懲罰曲線）、`servo_greaves`=LIGHT（N/R/SR 改為僅 actionSpeedMod、SSR/L 保留 DEF+actionSpeedMod 雙加成）、`research_chip_ring`=LIGHT（SSR/L 新增少量 DEF）。
- [x] 5.2 `server/services/item.service.ts`（`generateItemInstance`）：生成任一 `type: EQUIPMENT` 物品時把 template 的 `weaponWeightClass` 帶入 `ItemInstance`（不限 HAND 槽位）。
- [x] 5.3 生成邏輯：`weaponWeightClass = HEAVY` 的物品，依該稀有度 `baseStatsRange.dodgeChanceMod` 區間 roll 出負值寫入 `rolledStats`；非 `HEAVY` 不產生此欄位。**發現並修正既有 bug**：`rollInRange()` 對所有 stat 都 `Math.round()`，導致 `actionSpeedMod`（及新增的 `dodgeChanceMod`）這類小數區間全部被無條件捨去成 0（`servo_greaves`/`research_chip_ring` 的速度加成在正式環境其實從未真正生效過）。已新增 `rollInRangeFractional()`，`actionSpeedMod`/`dodgeChanceMod` 改用不四捨五入的浮點 roll，`ATK`/`DEF`/`HP`/`healPercent` 維持整數 roll 不變。
- [x] 5.4 補上對應單元測試（`server/services/item.service.test.ts`）：涵蓋 HEAVY 物品含 `dodgeChanceMod`、LIGHT/MEDIUM 不含此欄位、`weaponWeightClass` 隨稀有度不變、非 HAND 槽位物品同樣帶出 `weaponWeightClass`、POTION 不含 `weaponWeightClass` 等情境。

## 6. 數值曲線設計與文件

- [x] 6.1 依 `weapon-weight-class` spec 的稀有度加成通則設計具體數值（已與使用者確認分類與折扣係數，見 5.1）：`HEAVY_PENALTY_MITIGATION_PER_POINT = 0.02`、`MAX_HEAVY_PENALTY_MITIGATION = 0.6`；`servo_greaves`/`research_chip_ring` 逐槽位主屬性/副屬性衝突已解決（SHOES/RING 的既有 actionSpeedMod 保留為 LIGHT 的副屬性，N/R/SR 移除 SHOES 的 DEF、RING 在 SSR/L 新增小量 DEF 作為主屬性）。
- [x] 6.2 更新 `docs/game-design/item-drop-and-stats.md`：新增「裝備重量分類」章節，記錄分類走向規則、負重折扣公式，並更新 Body/LeftHand/Ring/Shoes 各表格的新數值欄位。
- [x] 6.3 更新 `docs/game-design/content/items.md`：在道具模板總覽表補上 `weaponWeightClass` 欄位。

## 8. 可見負重狀態值（carryCapacity）

- [x] 8.1 `shared/types/common.ts`：`Stats` 新增 `carryCapacity: number`（= `STR + CON`，不受裝備影響）。
- [x] 8.2 `shared/utils/calculateStats.ts`：`calculateBaseStats` 計算 `carryCapacity = STR + CON`；`applyEquipmentStats` 直接透傳（裝備不影響負重本身）。
- [x] 8.3 `shared/schemas/api/character.schema.ts`：`statsSchema` 新增 `carryCapacity`。
- [x] 8.4 前端：`app/composables/useCharacter.ts` 的 `CharacterStats` 新增 `carryCapacity`；`equipmentBonus` 型別補上先前遺漏的 `dodgeChance`。`app/components/game/characterStage.vue` 的 stats 面板新增「負重」欄位（緊接在 HP 之後），並補上「閃避」欄位原本完全沒有顯示 `equipmentBonus.dodgeChance` 加成的缺口（新增 `withEquipmentBonusPercent` helper）。
- [x] 8.5 `server/constants/stats.test.ts`（新建）：`calculateBaseStats`/`applyEquipmentStats` 涵蓋 `carryCapacity = STR+CON`、不受裝備影響、`dodgeChance` clamp 至 `[0, DODGE_CAP]` 等情境。
- [x] 8.6 補充說明「不同職業初始負重不同」：直接沿用各職業既有 `attributes.STR`/`attributes.CON`（`characterArchetypes.ts` 未變動），不需新增職業專屬欄位；`character-progression` spec 新增對應 Scenario 說明。

## 7. 驗證

- [x] 7.1 `pnpm lint`：與變更前 baseline（146 個既有 error，enum member 誤判 unused 的既有 lint 設定問題，跟本次改動無關）比較，本次新增的程式碼未新增額外真正的 lint 違規——僅因新增 `WeaponWeightClass` enum 的 3 個 member 而多出 3 筆同類型既有誤判（146→149）。
- [x] 7.2 `pnpm test`：154/154 全數通過（含新增的 `equipment.service.test.ts` 6 個測試、`item.service.test.ts` 新增的 weaponWeightClass/dodgeChanceMod/sumEquipmentStats 測試）。
- [x] 7.3 `pnpm build`：Client build 與 SSR transform 皆成功；Nitro 最終打包階段因環境缺少 `@img/sharp-wasm32` 平台二進位檔（與本次改動無關的既有依賴安裝問題）而失敗，已改用 `npx vue-tsc --noEmit` 確認全專案型別編譯無誤（無錯誤輸出）。
- [ ] 7.4 手動驗證：裝備一把 HEAVY 武器後，角色 `dodgeChance` 確實下降且不低於 0%；裝備兩把武器到左右手成功；`requestedSlot` 帶入不合法值時前端顯示錯誤而非靜默失敗；提高角色 `STR`/`CON` 後，同一件 HEAVY 裝備造成的懲罰幅度變小。
