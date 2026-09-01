## Why

目前裝備系統只有單一數值曲線（ATK/DEF/HP/actionSpeedMod），左右手固定分別是「防具（LEFT_HAND）」與「武器（RIGHT_HAND）」，稀有度越高單純數值越大、沒有取捨。玩家的裝備選擇缺乏策略深度，且左右手綁死角色只能單武單盾。引入輕/中/重量級分類（速度/攻擊力/閃避的三向取捨），套用到全部 6 個裝備槽位（HAND/HEAD/BODY/SHOES/RING），並開放左右手皆可自由裝備武器或防具（雙武器、雙防具皆可），能讓裝備搭配產生實質策略選擇。

## What Changes

- 新增 `weaponWeightClass`（LIGHT / MEDIUM / HEAVY）分類機制，套用於所有 `type: EQUIPMENT` 的道具（不限手部槽位，`HEAD`/`BODY`/`SHOES`/`RING` 亦適用；`POTION` 等非裝備類型不適用）：
  - LIGHT：主打 `actionSpeedMod` 加成（變快），ATK 加成較低；高稀有度（SSR/L）才同時給 ATK + 速度雙加成。
  - MEDIUM：純 ATK 隨稀有度線性成長，無速度/閃避副作用。
  - HEAVY：ATK 加成幅度最大，但 `actionSpeedMod` 與閃避率隨稀有度同步變差（越強懲罰越重）。
- 新增 `ItemStats.dodgeChanceMod` 欄位，並比照現有 `actionSpeedMod` 的累加方式，打通 `equipmentBonus → Stats.dodgeChance` 的加總路徑。
- 角色 `STR`+`CON`（負重能力）越高，`HEAVY` 分類裝備的 `actionSpeedMod`/`dodgeChanceMod` 懲罰以百分比折扣抑制（有折扣上限，不會完全抵銷），讓屬性點分配與裝備選擇產生連動（詳見 design.md 決策 5）。
- 新增 `Stats.carryCapacity`（負重，= `STR + CON`）作為可見狀態值，與 HP 同一 stats 面板顯示；不同職業因初始 `attributes` 不同，初始負重天生不同，不需另立職業專屬欄位。重裝備（`HEAVY`）懲罰沿用既有 `equipmentBonus`（`actionIntervalSec`/`dodgeChance` 已是折扣後數值）反映在同一面板，不新增獨立的「目前懲罰」欄位。
- `LEFT_HAND`/`RIGHT_HAND` 開放自由裝備任一 HAND 類道具（武器或防具），因此可組成雙武器或雙防具。**確認現況**：`equipment.service.ts` 的 `equipItem` 已有 `HAND_SLOTS`（`[RIGHT_HAND, LEFT_HAND]`）機制，只要物品 `equipSlot` 屬於 `HAND_SLOTS` 且呼叫端帶入同屬 `HAND_SLOTS` 的 `requestedSlot`，即可放到另一手——service 層雙手互換的能力已存在但未被 spec 明確定義、也未有前端/驗證行為配套（目前不符時是靜默 fallback 回 `item.equipSlot`，而非報錯）。本次範圍是把這個既有能力正式收斂進 `equipment` spec，並視需要補上明確的驗證/前端支援，而非破壞性的資料結構變更。
- 訂定稀有度加成通則：只有 N 稀有度允許某個副屬性為 0；R 以上每個稀有度都必須有可量測的正向加成（HEAVY 的懲罰視為代價軸，不受此限）。

## Capabilities

### New Capabilities
- `weapon-weight-class`：全部裝備類型（`type: EQUIPMENT`）的輕/中/重量級分類、對應的加成與代價曲線規則、稀有度加成通則。

### Modified Capabilities
- `equipment`：正式定義左右手互換裝備規則（沿用既有 `HAND_SLOTS` service 邏輯：任一 HAND 類 template 皆可指定裝到 LEFT_HAND 或 RIGHT_HAND，含雙武器/雙防具組合），並訂定 `requestedSlot` 不屬於 `HAND_SLOTS` 時的明確行為（目前為靜默 fallback，需決定是否改為報錯）。此互換規則仍僅限 HAND 類槽位，與 `weaponWeightClass` 涵蓋全部槽位是各自獨立的範圍。
- `item-generation`：`ItemTemplate` 新增 `weaponWeightClass` 欄位，全部 6 個 `EQUIPMENT` template（含 HEAD/BODY/SHOES/RING）皆需定義；HAND 類 template 的 `equipSlot` 定義方式另外調整以支援左右手互通，不再綁死單一手部。
- `combat-engine`：閃避判定公式的輸入來源新增裝備帶來的 `dodgeChanceMod`（HEAVY 武器/防具的懲罰，套用 `STR`+`CON` 負重折扣後加總），而非僅由 AGI 決定。
- `character-progression`：`GET /api/character/:characterId` 計算出的 `actionIntervalSec`，其中來自 `HEAVY` 裝備的 `actionSpeedMod` 懲罰需先套用 `STR`+`CON` 負重折扣再累加。

## Impact

- **型別/Schema**：`shared/types/item.ts`（`ItemStats` 新增 `dodgeChanceMod`）、`shared/types/common.ts`（`EquipmentSlot`/裝備槽位比對邏輯可能需調整為 HAND 類共用；`Stats` 新增 `carryCapacity`）、`shared/types/adventure.ts`（`COMBAT_CONFIG` 新增 `HEAVY_PENALTY_MITIGATION_PER_POINT`/`MAX_HEAVY_PENALTY_MITIGATION`）、`shared/schemas/api/character.schema.ts`（`statsSchema` 新增 `carryCapacity`）、`shared/schemas/firestore/character.schema.ts`。
- **前端**：`app/composables/useCharacter.ts`（`CharacterStats` 新增 `carryCapacity`，`equipmentBonus` 型別補上 `dodgeChance`）、`app/components/game/characterStage.vue`（stats 面板新增「負重」欄位，緊接在 HP 之後；閃避欄位補上既有 `equipmentBonus.dodgeChance` 的加成顯示，先前完全沒有顯示裝備對閃避的影響）。
- **Server**：`server/constants/templates.ts`（全部 6 個 `EQUIPMENT` template：`salvaged_wrench`/`riot_shield_scrap`/`gkbot_faceplate`/`supply_crate_vest`/`servo_greaves`/`research_chip_ring` 皆加上 `weaponWeightClass`）、`server/services/item.service.ts`（比照 `sumEquipmentStats` 現有 `actionSpeedMod` 累加邏輯新增 `dodgeChanceMod` 累加）、`server/services/equipment.service.ts`（`equipItem` 既有 `HAND_SLOTS` 互換邏輯，需要明確定義不符時是否要回錯誤，而非目前的靜默 fallback；此部分仍僅限 HAND 類槽位，不受本次擴大範圍影響）。
- **文件**：`docs/game-design/item-drop-and-stats.md`、`docs/game-design/content/items.md` 需要新增輕重分類對應章節（後續 change 或本 change design.md 一併記錄，视細節而定）。
- 不新增新的 `EquipmentSlot`（HEAD/BODY/SHOES/RING 槽位本身不變），但這些槽位既有的 template 皆需納入 `weaponWeightClass` 分類。
