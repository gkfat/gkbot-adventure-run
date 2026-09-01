## Context

`ItemTemplate.name`/`description` (`shared/types/item.ts`) are single strings today. `docs/game-design/content/items.md` 第 4 節與 `docs/game-design/item-drop-and-stats.md` 已定案「每個稀有度獨立文案」，需要落地。

生成路徑 `generateItemInstance()`（`server/services/item.service.ts`）目前只把 `templateId`/`type`/`equipSlot`/`weaponWeightClass`/`rarity`/`stats` 寫進 `RolledItem`，不含 `name`/`description`。API 也不回傳這兩個欄位 —— `app/utils/equipmentDisplay.ts` 因此自己維護一份 `TEMPLATE_NAMES`/`TEMPLATE_FLAVOR` 對照表（依 `templateId` keyed，註解明講是「跟 server 端手動保持同步」）。這份對照表若不處理，稀有度分文案後會需要再擴充一個維度（`templateId` × `rarity`），且仍然是與 server 手動同步、容易漂移。

## Goals / Non-Goals

**Goals:**
- 6 個裝備 template 的 `name`/`description` 依 rolled rarity 呈現 `items.md` 第 4 節定案的文案。
- 生成當下把選定的 `name`/`description` 固化到 `ItemInstance`/`RolledItem`，之後 template 文案調整不影響已生成的物品。
- 移除前端 `TEMPLATE_NAMES`/`TEMPLATE_FLAVOR` 這類手動同步對照表，改讀 API 回傳的 instance 欄位，消除「兩份文案要手動保持同步」的維護負擔。

**Non-Goals:**
- 不新增/拆分 templateId（維持每個裝備槽位 1 個 template）。
- 不實作 SSR/L 替代外觀池（`equipment-ideas.md` 第 6 則候補文案）—— 需要額外的掉落機率分配設計，留待後續 change。
- 不變更圖示（`TEMPLATE_ICON`）是否隨稀有度分級 —— 本次僅處理文案文字。
- POTION（`engine_oil_basic`）文案維持單一字串，不分稀有度。

## Decisions

### 1. `name`/`description` 改為 per-rarity 欄位，而非拆分多個 template

`ItemTemplate.name: string` → `name: Record<Rarity, string>`（`description` 同），其餘欄位（`rarityWeights`、`baseStatsRange`、`priceRangeByRarity`）維持不變的結構模式（本來就是 `Record<Rarity, ...>` 或 `Partial<Record<Rarity, ...>>`）。

**替代方案**：拆成多個 template（如 `salvaged_wrench_n`／`salvaged_wrench_r`…），各自帶自己的 `rarityWeights`。
**不採用原因**：會把掉落機率權重從「1 個 template 內的 5 個稀有度」變成「5 個 template 各自的權重」，需要重新設計權重分配、影響 `rollRarity()` 的呼叫介面（目前呼叫端傳入單一 `templateId`，稀有度是 roll 出來的，不是選出來的），屬於資料模型層級的重構，超出「補齊既有稀有度文案」的範圍。per-rarity 欄位是與現有 `baseStatsRange` 一致的既有模式，改動面最小。

### 2. 生成當下固化 `name`/`description` 到 instance，而不是即時查表

`generateItemInstance()` 在 roll 出 `rarity` 後，從 `template.name[rarity]`/`template.description[rarity]` 取值寫入回傳的 `RolledItem`；`ItemInstance`/`RolledItem` 新增 `name: string`、`description: string` 兩個欄位（非 per-rarity，是已固化的單一字串）。

**理由**：`item-generation` spec 既有規則是「Item Instance 一旦生成即代表一個具體物品」，數值也是 roll 完固化、不會因為 template 調整而變動；文案比照同一原則處理，避免『已經在玩家背包裡的舊物品，因為 template 文案改版而顯示跟當初撿到時不同的名字』這種資料不一致。同時讓 API 回傳的 instance 本身自帶完整展示資訊，前端不需要再自己維護 templateId 對照表。

### 3. 移除前端手動同步的 `TEMPLATE_NAMES`/`TEMPLATE_FLAVOR`，改讀 instance 欄位

`app/utils/equipmentDisplay.ts` 的 `describeItem()`／`ItemLike` 型別改為讀 `item.name`/`item.description`（來自 API 回傳的 instance），移除硬編碼對照表。`TEMPLATE_ICON`（圖示對照）維持不變 —— 圖示本次不分稀有度，繼續用 templateId 查表。

**Trade-off**：既有（變更前生成）的 Firestore `items` 文件沒有 `name`/`description` 欄位。若環境中有測試資料，前端讀到 `undefined` 時需要一個明確的 fallback（例如退回顯示 `templateId`），避免顯示空白；不做資料回填遷移（開發環境資料可接受重置，正式環境尚未上線）。

## Risks / Trade-offs

- **[Risk]** `ItemTemplate.name`/`description` 型別變更是 breaking change，任何直接組字串顯示（而非透過 `describeItem()`）的呼叫端會編譯失敗 → **Mitigation**：`pnpm build` 全面抓型別錯誤，逐一改為讀 instance 欄位或依 rarity 取值。
- **[Risk]** 舊資料（無 `name`/`description`）在前端顯示異常 → **Mitigation**：`describeItem()` 對缺欄位的 instance fallback 回 `templateId`（原本沒有文案對照時的既有行為），不新增遷移腳本。

## Migration Plan

無資料庫遷移（開發環境資料視同可重置）。純程式碼變更，依 tasks.md 順序實作 + `pnpm build`/`pnpm test`/`pnpm lint` 驗證即可部署。
