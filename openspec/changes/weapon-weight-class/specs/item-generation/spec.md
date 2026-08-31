## ADDED Requirements

### Requirement: 物品實體攜帶重量分類
系統 SHALL 在生成 HAND 類道具的物品實體時，將該 template 的 `weaponWeightClass` 一併帶入 `ItemInstance`，供裝備欄位、戰鬥計算與前端顯示直接讀取，不需額外查詢 template。

#### Scenario: 生成 HAND 類物品實體帶出重量分類
- **WHEN** 呼叫 `generateItemInstance('salvaged_wrench', { source: 'DROP' })`，該 template 定義 `weaponWeightClass = MEDIUM`
- **THEN** 回傳的 `ItemInstance.weaponWeightClass = 'MEDIUM'`

#### Scenario: 非 HAND 類物品實體不含重量分類
- **WHEN** 呼叫 `generateItemInstance('gkbot_faceplate', { source: 'DROP' })`（`equipSlot = HEAD`）
- **THEN** 回傳的 `ItemInstance` 不含 `weaponWeightClass` 欄位

### Requirement: rolledStats 依重量分類納入 dodgeChanceMod
系統 SHALL 在 `type: EQUIPMENT` 且 `weaponWeightClass = HEAVY` 的物品生成時，依該稀有度的 `baseStatsRange.dodgeChanceMod` 區間 roll 出負值加入 `rolledStats`；非 `HEAVY` 分類的物品 `rolledStats` SHALL NOT 含 `dodgeChanceMod`。

#### Scenario: HEAVY 物品的 rolledStats 含閃避懲罰
- **WHEN** 生成一個 `weaponWeightClass = HEAVY` 的物品實體
- **THEN** `rolledStats.dodgeChanceMod` 為負值，且落在該稀有度定義的區間內

#### Scenario: 非 HEAVY 物品的 rolledStats 不含 dodgeChanceMod
- **WHEN** 生成一個 `weaponWeightClass = LIGHT` 或 `MEDIUM` 的物品實體
- **THEN** `rolledStats` 不含 `dodgeChanceMod` 欄位
