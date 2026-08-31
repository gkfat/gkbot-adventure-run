## ADDED Requirements

### Requirement: 戰鬥結果包含敵人狀態資料
系統 SHALL 在 `CombatResult.enemies`（`combatSummary.enemies`）的每筆敵人資料中，額外提供 `hpMax`（該敵人的最大生命值）與 `isBoss`（是否為 Boss 本體，區別於小兵）欄位，供冒險畫面還原每隻敵人在播放進度當下的即時狀態。

#### Scenario: 一般戰鬥的敵人資料
- **WHEN** 玩家觸發一場非 Boss tier 的戰鬥
- **THEN** `combatSummary.enemies` 每筆資料的 `isBoss` 皆為 `false`，`hpMax` 為該敵人依 tier/enemyLevel 計算後的最大生命值

#### Scenario: Boss 戰的敵人資料區分本體與小兵
- **WHEN** 玩家觸發一場 BOSS tier 的戰鬥（含小兵陣容）
- **THEN** Boss 本體那筆資料 `isBoss = true`，其餘小兵（含中途補位的小兵）`isBoss = false`，兩者 `hpMax` 分別依 BOSS/STRONG_ELITE 倍率計算

## MODIFIED Requirements

### Requirement: 冒險畫面顯示戰鬥結果
系統 SHALL 讓玩家在 COMBAT 節點的冒險畫面上主動觸發戰鬥；戰鬥完成後，冒險畫面 SHALL 依 `combatLog` 各筆事件的 `timestamp`（相對戰鬥時間，ms）逐筆／逐批播放戰鬥紀錄，而不是一次性全部顯示：相鄰兩批事件之間的等待時間 SHALL 等於兩者 `timestamp` 的差值，同一個 `timestamp` 的多筆事件 SHALL 視為同一批同時顯示；`combatSummary`（勝負、回合數、EXP、金幣、寶石、掉落物）SHALL 在最後一批戰鬥紀錄顯示完畢後才呈現。播放期間，冒險畫面 SHALL 顯示一份敵人狀態面板（依目前已播放的批次即時反映每隻敵人的階級、名稱、目前 HP／最大 HP），並 SHALL 以旋轉動畫（rotate-spinner）視覺化呈現距離下一批戰鬥紀錄顯示的倒數；旋轉一圈的動畫時長 SHALL 等於目前批次到下一批次之間的等待時間。

#### Scenario: 玩家觸發戰鬥
- **WHEN** 玩家在冒險畫面的 COMBAT 節點點擊「開始戰鬥」
- **THEN** 系統呼叫 `POST /api/adventure/combat/start`，取得完整 `combatLog` 與 `combatSummary` 後開始逐批播放

#### Scenario: 依 timestamp 差值逐批播放
- **WHEN** `combatLog` 依序有 timestamp 為 `[0, 2000, 2000, 4500]` 的事件
- **THEN** 冒險畫面立即顯示第 1 筆（timestamp=0），等待 2000ms 後同時顯示第 2、3 筆（同為 timestamp=2000），再等待 2500ms 後顯示第 4 筆（timestamp=4500）

#### Scenario: 摘要延後至播放完畢才顯示
- **WHEN** 戰鬥的 `combatLog` 尚未播放完最後一批事件
- **THEN** 冒險畫面 SHALL NOT 顯示 `combatSummary`（回合數/EXP/金幣/寶石/掉落物），僅顯示目前已播放的戰鬥紀錄與敵人狀態面板

#### Scenario: 播放完畢後顯示完整摘要
- **WHEN** `combatLog` 最後一批事件顯示完畢
- **THEN** 冒險畫面顯示完整 `combatSummary`（勝負、回合數、掉落物與簡化版戰鬥紀錄），且倒數用的旋轉動畫 SHALL NOT 再顯示

#### Scenario: 敵人狀態面板隨播放進度更新
- **WHEN** 目前已播放的批次包含某敵人的 `targetHpRemaining` 或 `DEATH` 事件
- **THEN** 敵人狀態面板中該敵人的 HP／存活狀態 SHALL 依最新一筆已播放事件更新，尚未被攻擊到的敵人維持顯示 `hpMax`

#### Scenario: 只有 Boss 戰才顯示階級標籤
- **WHEN** 這場戰鬥的敵人資料中沒有任何一筆 `isBoss = true`
- **THEN** 敵人狀態面板 SHALL NOT 顯示「頭目」/「小兵」階級標籤，僅顯示名稱與 HP

#### Scenario: 倒數旋轉動畫時長對齊下一批間隔
- **WHEN** 目前已顯示到第 N 批戰鬥紀錄，且第 N+1 批的 `timestamp` 與第 N 批相差 2500ms
- **THEN** 旋轉動畫的單圈時長 SHALL 為 2500ms，且在第 N+1 批顯示時重新開始下一輪倒數
