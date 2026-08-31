## ADDED Requirements

### Requirement: Boss 小兵補位
系統 SHALL 允許怪物模板將特定 Boss 標記為「具備補位能力」；在 Boss 戰進行中，若該 Boss 具備補位能力、Boss 本身存活，且目前存活小兵數 < 2，系統 SHALL 每滿 3 個戰鬥回合檢查一次，並以 50% 機率補一隻新小兵（沿用開場小兵的模板與 tier 數值），單場 Boss 戰的補位次數 SHALL 累計不超過 2 次；不具備補位能力的 Boss SHALL NOT 觸發此機制，小兵陣亡後不會再補充。

#### Scenario: 具備補位能力的 Boss 補充小兵
- **WHEN** 戰鬥進行到第 3 個整數倍回合，Boss 具備補位能力、Boss 存活、目前小兵數為 0，且本場尚未達補位次數上限
- **THEN** 系統依補位機率判定，命中時生成 1 隻新小兵加入戰場，補位次數 +1

#### Scenario: 不具備補位能力的 Boss 不補位
- **WHEN** Boss 不具備補位能力，且小兵在戰鬥中途全滅
- **THEN** 系統 SHALL NOT 生成新小兵，戰鬥繼續以「Boss 單獨迎戰」進行到結束

#### Scenario: 補位次數達上限後不再補位
- **WHEN** 具備補位能力的 Boss 本場已補位 2 次
- **THEN** 即使小兵數再次 < 2，系統也 SHALL NOT 再觸發補位

### Requirement: 一般戰鬥波次與敵人數上限
系統 SHALL 將一般（NORMAL/ELITE/STRONG_ELITE）Stage 的戰鬥波次限制在 1~2 波，每波敵人數限制在 1~3 隻，具體波次/敵人數由既有的加權機率公式（依 step 遞增）決定，但結果 SHALL NOT 超出上述上下限。

#### Scenario: 波次上限
- **WHEN** 系統依加權機率決定戰鬥波次
- **THEN** `waveCount` 的值只會是 1 或 2，不會出現 3 波以上

#### Scenario: 每波敵人數上限
- **WHEN** 系統依加權機率決定某一波的敵人數
- **THEN** 該波 `enemyCount` 的值介於 1~3（含頭尾），不會出現 4 隻以上

## MODIFIED Requirements

### Requirement: Boss 戰鬥數值與獎勵
系統 SHALL 為 BOSS tier 提供獨立於 NORMAL/ELITE/STRONG_ELITE 的難度倍率與獎勵規則：hp/atk/def 倍率高於 STRONG_ELITE；固定 1 wave，敵人陣容為「1 隻 Boss（BOSS tier 數值）+ 最多 2 隻小兵（沿用 STRONG_ELITE 或既有小兵數值模板）」，小兵數量與是否補位由怪物模板定義（見「Boss 小兵補位」）；擊敗 Boss（該波所有敵人，含小兵，全滅）後保底掉落一件裝備（不受 LUCK 掉落機率門檻限制）。

#### Scenario: Boss 固定單波、Boss 帶小兵
- **WHEN** 節點 tier 為 BOSS
- **THEN** 戰鬥固定 1 wave，敵人陣容為 1 隻 Boss + 最多 2 隻小兵（依怪物模板決定實際小兵數，0~2 之間），不呼叫一般戰鬥的多波/多敵隨機判定

#### Scenario: Boss 數值高於 Strong Elite
- **WHEN** 同一 enemyLevel 分別以 STRONG_ELITE 與 BOSS tier 計算 Boss 本體的 hp/atk/def 倍率
- **THEN** BOSS 本體的三項倍率皆高於 STRONG_ELITE 對應數值

#### Scenario: 擊敗 Boss 陣容才算勝利
- **WHEN** Boss 本體與其小兵中，仍有任一存活
- **THEN** 該場戰鬥 SHALL NOT 判定為玩家勝利，戰鬥繼續進行

#### Scenario: Boss 保底掉落
- **WHEN** 玩家擊敗 BOSS 節點的整組敵人陣容（Boss + 所有小兵）
- **THEN** 系統保證掉落至少一件裝備，不受一般戰鬥的 LUCK 掉落機率門檻限制
