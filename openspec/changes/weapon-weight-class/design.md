## Context

現有裝備數值系統（`shared/types/item.ts` `ItemStats`）只有 `ATK`/`DEF`/`HP`/`actionSpeedMod`/`healPercent`，7 個 `ItemTemplate`（`server/constants/templates.ts`）皆是「1 template 橫跨 N→L 五個稀有度」，數值單純隨稀有度變大、沒有任何取捨。`dodgeChance`/`critChance` 目前只由角色 AGI 屬性決定（`COMBAT_CONFIG`，見 `openspec/specs/combat-engine/spec.md`），裝備完全無法影響。

裝備槽位驗證（`server/services/equipment.service.ts` `equipItem`，第43-81行）已存在 `HAND_SLOTS = [RIGHT_HAND, LEFT_HAND]` 機制：只要物品 `equipSlot` 屬於 `HAND_SLOTS`，呼叫端可用 `requestedSlot`（同屬 `HAND_SLOTS`）指定裝到另一手；若 `requestedSlot` 不屬於 `HAND_SLOTS`，靜默 fallback 回 `item.equipSlot`，不會報錯。這代表「左右手互換」的底層能力已經存在，只是從未在 spec 中定義、也沒有 UI 支援選擇裝到哪一手。

Stats 加總集中在兩處：`item.service.ts` 的 `sumEquipmentStats`（純函式，逐件裝備 reduce 加總 ATK/DEF/HP/actionSpeedMod）與 `character.service.ts` 的 `withStats`/`getEquipmentBonus`（組出 `CharacterWithStats.equipmentBonus` 並套用到最終 Stats）。新增 `dodgeChanceMod` 要走同一條路徑。

## Goals / Non-Goals

**Goals:**
- 為 HAND 類道具（目前 `salvaged_wrench` RIGHT_HAND、`riot_shield_scrap` LEFT_HAND）新增 `weaponWeightClass`（LIGHT/MEDIUM/HEAVY）分類與對應數值曲線。
- 打通裝備 `dodgeChanceMod` → `Stats.dodgeChance` 的加總路徑，讓 HEAVY 類道具能拖累閃避率。
- 在 `equipment` spec 中正式定義左右手互換規則，沿用既有 `HAND_SLOTS` 邏輯，決定 `requestedSlot` 不合法時的明確行為。
- 訂定稀有度加成通則：只有 N 稀有度允許某副屬性為 0；R 以上每級皆需有可量測的正向加成（HEAVY 的懲罰視為代價軸例外）。

**Non-Goals:**
- 不新增新的 EquipmentSlot（不動 `HEAD`/`BODY`/`SHOES`/`RING`）。
- 不重構「1 template 橫跨 5 稀有度」的既有限制（`docs/game-design/content/items.md` 第 5 節缺口）——本次 `weaponWeightClass` 是掛在 template 層級的靜態屬性，不隨稀有度變化，不需要拆分多 template。
- 不落地 `equipment-ideas.md` 的稀有度分文案（獨立議題，見 `items.md`）。
- 不新增 crit 相關的裝備加成（本次僅處理 dodge）。

## Decisions

### 1. `weaponWeightClass` 掛在 `ItemTemplate` 層，不隨稀有度變動
每個 HAND 類 template 天生是 LIGHT/MEDIUM/HEAVY 之一（例如 `salvaged_wrench` 定為 MEDIUM，未來新武器 template 各自定調），而非同一 template 在不同稀有度切換類別。
**理由**：符合現況「1 template = 1 把武器的身份」設計；weight class 是武器的「種類」而非「強度」，強度仍交給既有 `baseStatsRange` 按稀有度決定。
**替代方案（不採用）**：weight class 隨稀有度切換——複雜度高，且與「越稀有威脅感越重」的敘事設計（`equipment-ideas.md` 文案方向備註）衝突。

### 2. 新增 `ItemStats.dodgeChanceMod`，比照 `actionSpeedMod` 走同一條累加路徑
在 `sumEquipmentStats`（`item.service.ts:96-108`）比照 `actionSpeedMod → acc.actionIntervalSec` 的寫法，新增 `dodgeChanceMod → acc.dodgeChance` 累加；`character.service.ts` 的 `withStats`/`getEquipmentBonus` 不需改動邏輯，只是 `Stats` 多一個非零欄位被過濾進 `equipmentBonus`。
**理由**：現有路徑已證明可用，維持一致的加總機制，不引入新的資料流。
**替代方案（不採用）**：另開一條獨立的「裝備閃避加成」計算路徑——會產生兩套 equipment bonus 邏輯，違反既有架構一致性。

