# combat-engine

## Purpose

冒險 run 的 COMBAT 節點戰鬥模擬引擎：伺服器單次決定性模擬整場戰鬥（含多 wave/多敵），套用 RunModifier（Blessing/Curse）於攻防與掉落計算，並依 LUCK/enemyLevel 決定掉落，供冒險畫面顯示結果。

## Requirements

### Requirement: 伺服器單次模擬戰鬥
系統 SHALL 於進入 COMBAT 節點時，以決定性 RNG 一次性模擬整場戰鬥（含多 wave/多敵）至某一方全滅為止，回傳完整 `combatLog` 與 `combatSummary`，且不接受戰鬥進行中的任何玩家操作。

#### Scenario: 單敵單波戰鬥
- **WHEN** 一般 combat 節點只有 1 wave、1 隻敵人
- **THEN** `POST /api/adventure/combat/start` 回傳完整 combatLog（含每次攻擊/暴擊/閃避事件）與 combatSummary（勝負/回合數/掉落）

#### Scenario: 多波多敵戰鬥
- **WHEN** combat 節點決定 waveCount=2、enemyCount=3
- **THEN** combatLog 依序記錄兩個 wave 的所有攻擊事件，直到全部敵人被擊敗或玩家死亡

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

### Requirement: 傷害與命中判定公式
系統 SHALL 以 `damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)` 計算傷害；crit 與 dodge 機率各自以 `base + AGI * 係數` 計算並 clamp 至各自上限（crit 上限 35%、dodge 上限 25%）。

#### Scenario: 一般攻擊傷害下限
- **WHEN** 攻擊方 ATK 小於等於防禦方 DEF
- **THEN** 造成的傷害固定為 1（不會是 0 或負數）

#### Scenario: 暴擊傷害加成
- **WHEN** 本次攻擊判定為 crit
- **THEN** 實際傷害為基礎傷害乘上 `critMultiplier`

#### Scenario: 閃避使攻擊落空
- **WHEN** 防禦方判定閃避成功
- **THEN** 該次攻擊造成 0 傷害，combatLog 記錄為 DODGE 事件

### Requirement: RunModifier 影響戰鬥計算
系統 SHALL 在每次傷害/防禦/掉落計算前，套用所有生效中的 Blessing/Curse（RunModifier），且這些效果僅影響計算期的臨時數值，不修改角色永久資料。

#### Scenario: Blessing 提升攻擊力
- **WHEN** run 內有一個生效中的「+ATK」Blessing
- **THEN** 本場戰鬥的傷害計算使用「基礎 ATK + Blessing 加成」，但角色文件的 attributes/stats 不受影響

### Requirement: 戰鬥掉落
系統 SHALL 於戰鬥結束後依 LUCK 調整金幣掉落量與物品掉落機率，並依 enemyLevel 分級決定 gems 掉落機率與數量。

#### Scenario: LUCK 提升掉落
- **WHEN** 兩名 LUCK 不同的角色擊敗相同敵人設定，重複多次模擬
- **THEN** 較高 LUCK 的角色平均掉落金幣量與物品掉落率不低於較低 LUCK 的角色

#### Scenario: enemyLevel 超出已定義範圍
- **WHEN** enemyLevel > 30（FR-040 尚未定案的情境）
- **THEN** 系統套用 20~30 級距的既有 gems 掉落規則作為 fallback，並標記此為 fallback 行為（供之後規則確認後調整）

### Requirement: Boss 戰鬥數值與獎勵
系統 SHALL 為 BOSS tier 提供獨立於 NORMAL/ELITE/STRONG_ELITE 的難度倍率與獎勵規則：hp/atk/def 倍率高於 STRONG_ELITE；固定 1 wave、1 隻敵人（不套用多波/多敵率率）；擊敗後保底掉落一件裝備（不受 LUCK 掉落機率門檻限制）。

#### Scenario: Boss 固定單體
- **WHEN** 節點 tier 為 BOSS
- **THEN** 戰鬥固定 1 wave、1 隻敵人，不呼叫多波/多敵的隨機判定

#### Scenario: Boss 數值高於 Strong Elite
- **WHEN** 同一 enemyLevel 分別以 STRONG_ELITE 與 BOSS tier 計算 hp/atk/def 倍率
- **THEN** BOSS 的三項倍率皆高於 STRONG_ELITE 對應數值

#### Scenario: Boss 保底掉落
- **WHEN** 玩家擊敗 BOSS 節點的敵人
- **THEN** 系統保證掉落至少一件裝備，不受一般戰鬥的 LUCK 掉落機率門檻限制

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

### Requirement: 冒險畫面顯示戰鬥結果
系統 SHALL 讓玩家在 COMBAT 節點的冒險畫面上主動觸發戰鬥，並在戰鬥結束後看到 combatSummary 與 combatLog。

#### Scenario: 玩家觸發戰鬥
- **WHEN** 玩家在冒險畫面的 COMBAT 節點點擊「開始戰鬥」
- **THEN** 系統呼叫 `POST /api/adventure/combat/start`，並在完成後顯示勝負、回合數、掉落物與簡化版戰鬥紀錄
