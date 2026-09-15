## ADDED Requirements

### Requirement: 戰鬥結算納入武器熟練度與攻擊型態判定
系統 SHALL 在 `POST /api/adventure/combat/start` 的戰鬥模擬流程中，對玩家的每一次攻擊套用 `weapon-attack-pattern` capability 定義的目標型態判定（單體/AoE/濺射），並在戰鬥結算完成時依 `weapon-proficiency` capability 的規則一次性更新角色的 `weaponProficiency`；這兩項行為 SHALL 是同一次 `resolve()` 呼叫的一部分，與既有的 `recordEncounteredArchetypes`/`recordDefeatedArchetypes` 副作用寫入屬於同一批次。

#### Scenario: 戰鬥結算同時更新遭遇紀錄與武器熟練度
- **WHEN** 一場戰鬥結束（勝利或落敗）
- **THEN** 該次 `resolve()` 呼叫除了既有的敵人遭遇/擊殺紀錄更新，也一併完成角色 `weaponProficiency` 的 exp/level 更新，不需要額外的 API 呼叫

### Requirement: 戰鬥被動效果只存在於單場戰鬥
系統 SHALL 為 `CombatUnit` 提供暫時性狀態效果（供 `weapon-proficiency` capability 的類型被動使用），效果只在該場戰鬥的模擬期間存在，戰鬥結束後 SHALL NOT 寫回任何持久化資料，下一場戰鬥的單位狀態 SHALL 從無效果的初始狀態開始。

#### Scenario: 狀態效果不跨場次
- **WHEN** 玩家在某場戰鬥中觸發了一個類型被動附加的狀態效果
- **THEN** 該效果只影響當前這場戰鬥的後續攻擊，下一場戰鬥開始時玩家單位不帶有該效果
