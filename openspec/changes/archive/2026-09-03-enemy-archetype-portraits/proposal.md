## Why

敵人頭像目前只依 `faction + tier`（如 `gkbot-elite.png`）解析，32 種 `EnemyArchetype`（GKBOT 小兵×8、GKBOT 頭目×8、HUMAN 小兵×8、HUMAN 頭目×8）全部共用同一張圖，玩家看不出「維修型 GkBot」跟「保全機具」的差異。美術已經開始產出 archetype 專屬肖像（`gkbot-repair.png` 等 4 張），但程式碼沒有任何機制能把 archetype 身分接到畫像解析——需要先把架構補上，美術才能逐步把 32 張補齊。

## What Changes

- 為每個 `EnemyArchetype` 加上穩定的 kebab-case `slug` 欄位（如 `gkbot-repair`），作為畫像檔名依據；不影響現有數值/戰鬥邏輯。
- `CombatResult.enemies`（含 `CombatSummary`）新增 `archetypeSlug` 欄位（schema 層 optional，相容上線前既有的歷史 `lastCombatSummary`；新產生的戰鬥結果一律填值），讓戰鬥結果畫面能逐隻敵人換上專屬頭像，而不是整場戰鬥共用一張——這是既有 API response 的欄位新增，需同步 `shared/schemas/api/*` 與 `server/utils/openapi.ts`。
- `EnemyPreview`（戰前預覽）新增 `archetypeSlug` 欄位，與戰鬥結果使用同一套 slug。
- 新增 archetype 頭像解析函式：優先找 `/images/enemies/{archetypeSlug}.png`；若該 archetype 尚未有專屬美術，fallback 回現有 `/images/enemies/{faction}-{tier}.png`，讓美術可以分階段補齊 32 張、不會有敵人顯示破圖。
- 前端兩處換圖：`combatResultPanel.vue`（戰鬥結果逐隻頭像）、`adventure.vue`（戰前遭遇預覽，目前只有文字，改為文字+頭像）。
- Tier（elite/boss）差異維持由既有的 tier 標籤/樣式呈現，archetype 頭像本身不分 tier（一個 archetype 一張圖，不用畫 3 倍數量）。
- 美術產出（把剩餘 28 種 archetype 畫出來）不在本次 change 範圍內——本 change 只交付「機制讓系統支援每個 archetype 各自一張圖 + fallback」，畫像本身列為後續任務，可用現有 `pixel-art-studio` 技能陸續補上。

## Capabilities

### New Capabilities
- `enemy-portrait-resolution`：定義 archetype slug 的產生規則、前端頭像解析優先序（archetype 專屬圖 → faction+tier fallback）、以及新增/修改一個 archetype 時 slug 與美術資產的對應規則。

### Modified Capabilities
- `combat-engine`：`CombatResult.enemies`（`combatSummary.enemies`）現有的「每筆敵人資料提供 hpMax/isBoss」需求（spec.md 第 185 行）擴充為同時提供 `archetypeSlug`。

## Impact

- `shared/types/adventure.ts`：`Enemy`/`EnemyPreview`/`CombatResult.enemies` 型別新增欄位。
- `shared/schemas/api/*`：對應 Zod schema 新增欄位；`server/utils/openapi.ts` 需同步，避免 runtime 驗證與已發布的 OpenAPI spec 脫鉤。
- `server/constants/templates/enemies.ts`：32 個 `EnemyArchetype` 物件新增 `slug` 欄位。
- `server/services/combat.service.ts`：組裝 `CombatResult.enemies`/`EnemyPreview` 時帶上對應 archetype 的 `slug`。
- `app/utils/enemyAvatar.ts`：新增以 archetype slug 為主、faction+tier 為 fallback 的頭像解析邏輯。
- `app/components/game/combatResultPanel.vue`、`app/pages/adventure.vue`：改用新的頭像解析結果。
- `public/images/enemies/`：現有 4 張圖（`gkbot-repair.png` 等）將被機制正式採用；其餘 28 種 archetype 的圖為後續美術任務，不在本 change 交付範圍。
