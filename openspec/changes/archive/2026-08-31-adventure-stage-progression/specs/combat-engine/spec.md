## ADDED Requirements

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
