## Why

玩家目前無法回顧曾經遭遇過的敵人種類與描述，缺少收集/圖鑑要素，也無從得知自己還沒見過哪些敵人。新增「圖鑑」功能讓玩家可在 nav 區域隨時瀏覽已遇過的敵人清單，未遇過的敵人以剪影遮罩呈現，保留探索懸念。

## What Changes

- 新增「圖鑑」按鈕：與既有「切換角色」按鈕同列並排，兩者皆為 col-4 等寬，置於 `app/components/game/accountDrawer.vue`（專案中唯一的 `v-navigation-drawer`）既有選單項目群組，點擊後開啟滿版（fullscreen）圖鑑 dialog。
- 新增 `GameBestiaryDialog` 元件：
  - 上半部大方框：顯示目前選取敵人的頭像、名稱、描述、累積擊敗次數。
  - 下半部：一列 5 個一組的敵人格狀清單（grid），可捲動瀏覽全部 32 種 archetype；點擊任一格頭像即切換上半部顯示內容。
  - 尚未遇過的敵人：頭像以剪影/外形遮罩呈現（看不出實際圖像），名稱/描述以「???」或等效未知態呈現。
  - dialog 最下方提供關閉按鈕。
- 新增角色「已遇過敵人」追蹤機制：於 `characterSchema` 新增 `encounteredArchetypeSlugs: string[]` 欄位，於戰鬥開始（`CombatService` 產生敵人時）寫入本次遭遇的 `archetypeSlug`。
- 新增角色「擊敗次數」追蹤機制：於 `characterSchema` 新增 `defeatedArchetypeCounts: Record<string, number>` 欄位，於戰鬥結算時（不論勝負）依實際擊敗的敵人單位累加對應 `archetypeSlug` 的次數。
- 新增 `GET /api/character/:characterId/bestiary` API：回傳全部 32 種 archetype 的清單，並標記每筆對該角色是否 `encountered`；已遇過的項目附上 name/description/頭像路徑/累積擊敗次數（`defeatedCount`），未遇過的項目隱藏 name/description/defeatedCount（或回傳遮罩用替代值），避免前端能透過原始 API 回應提前得知未解鎖敵人資訊。

## Capabilities

### New Capabilities
- `enemy-bestiary`：追蹤角色已遇過的敵人 archetype、提供圖鑑查詢 API，以及圖鑑 dialog 的資料揭露規則（已遇過 vs 未遇過的顯示差異）。

### Modified Capabilities
（無既有 capability 的 requirements 變更；`encounteredArchetypeSlugs` 為新增欄位，不影響 `character-progression`/`combat-engine` 既有行為契約。）

## Impact

- **Client**: `app/components/game/accountDrawer.vue`（新增選單項目）、新增 `app/components/game/bestiaryDialog.vue`、新增/擴充 `app/utils/enemyAvatar.ts`（剪影遮罩用路徑或樣式）。
- **Server**: `shared/schemas/firestore/character.schema.ts`（新增欄位）、`server/services/combat.service.ts`（寫入 encountered slug 與擊敗次數）、`server/services/character.service.ts`（新增 `recordDefeatedArchetypes`/`getBestiary` 的 `defeatedCount`）、`server/repositories/character.repository.ts`（新增 `updateDefeatedArchetypeCounts`）、新增 `server/api/character/[characterId]/bestiary.get.ts`、新增 `shared/schemas/api/bestiary.schema.ts`、`server/utils/openapi.ts`（註冊新 schema）。
- **Data**: 既有角色文件無 `encounteredArchetypeSlugs`/`defeatedArchetypeCounts` 欄位時，API 需視為空陣列/空物件（向後相容，不需遷移腳本）。
