## MODIFIED Requirements

### Requirement: 戰鬥掉落
系統 SHALL 於戰鬥結束後依 LUCK 調整金幣掉落量與物品掉落機率，並依 enemyLevel 分級決定 gems 掉落機率與數量。系統另 SHALL 於戰鬥勝利結算時，依既有 LUCK 調整後的物品掉落機率判定是否額外掉落技能碎片：命中時從全部通用技能清單（`ALL_CHARACTER_SKILLS`，不再限定角色 `archetypeId`）中等機率隨機挑選一個技能，為該角色 `skillFragments[skillId]` 增加固定數量 `SKILL_FRAGMENT_DROP_AMOUNT`（此固定數量不因 LUCK 而變動，LUCK 只影響「是否掉落」的機率）。系統另 SHALL 於戰鬥勝利結算時，以與技能碎片掉落各自獨立的一次 LUCK 調整後機率判定，額外掉落技能經驗值晶片：命中時為該角色永久背包新增 `SKILL_EXP_CHIP_DROP_AMOUNT` 顆 `templateId = 'skill_exp_chip'` 的道具實體（不綁定特定技能）。

#### Scenario: LUCK 提升掉落
- **WHEN** 兩名 LUCK 不同的角色擊敗相同敵人設定，重複多次模擬
- **THEN** 較高 LUCK 的角色平均掉落金幣量與物品掉落率不低於較低 LUCK 的角色

#### Scenario: enemyLevel 超出已定義範圍
- **WHEN** enemyLevel > 30（FR-040 尚未定案的情境）
- **THEN** 系統套用 20~30 級距的既有 gems 掉落規則作為 fallback，並標記此為 fallback 行為（供之後規則確認後調整）

#### Scenario: 戰鬥勝利額外掉落技能碎片，掉落池不限角色職業
- **WHEN** 角色戰鬥勝利，依 LUCK 調整後的掉落機率判定命中，角色 `archetypeId = 'fighter'`
- **THEN** 系統從全部 10 個通用技能中隨機挑選一個（可能不是 `fighter` 的技能），其 `skillFragments` 增加 `SKILL_FRAGMENT_DROP_AMOUNT`

#### Scenario: 戰鬥勝利額外掉落技能經驗值晶片
- **WHEN** 角色戰鬥勝利，技能經驗值晶片的獨立掉落判定命中
- **THEN** 系統為該角色永久背包新增 `SKILL_EXP_CHIP_DROP_AMOUNT` 顆 `skill_exp_chip` 道具實體

#### Scenario: 戰鬥落敗不掉落技能碎片或晶片
- **WHEN** 角色戰鬥落敗（`victory = false`）
- **THEN** 系統 SHALL NOT 掉落任何技能碎片或技能經驗值晶片
