## ADDED Requirements

### Requirement: 伺服器單次模擬戰鬥
系統 SHALL 於進入 COMBAT 節點時，以決定性 RNG 一次性模擬整場戰鬥（含多 wave/多敵）至某一方全滅為止，回傳完整 `combatLog` 與 `combatSummary`，且不接受戰鬥進行中的任何玩家操作。

#### Scenario: 單敵單波戰鬥
- **WHEN** 一般 combat 節點只有 1 wave、1 隻敵人
- **THEN** `POST /api/adventure/combat/start` 回傳完整 combatLog（含每次攻擊/暴擊/閃避事件）與 combatSummary（勝負/回合數/掉落）

#### Scenario: 多波多敵戰鬥
- **WHEN** combat 節點決定 waveCount=2、enemyCount=3
- **THEN** combatLog 依序記錄兩個 wave 的所有攻擊事件，直到全部敵人被擊敗或玩家死亡

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
