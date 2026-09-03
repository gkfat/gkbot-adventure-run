## MODIFIED Requirements

### Requirement: 戰鬥結果包含敵人狀態資料
系統 SHALL 在 `CombatResult.enemies`（`combatSummary.enemies`）的每筆敵人資料中，額外提供 `hpMax`（該敵人的最大生命值）、`isBoss`（是否為 Boss 本體，區別於小兵）與 `archetypeSlug`（該敵人所屬 `EnemyArchetype` 的穩定識別字串，供頭像等前端展示邏輯查找對應美術資產）欄位，供冒險畫面還原每隻敵人在播放進度當下的即時狀態與外觀。`archetypeSlug` 在 schema 層為 optional——系統 SHALL 為每一筆新產生的戰鬥結果填入其值，optional 僅為相容本 change 上線前既有的歷史 `lastCombatSummary` 資料（無法回填）。

#### Scenario: 一般戰鬥的敵人資料
- **WHEN** 玩家觸發一場非 Boss tier 的戰鬥
- **THEN** `combatSummary.enemies` 每筆資料的 `isBoss` 皆為 `false`，`hpMax` 為該敵人依 tier/enemyLevel 計算後的最大生命值，`archetypeSlug` 為該敵人抽中的 archetype 的 slug

#### Scenario: Boss 戰的敵人資料區分本體與小兵
- **WHEN** 玩家觸發一場 BOSS tier 的戰鬥（含小兵陣容）
- **THEN** Boss 本體那筆資料 `isBoss = true`，其餘小兵（含中途補位的小兵）`isBoss = false`，兩者 `hpMax` 分別依 BOSS/STRONG_ELITE 倍率計算，且各自的 `archetypeSlug` 對應各自抽中的 archetype（Boss 本體與小兵可能是不同 archetype）

#### Scenario: 讀取本 change 上線前的歷史戰鬥結果
- **WHEN** 讀取一筆本 change 上線前就已寫入 Firestore 的 `lastCombatSummary`
- **THEN** 其 `enemies[].archetypeSlug` 可能為 `undefined`，schema 驗證 SHALL NOT 因此失敗
