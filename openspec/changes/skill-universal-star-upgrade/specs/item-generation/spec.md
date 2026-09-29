## ADDED Requirements

### Requirement: 技能經驗值晶片為單一稀有度的 MATERIAL 類物品
系統 SHALL 新增 `ItemType.MATERIAL` 分類，並提供一個 `templateId = 'skill_exp_chip'` 的模板：固定 `name`/`description`/`icon`，不分稀有度（`rarity` 固定為單一值，不參與 `rarityWeights` roll），`rolledStats` 為空（不含 ATK/DEF/healPercent 等任何數值欄位）。`generateItemInstance('skill_exp_chip', ...)` SHALL 產生具全域唯一 `itemId` 的 Item Instance，並標記 `source`（DROP/SHOP）。

#### Scenario: 生成技能經驗值晶片實體
- **WHEN** 呼叫 `generateItemInstance('skill_exp_chip', { source: 'SHOP' })`
- **THEN** 回傳的 ItemInstance 有唯一 `itemId`、`templateId = 'skill_exp_chip'`、`type = 'MATERIAL'`，不含任何 `rolledStats` 數值欄位

#### Scenario: MATERIAL 類物品沒有稀有度差異
- **WHEN** 多次生成 `skill_exp_chip` 的物品實體
- **THEN** 每次生成的 `rarity` 皆相同，文案（`name`/`description`）也完全相同
