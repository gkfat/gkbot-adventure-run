## Why

6 個裝備 `ItemTemplate`（`salvaged_wrench`／`riot_shield_scrap`／`gkbot_faceplate`／`supply_crate_vest`／`servo_greaves`／`research_chip_ring`）目前只有單一 `name`/`description`，橫跨 N→L 五個稀有度共用同一份文案，只有數值隨稀有度變化。`docs/game-design/item-drop-and-stats.md`／`docs/game-design/content/items.md` 第 4 節已把「每個稀有度獨立文案」的設計定案，但尚未落地成 code，玩家撿到同一 template 的 N 到 L 各稀有度時看到的道具名稱與描述完全相同，體驗上感受不到稀有度帶來的敘事升級。

## What Changes

- 擴充 `ItemTemplate` 型別：`name`/`description` 改為依稀有度變化（`Record<Rarity, string>`），維持每個裝備槽位 1 個 templateId（不拆成多個 template）。**BREAKING**：`ItemTemplate.name`/`description` 的型別由 `string` 改為 per-rarity 物件，所有讀取這兩個欄位的呼叫端需同步改為依 `rolledItem.rarity` 取值。
- `ItemInstance`／`RolledItem` 新增 `name`/`description` 欄位（生成當下依 rolled rarity 從 template 選定文案並固化到 instance，之後即使 template 文案調整也不影響既有物品）。
- `server/constants/templates.ts` 6 個裝備 template 依 `docs/game-design/content/items.md` 第 4 節文案定案填入 N/R/SR/SSR/L 五組 `name`/`description`。
- `POTION`（`engine_oil_basic`）文案維持單一字串（第 4 節本就未替 potion 定義分稀有度文案，`equipment-ideas.md` 也只給了單一基調），不在本次變更範圍內。
- SSR/L「替代外觀池」（`equipment-ideas.md` 第 6 則候補文案，例如頭部的「掠奪者拼裝面罩」、戒指的「陣亡倖存者的婚戒」）與「圖示是否跟著稀有度分級」**不在本次範圍**：這兩者需要新增掉落機率分配機制或圖示對照擴充，超出「補齊既有 5 個稀有度文案」的範圍，留待後續 change 討論。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `item-generation`：「物品模板文案符合世界觀」需求改為依 rolled rarity 選取對應文案，並固化到 `ItemInstance`／`RolledItem`。

## Impact

- `shared/types/item.ts`：`ItemTemplate.name`/`description` 型別變更；`ItemInstance`/`RolledItem` 新增欄位。
- `server/constants/templates.ts`：6 個裝備 template 的文案改寫成 per-rarity。
- `server/services/item.service.ts`（生成邏輯，依 rolled rarity 選字並寫入 instance）。
- 任何讀取 `ItemTemplate.name`/`description` 或 `ItemInstance.name`/`description` 的前後端程式碼（背包/裝備 UI、shop 顯示等）需要盤點是否已改讀 instance 上固化的欄位而非 template。
- Firestore `items` collection 的既有文件（如果環境中已有測試資料）不會回填新欄位；新舊資料並存需在實作階段確認相容策略（例如 UI fallback 到 templateId 對照表）。
