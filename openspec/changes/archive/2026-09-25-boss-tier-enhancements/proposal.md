## Why

目前每個章節最後一關的 boss 與章節內其他關卡的 boss 強度完全相同，缺乏「章節終局戰」的難度與儀式感；同時 boss 與小兵在戰鬥畫面上的圖像大小一致，玩家無法從畫面直觀分辨敵人位階；圖鑑（enemy-bestiary）目前也未呈現敵人位階（小兵/菁英/強菁英/Boss）資訊。三者皆是強化「敵人位階可感知性」的相關需求，一併規劃。

## What Changes

- 每個章節最後一關（Level）的 BOSS 節點，其 boss 本體（不含隨從/minion）數值（hp/atk/def）在既有計算結果上額外乘上 1.5 倍；此倍率需同時套用於戰前敵人預覽（`EnemyPreview`）與實際戰鬥解算，兩者需保持一致。
- 冒險戰鬥畫面中，boss 節點的 boss 本體圖像顯示尺寸為小兵圖像的 1.2 倍（或等效地在 boss 節點縮小小兵圖像），使玩家可從畫面直觀分辨敵人位階；隨從/minion 圖像大小維持原樣。
- 圖鑑（enemy-bestiary）畫面中，每個已遇過的敵人項目需額外顯示其位階（NORMAL/ELITE/STRONG_ELITE/BOSS，對應既有 `EnemyTier`）。

## Capabilities

### New Capabilities
（無）

### Modified Capabilities
- `combat-engine`: 新增「章節最後一關 boss 強度加成」規則——章節最後一關的 BOSS 節點，boss 本體（非 minion）套用額外 1.5 倍數值加成，且戰前預覽與實際戰鬥需一致。
- `adventure-run-presentation`: 新增「boss 節點敵我圖像尺寸差異化」規則——boss 節點中 boss 本體圖像顯示尺寸為小兵圖像的 1.2 倍。
- `enemy-bestiary`: 圖鑑 API/畫面新增敵人位階（`EnemyTier`）欄位與顯示。

## Impact

- **後端數值**：`server/constants/difficulty.ts`（`getStatMultipliers`）、`server/services/adventure-run.service.ts`（`buildBossNodeData`）、`server/services/combat.service.ts`（`spawnWave`/`buildEnemyUnit`）；`AdventureRun` 文件需新增 `chapterTotalLevels` 快照欄位（`shared/types/adventure.ts`、`shared/schemas/firestore/adventure.schema.ts`、`server/repositories/adventure-run.repository.ts`）以判斷是否為章節最後一關。
- **前端戰鬥畫面**：`app/pages/adventure.vue`（或其子元件）中 boss/minion 圖像渲染邏輯，新增依 `isBoss`/敵人位置判斷的尺寸差異化樣式。
- **圖鑑**：`GET /api/character/:characterId/bestiary` 回應 schema 新增位階欄位（`shared/schemas/api/*`）、`server/services`（bestiary 查詢邏輯）、圖鑑前端元件（顯示位階標籤）。
- **文件**：`docs/game-design/balance/enemy-scaling.md` 需補充章節最後一關 boss ×1.5 規則說明。
- **測試**：`difficulty.test.ts`、`adventure-run.service.test.ts`、`combat.service.test.ts`、bestiary 相關測試需更新/新增。
