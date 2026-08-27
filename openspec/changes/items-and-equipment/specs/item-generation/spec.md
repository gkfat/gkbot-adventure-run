## ADDED Requirements

### Requirement: 依模板與稀有度生成物品實體
系統 SHALL 於掉落或商店上架當下，依 `templateId` 與其 `rarityWeights` roll 出稀有度（N/R/SR/SSR/L），再依該稀有度的數值區間 roll 出 `rolledStats`（`type: EQUIPMENT` 使用 `baseStatsRange`；`type: POTION` 使用 `healPercentRange`），產生具全域唯一 `itemId` 的 Item Instance，並標記 `source`（DROP/SHOP/EVENT）。

#### Scenario: 生成物品實體
- **WHEN** 呼叫 `generateItemInstance('sword_basic', { source: 'SHOP' })`
- **THEN** 回傳的 ItemInstance 有唯一 `itemId`、`templateId = 'sword_basic'`、`rarity` 落在該模板定義的稀有度集合內、`rolledStats` 落在對應稀有度的 `baseStatsRange` 內

#### Scenario: 稀有度越高數值越好
- **WHEN** 同一 templateId 分別生成 rarity=N 與 rarity=SSR 的實體
- **THEN** SSR 實體的 `rolledStats` 數值上下界皆高於 N 實體的對應區間

#### Scenario: 未知 templateId 拒絕生成
- **WHEN** 呼叫 `generateItemInstance` 時傳入不存在的 templateId
- **THEN** 系統拋出錯誤，不回傳半成品物品

#### Scenario: 生成藥水物品
- **WHEN** 呼叫 `generateItemInstance('potion_basic', { source: 'DROP' })`，該模板 `type = POTION`
- **THEN** 回傳的 ItemInstance 有 `type = POTION`、`rolledStats.healPercent` 落在對應稀有度的 `healPercentRange` 內，且不含 ATK/DEF 等裝備數值
