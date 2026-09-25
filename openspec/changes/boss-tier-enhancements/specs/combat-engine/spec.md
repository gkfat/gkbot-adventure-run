## ADDED Requirements

### Requirement: 章節最後一關 Boss 強度加成
系統 SHALL 在判定當前 BOSS 節點所屬的 Level 為其所屬 Chapter 的最後一關（`run.levelIndex + 1 >= run.chapterTotalLevels`）時，對該 boss 本體（不含隨從/minion）依既有 tier/severity 計算所得的 `{hp, atk, def}` 倍率再額外乘上 1.5；此加成 SHALL 同時套用於戰前敵人陣容預覽（`buildBossNodeData` 產出的 `EnemyPreview`）與實際戰鬥解算（`spawnWave`/`buildEnemyUnit` 產出的 `CombatUnit`），兩者對同一場戰鬥 SHALL 得出一致的數值。boss 隨從/minion 的數值 SHALL NOT 受此加成影響。

#### Scenario: 章節最後一關的 boss 數值提升
- **WHEN** 某場戰鬥的 BOSS 節點所屬 Level 為其所屬 Chapter 的最後一關
- **THEN** 該 boss 本體的 `hp`/`atk`/`def` 為「未套用此加成前的原始計算值」乘以 1.5（取整規則與既有計算方式一致）

#### Scenario: 章節內非最後一關的 boss 數值不變
- **WHEN** 某場戰鬥的 BOSS 節點所屬 Level 不是其所屬 Chapter 的最後一關
- **THEN** 該 boss 本體的 `hp`/`atk`/`def` 維持既有計算結果，不套用額外倍率

#### Scenario: 章節最後一關的 boss 隨從數值不受影響
- **WHEN** 某場戰鬥的 BOSS 節點所屬 Level 為其所屬 Chapter 的最後一關，且該 boss 帶有隨從
- **THEN** 隨從單位的 `hp`/`atk`/`def` 維持既有計算結果，不套用額外倍率

#### Scenario: 戰前預覽與實際戰鬥數值一致
- **WHEN** 玩家在章節最後一關的 BOSS 節點於觸發戰鬥前看到敵人陣容預覽，之後觸發實際戰鬥
- **THEN** 預覽中 boss 的 `hp` 與實際戰鬥中 boss 單位的 `hpMax` 數值一致
