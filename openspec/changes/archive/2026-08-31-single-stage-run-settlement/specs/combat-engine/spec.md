## ADDED Requirements

### Requirement: 戰鬥擊敗敵人獲得 EXP
系統 SHALL 於戰鬥中每擊敗一名敵人時，依 `enemyLevel` 與該敵人所屬節點的 tier（NORMAL/ELITE/STRONG_ELITE/BOSS）計算獲得的 EXP，並累加進 `CombatResult.expGained`；系統 SHALL NOT 產生或回傳任何「分數（score）」相關欄位。

#### Scenario: 一般敵人的 EXP
- **WHEN** 玩家擊敗一名 tier=NORMAL、enemyLevel=5 的敵人
- **THEN** `CombatResult.expGained` 依 `enemyLevel * 基礎倍率 * tier 倍率` 計算並累加

#### Scenario: 高階 tier 獲得更多 EXP
- **WHEN** 同一 enemyLevel 分別以 NORMAL/ELITE/STRONG_ELITE/BOSS tier 擊敗敵人
- **THEN** 獲得的 EXP 依 tier 遞增（BOSS > STRONG_ELITE > ELITE > NORMAL）

#### Scenario: 戰鬥失敗不獲得 EXP
- **WHEN** 玩家在戰鬥中被擊敗（`victory = false`）
- **THEN** `CombatResult.expGained = 0`

### Requirement: 戰鬥前顯示第一波敵人陣容
系統 SHALL 在決定 COMBAT/ELITE/STRONG_ELITE/BOSS 節點時，一併決定該次遭遇第一波的完整敵人陣容（每個敵人的種類、名稱、描述、依 tier/enemyLevel 計算後的生命值），並存入該節點的 `currentNodeData`，供冒險畫面在玩家觸發戰鬥前顯示；後續波次（若有）SHALL NOT 於此時決定或顯示，維持在戰鬥實際解算時才決定。

#### Scenario: 單波敵人顯示完整陣容
- **WHEN** 系統決定一個 `waveCount = 1` 的 COMBAT 節點
- **THEN** `currentNodeData` 包含該波每個敵人的名稱、描述、生命值，冒險畫面可於玩家點擊「開始戰鬥」前顯示

#### Scenario: 多波敵人只揭露第一波
- **WHEN** 系統決定一個 `waveCount = 2` 的節點
- **THEN** `currentNodeData` 只包含第一波的敵人陣容，不包含第二波的任何敵人資訊

#### Scenario: 陣容預覽與實際戰鬥結果一致
- **WHEN** 玩家觸發戰鬥，系統實際模擬第一波戰鬥
- **THEN** 第一波實際出現的敵人種類與節點生成時預覽的陣容完全一致（同一組 archetype 選擇，不因戰鬥解算而重新決定）
