## 1. 型別調整

- [x] 1.1 `shared/types/item.ts`：`ItemTemplate.name`/`description` 改為 `Record<Rarity, string>`（僅 EQUIPMENT 類型意義上分稀有度；POTION 模板仍填同一字串於所有 5 個 key，或視實作決定改為 union type 讓 POTION 維持 `string` —— 依實作時的型別可讀性取捨，不影響行為）。
- [x] 1.2 `ItemInstance`／`RolledItem` 新增固化欄位 `name: string`、`description: string`。

## 2. 資料落地

- [x] 2.1 `server/constants/templates.ts`：6 個裝備 template（`salvaged_wrench`／`riot_shield_scrap`／`gkbot_faceplate`／`supply_crate_vest`／`servo_greaves`／`research_chip_ring`）依 `docs/game-design/content/items.md` 第 4 節文案定案填入 N/R/SR/SSR/L 五組 `name`/`description`（含 SSR 主文案，不含替代款——替代款留待後續 change）。
- [x] 2.2 `engine_oil_basic`（POTION）文案維持不變。

## 3. 生成邏輯

- [x] 3.1 `server/services/item.service.ts` 的 `generateItemInstance()`：roll 出 `rarity` 後，從 `template.name[rarity]`/`template.description[rarity]`（EQUIPMENT）或 `template.name`/`template.description`（POTION）取值，寫入回傳的 `RolledItem`。
- [x] 3.2 補齊/更新 `server/services/item.service.test.ts`：涵蓋「同一 templateId 不同稀有度回傳不同 name/description」「POTION 文案維持單一字串」。

## 4. 前端顯示

- [x] 4.1 `app/utils/equipmentDisplay.ts`：`ItemLike` 型別新增 `name`/`description` 欄位；`describeItem()` 改讀 `item.name`/`item.description`，缺欄位時 fallback 回 `item.templateId`。
- [x] 4.2 移除 `TEMPLATE_NAMES`、`TEMPLATE_FLAVOR` 這兩個手動同步對照表（`TEMPLATE_ICON` 圖示對照維持不變）。
- [x] 4.3 確認呼叫 `describeItem()`/讀取 item name 的元件（背包、裝備欄、商店、戰鬥掉落列表等）型別對齊，`pnpm build` 無型別錯誤。

## 5. 驗證

- [x] 5.1 `pnpm lint`（149 個既有 lint 問題與本次變更無關，`git stash` 驗證同樣存在，非本次引入）
- [x] 5.2 `pnpm test`（164/164 通過）
- [x] 5.3 `pnpm build`（client 階段成功、無型別錯誤；nitro server 階段因環境缺少 `@img/sharp-wasm32` symlink 目標而失敗，屬既有環境問題、與本次程式碼無關）
- [x] 5.4 以 `getItemTemplate()` 直接驗證（暫存 test 已刪除）：`salvaged_wrench` N/L、`research_chip_ring` SSR、`engine_oil_basic` 文案皆與 `docs/game-design/content/items.md` 第 4 節定案內容一致。
