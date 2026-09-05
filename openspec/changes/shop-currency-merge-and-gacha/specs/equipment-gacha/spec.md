## ADDED Requirements

### Requirement: 消耗貨幣抽取隨機裝備
系統 SHALL 提供以金幣或寶石抽取一件隨機裝備的功能：每次抽取消耗固定金幣 100 或固定寶石 5（二擇一，玩家指定使用哪種貨幣），系統依該貨幣專屬的稀有度權重表 roll 出一件裝備並直接發放到角色永久背包；不涉及「上架後再購買」的商品清單，每次呼叫即時 roll 即時發放。

#### Scenario: 以金幣抽取
- **WHEN** 玩家對某角色呼叫 `POST /api/character/{characterId}/gacha/pull`，`currency = GOLD`，該角色金幣餘額 ≥ 100
- **THEN** 系統扣除 100 金幣，依金幣稀有度權重表 roll 出一件裝備物品實體，寫入 `items` collection 並加入該角色永久背包，回應中回傳該物品實體

#### Scenario: 以寶石抽取
- **WHEN** 玩家對某角色呼叫 `POST /api/character/{characterId}/gacha/pull`，`currency = GEMS`，該角色寶石餘額 ≥ 5
- **THEN** 系統扣除 5 寶石，依寶石稀有度權重表 roll 出一件裝備物品實體，寫入 `items` collection 並加入該角色永久背包，回應中回傳該物品實體

#### Scenario: 貨幣不足
- **WHEN** 玩家指定 `currency = GOLD` 但角色金幣餘額 < 100（或 `currency = GEMS` 但寶石餘額 < 5）
- **THEN** 系統回傳 400，不扣款、不 roll、不發放物品

#### Scenario: 背包已滿
- **WHEN** 角色永久背包已達 500 格上限（`inventory` capability 的容量限制）
- **THEN** 系統回傳 400，不扣款、不發放物品——整筆交易回滾，不留部分狀態（不可出現「已扣款但未拿到裝備」的情況）

#### Scenario: 只抽出裝備，不抽出藥水
- **WHEN** 玩家呼叫抽取（任一貨幣）
- **THEN** 發放的物品 `type` 必為 `EQUIPMENT`，不會抽出 `POTION`

### Requirement: 金幣與寶石各自獨立的稀有度權重表
系統 SHALL 為金幣抽取與寶石抽取分別維護獨立的稀有度權重表（不沿用 `item-generation` capability 既有的 `STANDARD_RARITY_WEIGHTS`），金幣權重表 SHALL 使整體品質期望值低於寶石權重表——金幣抽取 SHALL NOT 抽出高於寶石抽取下限的稀有度區段，兩份權重表數值記錄於 `docs/game-design/balance/drop-rates.md`。

#### Scenario: 金幣抽取的稀有度上限低於寶石抽取
- **WHEN** 分別大量重複執行金幣抽取與寶石抽取並統計各稀有度出現次數
- **THEN** 金幣抽取結果中最高稀有度所佔比例，低於寶石抽取結果中同一稀有度所佔比例（金幣抽取的品質期望值明顯低於寶石抽取）

#### Scenario: 兩份權重表各自獨立於商店/掉落權重表
- **WHEN** 檢視金幣/寶石抽取的稀有度分布設定
- **THEN** 其數值來源為老虎機專屬的權重表常數，而非 `item-generation` capability 既有的 `STANDARD_RARITY_WEIGHTS` 或商店的 `maxRarity`/`minRarity` 過濾規則
