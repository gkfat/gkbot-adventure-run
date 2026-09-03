## Why

目前 Blessing 是「5 個獨立效果、機率抽選」的扁平清單，玩家選到同一個效果第二次時沒有任何額外意義（等同浪費一次選擇）。改成「同一家族可升級到 Lv3，且用 rarity 決定基礎品質」後，重複抽到同家族會變成有意義的成長，也讓 LUCK 對 Blessing 品質的影響更直觀。

## What Changes

- **BREAKING**: `AdventureRun.blessings` 儲存結構由 `string[]`（modifierId 清單）改為 `{ modifierId: string; level: number }[]`，記錄每個已擁有 Blessing 家族的等級。
- Blessing 模板新增 `levels`（Lv1~Lv3 各自的效果數值，name/description 三級共用）與 `rarity: COMMON | RARE | EPIC`（取代現有 `tier: MINOR | MAJOR`），rarity 越高基礎效果越好。
- 候選生成邏輯改為「先算每個家族下一個可提供的等級（未擁有→Lv1，已有 LvN(N<3)→LvN+1，已滿 Lv3→排除），再依 rarity + LUCK 加權抽選」，取代現行純機率抽選。
- 選擇 Blessing 時，若該家族尚未擁有則新增為 Lv1；若已擁有 LvN 則原地升級為 LvN+1（取代舊效果數值，不新增一筆）。
- 擴充 Blessing 模板家族數量，避免玩家在單次 run 內把所有家族都點滿 Lv3。
- Blessing 選擇 UI（`blessingSelectDialog.vue`）依 rarity 顯示外框顏色與左上角徽章（沿用裝備稀有度的呈現手法），並在右上角顯示 `LV.N`。
- Curse 不受影響，維持現有扁平、無等級的機制。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `blessings-and-curses`：新增「Blessing 分級（Lv1~Lv3）與家族內升級」「rarity 取代 tier、影響候選加權」兩項需求；「候選生成」「選擇後生效」相關 Requirement/Scenario 需更新以反映升級語意。

## Impact

- **Shared**: `shared/constants/blessings.ts`（模板改結構：`levels` + `rarity`）、`shared/types/adventure.ts`（`RunModifier`/`AdventureRun.blessings` 型別）、`shared/schemas/firestore/adventure.schema.ts`、`shared/schemas/api/adventure.schema.ts`。
- **Server**: `server/services/blessing.service.ts`（候選生成邏輯重寫）、`server/api/adventure/blessing/select.post.ts`（新增 vs 升級判斷）、套用 Blessing 效果到戰鬥數值的邏輯（`server/services/combat.service.ts` 或 `adventure-run.service.ts` 內讀取 `blessings` 的地方，需改成依 level 取值）。
- **App**: `app/components/game/blessingSelectDialog.vue`（rarity 外框/徽章、LV 徽章）、`app/composables/useAdventureRun.ts`（型別同步）。
- **相容性**：`AdventureRun.blessings` 為 run-scoped 短生命週期資料，目前皆為測試資料，直接改型別、不做舊資料遷移。
