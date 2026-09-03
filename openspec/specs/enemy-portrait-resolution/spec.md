# enemy-portrait-resolution

## Purpose

TBD - 敵人 archetype 的穩定識別（slug）與前端頭像美術資源解析規則：優先使用 archetype 專屬美術，缺圖時退回既有 faction+tier 圖。

## Requirements

### Requirement: 每個敵人 Archetype 具備穩定的識別 slug
`server/constants/templates/enemies.ts` 定義的每一個 `EnemyArchetype`（`ENEMY_ARCHETYPES`、`GKBOT_BOSS_ARCHETYPES`、`HUMAN_ARCHETYPES`、`HUMAN_BOSS_ARCHETYPES`，共 32 筆）SHALL 具備一個 `slug` 欄位：全小寫、kebab-case、在全部 32 筆 archetype 中唯一，且其值 SHALL NOT 依賴該筆資料在陣列中的位置（新增/刪除/重排陣列中的其他 archetype 不影響既有 slug）。

#### Scenario: 每個 archetype 都有 slug
- **WHEN** 檢視 `ENEMY_ARCHETYPES`/`GKBOT_BOSS_ARCHETYPES`/`HUMAN_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES` 的每一筆資料
- **THEN** 每筆都有非空的 `slug` 欄位，且 32 個 slug 互不重複

#### Scenario: 調整陣列順序不影響既有 slug
- **WHEN** 在某個 archetype 陣列中間插入一筆新的 `EnemyArchetype`
- **THEN** 陣列中其餘既有 archetype 的 `slug` 值不因位置位移而改變

### Requirement: 戰前預覽提供敵人的 archetype slug
`EnemyPreview`（`POST /api/adventure/advance` 等 API 回傳、供冒險畫面「遭遇敵人」預覽使用）SHALL 在既有 `archetypeIndex` 欄位之外，額外提供 `archetypeSlug` 欄位，其值等於該敵人抽中的 `EnemyArchetype.slug`。

#### Scenario: 預覽清單帶有 slug
- **WHEN** 系統為即將進行的戰鬥節點產生第一波敵人的 `EnemyPreview` 清單
- **THEN** 清單中每一筆 `EnemyPreview` 的 `archetypeSlug` 皆等於該筆敵人所抽中 archetype 的 `slug`

### Requirement: 敵人頭像優先使用 Archetype 專屬美術，缺圖時退回既有 faction+tier 圖
前端敵人頭像解析（供 `combatResultPanel.vue` 逐隻敵人頭像、`adventure.vue` 戰前遭遇預覽使用）SHALL 依序嘗試：(1) 若敵人的 `archetypeSlug` 存在且該值存在於「已有專屬美術的 archetype slug 清單」中，使用 `/images/enemies/{archetypeSlug}.png`；(2) 否則（`archetypeSlug` 為 `undefined`，或有值但不在清單中）使用既有的 `/images/enemies/{faction}-{tier}.png`（`faction` 為該 run 的 `factionType`，`tier` 由 `getEnemyAvatarTier` 依是否為 Boss/Elite 決定）。系統 SHALL NOT 對不在該清單中的 archetype 嘗試請求其專屬圖片路徑。

#### Scenario: Archetype 已有專屬美術
- **WHEN** 某敵人的 `archetypeSlug` 是 `gkbot-repair`，且 `gkbot-repair` 在已有專屬美術的清單中
- **THEN** 該敵人頭像使用 `/images/enemies/gkbot-repair.png`

#### Scenario: Archetype 尚未有專屬美術
- **WHEN** 某敵人的 `archetypeSlug` 不在已有專屬美術的清單中，其 `faction = 'GKBOT'` 且判定為 elite tier
- **THEN** 該敵人頭像使用既有的 `/images/enemies/gkbot-elite.png`，不因缺少專屬圖而顯示破圖或空白

#### Scenario: 歷史戰鬥結果沒有 archetypeSlug
- **WHEN** 某敵人資料來自本 change 上線前寫入的歷史 `lastCombatSummary`，其 `archetypeSlug` 為 `undefined`，`faction = 'HUMAN'` 且判定為 normal tier
- **THEN** 該敵人頭像使用既有的 `/images/enemies/human-normal.png`

#### Scenario: 頭像不因 tier 而改變 archetype 專屬圖
- **WHEN** 同一 archetype（已有專屬美術）分別以 NORMAL 與 ELITE tier 出現
- **THEN** 兩者頭像皆使用同一張 `/images/enemies/{archetypeSlug}.png`，tier 差異由既有的 tier 標籤/樣式呈現，不影響頭像圖片本身