### 3. `equipment` spec 正式收斂既有 `HAND_SLOTS` 能力，`requestedSlot` 不合法時明確拒絕
目前「不符時靜默 fallback」在語意上等於「忽略玩家指定」，容易讓前端誤以為裝到了指定的手。改為：`requestedSlot` 有帶入但不屬於 `HAND_SLOTS`（或物品本身不是 HAND 類 template 卻帶了 `requestedSlot`）時，回傳 400，不修改 equipment。
**理由**：符合現有 `equipment` spec「物品槽位不符 → 回傳 400」的既定模式（`openspec/specs/equipment/spec.md` Scenario: 物品槽位不符），一致優於新增例外情況的靜默行為。
**替代方案（不採用）**：維持靜默 fallback——保留現況風險（前端誤判裝備結果），不採用。

### 4. 稀有度加成通則以「HEAVY 懲罰不算加成」界定，不修改既有 rarity-weights/掉落機制
只調整 `baseStatsRange` 的數值設計原則，不動 `rarityWeights`（掉落機率）與稀有度判定流程。
**理由**：限縮改動範圍在數值曲線設計，不牽動 `item-generation` 既有「依模板與稀有度生成物品實體」的生成演算法本體。

## Risks / Trade-offs

- **[Risk]** `equipItem` 的行為變更（不合法 `requestedSlot` 從靜默 fallback 改為 400）可能影響現有前端呼叫方式，若前端目前未帶 `requestedSlot` 或帶了非 HAND 類的值。→ **Mitigation**：實作前先盤點所有呼叫 `equip` API 的前端程式碼（`app/composables/useCharacter.ts` 等），確認目前是否已有依賴靜默 fallback 的呼叫路徑；tasks.md 中列為前置查核項目。
- **[Risk]** HEAVY 武器讓角色閃避率可能被拖到很低甚至負值（若計算未 clamp）。→ **Mitigation**：`dodgeChanceMod` 累加後仍需套用既有 `DODGE_CAP`/下限 clamp（`COMBAT_CONFIG`），沿用 combat-engine 既有 clamp 邏輯，不需新增獨立上下限機制。
- **[Risk]** 只有 `salvaged_wrench`/`riot_shield_scrap` 兩個 HAND 類 template，weight class 的三分法（LIGHT/MEDIUM/HEAVY）目前只能各自代表 1 個實例，設計上的「取捨感」要等未來新增更多武器 template 才會真正顯現。→ **Mitigation**：本次先定機制與規則，具體新增武器內容留待後續 change（呼應 `docs/game-design/content/items.md` 第 5 節既有缺口）。

## Migration Plan

1. 新增型別欄位（`ItemStats.dodgeChanceMod`、`ItemTemplate.weaponWeightClass`）——向下相容（optional 欄位）。
2. 更新 `server/constants/templates.ts` 既有 2 個 HAND 類 template，補上 `weaponWeightClass`（不影響既有 `baseStatsRange` 數值，先分類不改強度）。
3. 打通 `sumEquipmentStats` 的 `dodgeChanceMod` 累加。
4. 調整 `equipItem` 的 `requestedSlot` 驗證邏輯（明確拒絕不合法值）。
5. 前端補上左右手選擇 UI（若目前尚未支援指定 `requestedSlot`）。
無需資料遷移（既有 Firestore 文件不含新欄位時視為 `undefined`，加總邏輯以 `?? 0` 處理）。

## Open Questions

- HEAVY 類的懲罰數值曲線（`actionSpeedMod`/`dodgeChanceMod` 隨稀有度惡化的具體區間）由誰定案？本 change 只訂通則，具體數字建議在 tasks 實作階段搭配 `docs/game-design/item-drop-and-stats.md` 一併補上。
- `LEFT_HAND`/`RIGHT_HAND` 互換是否也要開放給非武器的 `HEAD`/`BODY`/`SHOES`/`RING`？目前範圍限定在既有 `HAND_SLOTS`，若之後有其他部位也要互換需求，屬於另一個 change。
