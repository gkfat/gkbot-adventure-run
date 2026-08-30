## ADDED Requirements

### Requirement: 依陣營選用敵人範本
系統 SHALL 依章節目前的 `factionType` 選擇敵人範本清單：`GKBOT` 使用既有 `ENEMY_ARCHETYPES`，`HUMAN` 使用新增的 `HUMAN_ARCHETYPES`；Boss 節點 SHALL 只從對應清單中標註為可作 Boss（`bossCapable`）的範本抽取。

#### Scenario: 人類陣營章節的一般戰鬥
- **WHEN** 章節 `factionType = HUMAN`，節點為一般 COMBAT/ELITE/STRONG_ELITE
- **THEN** 敵人從 `HUMAN_ARCHETYPES` 抽取，不出現 `ENEMY_ARCHETYPES`（GkBot）的範本

#### Scenario: 人類陣營章節的 Boss
- **WHEN** 章節 `factionType = HUMAN`，節點為 BOSS
- **THEN** 敵人從 `HUMAN_ARCHETYPES` 中 `bossCapable = true` 的範本抽取

### Requirement: 設施風險分級影響敵人數量與強度
系統 SHALL 依章節目前的 `severityTier` 調整敵人數量機率（wave/enemy count）與 hp/atk/def 倍率：在既有 `getWave2Chance`/`getEnemy2Chance`/`getEnemy3Chance` 結果上疊加 `severityTier` 對應的機率加成（clamp 於既有上限內），並在既有 `getStatMultipliers` 結果上疊加 `severityTier` 對應的整體倍率。

#### Scenario: 高分級提升敵人數量與強度
- **WHEN** 兩個章節分別為 `severityTier = DEEP_WRECK` 與 `severityTier = HIGHLY_ACTIVE`，其餘條件（step/tier）相同
- **THEN** `HIGHLY_ACTIVE` 章節的多波/多敵機率與敵人 hp/atk/def 數值皆不低於 `DEEP_WRECK` 章節

#### Scenario: 中間分級維持既有曲線
- **WHEN** 章節 `severityTier = PARTIAL_ACTIVE`
- **THEN** 敵人數量機率與 hp/atk/def 倍率與本 change 之前的既有曲線一致（不調整）
