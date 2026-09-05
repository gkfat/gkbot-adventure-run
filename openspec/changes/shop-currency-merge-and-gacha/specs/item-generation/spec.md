## MODIFIED Requirements

### Requirement: 依模板與稀有度生成物品實體
系統 SHALL 於掉落或商店上架當下，依 `templateId` 與其 `rarityWeights` roll 出稀有度（N/R/SR/SSR/L），再依該稀有度的數值區間 roll 出 `rolledStats`（`type: EQUIPMENT` 使用 `baseStatsRange`；`type: POTION` 使用 `healPercentRange`），產生具全域唯一 `itemId` 的 Item Instance，並標記 `source`（DROP/SHOP/EVENT）。呼叫端 SHALL 可選擇性提供 `rarityWeightsOverride`，此時稀有度 roll 改用該覆寫權重表取代 template 自身的 `rarityWeights`；未提供時行為與既有邏輯完全一致。

#### Scenario: 生成物品實體
- **WHEN** 呼叫 `generateItemInstance('salvaged_wrench', { source: 'SHOP' })`
- **THEN** 回傳的 ItemInstance 有唯一 `itemId`、`templateId = 'salvaged_wrench'`、`rarity` 落在該模板定義的稀有度集合內、`rolledStats` 落在對應稀有度的 `baseStatsRange` 內

#### Scenario: 稀有度越高數值越好
- **WHEN** 同一 templateId 分別生成 rarity=N 與 rarity=SSR 的實體
- **THEN** SSR 實體的 `rolledStats` 數值上下界皆高於 N 實體的對應區間

#### Scenario: 未知 templateId 拒絕生成
- **WHEN** 呼叫 `generateItemInstance` 時傳入不存在的 templateId
- **THEN** 系統拋出錯誤，不回傳半成品物品

#### Scenario: 生成藥水物品
- **WHEN** 呼叫 `generateItemInstance('engine_oil_basic', { source: 'DROP' })`，該模板 `type = POTION`
- **THEN** 回傳的 ItemInstance 有 `type = POTION`、`rolledStats.healPercent` 落在對應稀有度的 `healPercentRange` 內，且不含 ATK/DEF 等裝備數值

#### Scenario: 提供覆寫權重表時改用覆寫值 roll 稀有度
- **WHEN** 呼叫 `generateItemInstance(templateId, { source: 'SHOP', rarityWeightsOverride: { N: 0, R: 0, SR: 55, SSR: 35, L: 10 } })`
- **THEN** 系統以 `rarityWeightsOverride` 而非該 template 的 `rarityWeights` 計算稀有度機率分布，roll 出的 `rarity` 不落在權重為 0 的稀有度上

#### Scenario: 未提供覆寫權重表時維持既有行為
- **WHEN** 呼叫 `generateItemInstance` 時未帶 `rarityWeightsOverride`
- **THEN** 稀有度 roll 完全依 template 自身的 `rarityWeights`（受 `maxRarity`/`minRarity` 篩選），與此變更前行為一致
