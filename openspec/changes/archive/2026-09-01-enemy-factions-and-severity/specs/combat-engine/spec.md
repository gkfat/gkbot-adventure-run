## ADDED Requirements

### Requirement: 依陣營選用敵人範本
系統 SHALL 依 run 目前的 `factionType` 選擇敵人範本清單：一般戰鬥（COMBAT/ELITE/STRONG_ELITE）節點，`GKBOT` 使用 `ENEMY_ARCHETYPES`、`HUMAN` 使用 `HUMAN_ARCHETYPES`；BOSS 節點，`GKBOT` 使用 `GKBOT_BOSS_ARCHETYPES`、`HUMAN` 使用 `HUMAN_BOSS_ARCHETYPES`。

#### Scenario: 人類陣營 run 的一般戰鬥
- **WHEN** run `factionType = HUMAN`，節點為一般 COMBAT/ELITE/STRONG_ELITE
- **THEN** 敵人從 `HUMAN_ARCHETYPES` 抽取，不出現 `ENEMY_ARCHETYPES`（GkBot）的範本

#### Scenario: 人類陣營 run 的 Boss
- **WHEN** run `factionType = HUMAN`，節點為 BOSS
- **THEN** 敵人從 `HUMAN_BOSS_ARCHETYPES` 抽取

#### Scenario: 機械陣營 run 的 Boss
- **WHEN** run `factionType = GKBOT`，節點為 BOSS
- **THEN** 敵人從 `GKBOT_BOSS_ARCHETYPES` 抽取

### Requirement: 頭目數值不疊加 BOSS tier 倍率
系統 SHALL 對頭目清單（`GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES`）抽出的敵人，套用 `getStatMultipliers(enemyLevel, 'NORMAL')` 的縮放曲線，不再套用 `getStatMultipliers` 的 `'BOSS'` tier 倍率；頭目的最終強度差異全部來自其自身的 `baseAtk`/`baseDef`/`baseHp` 基準值。

#### Scenario: Boss 節點不重複疊加倍率
- **WHEN** 一個 BOSS 節點從頭目清單抽出敵人並計算最終數值
- **THEN** 系統呼叫 `getStatMultipliers` 時傳入 `'NORMAL'` tier，而非 `'BOSS'` tier

### Requirement: 設施風險分級影響敵人數量與強度
系統 SHALL 依 run 目前的 `severityTier` 調整敵人數量機率（wave/enemy count）與 hp/atk/def 倍率：在既有 `getWave2Chance`/`getEnemy2Chance`/`getEnemy3Chance` 結果上乘以 `severityTier` 對應的機率倍率（結果 clamp 於既有上限內），並在既有 `getStatMultipliers` 結果上乘以 `severityTier` 對應的 hp/atk/def 倍率。

#### Scenario: 高分級提升敵人數量與強度
- **WHEN** 兩趟 run 分別為 `severityTier = DEEP_WRECK` 與 `severityTier = HIGHLY_ACTIVE`，其餘條件（step/tier）相同
- **THEN** `HIGHLY_ACTIVE` run 的多波/多敵機率與敵人 hp/atk/def 數值皆不低於 `DEEP_WRECK` run

#### Scenario: 中間分級維持既有曲線
- **WHEN** run `severityTier = PARTIAL_ACTIVE`
- **THEN** 敵人數量機率與 hp/atk/def 倍率與本 change 之前的既有曲線一致（不調整）

### Requirement: 敵人爆擊/閃避依個別範本的 LUK 覆寫值決定
系統 SHALL 於判定敵人爆擊率/閃避率時，優先使用該敵人範本（`EnemyArchetype`）的 `critChanceOverride`/`dodgeChanceOverride`（若有填寫），否則回退使用全域 `ENEMY_COMBAT_STATS` 的預設值。

#### Scenario: 高 LUK 範本使用覆寫值
- **WHEN** 敵人範本設有 `dodgeChanceOverride`（例如「幻影投影體」）
- **THEN** 該敵人的閃避率判定使用 `dodgeChanceOverride`，而非全域 `ENEMY_COMBAT_STATS.dodgeChance`

#### Scenario: 未覆寫時回退全域預設值
- **WHEN** 敵人範本未設定 `critChanceOverride`/`dodgeChanceOverride`
- **THEN** 該敵人的爆擊率/閃避率判定使用全域 `ENEMY_COMBAT_STATS` 的預設值
