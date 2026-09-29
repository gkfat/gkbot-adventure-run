## MODIFIED Requirements

### Requirement: 每日商店懶生成
系統 SHALL 於玩家查詢角色的商店時，檢查當日（UTC+0）該角色的商店是否已生成；若尚未生成，隨機生成固定數量的商品並持久化為當日文件（生成後不重複 roll，同一天內的所有查詢皆讀取同一份已持久化的結果）。金幣商品與寶石商品 SHALL 皆為 per-character 生成——同帳號底下的不同角色不共用商店——但兩種貨幣的商品 SHALL 合併寫入同一份當日商店文件、以單一清單回傳；金幣商品稀有度上限較低，寶石商品稀有度下限較高。每個商品 SHALL 只對應一種貨幣（`currency`），不存在同時可用兩種貨幣購買的商品。系統另 SHALL 於當日商店的商品清單中，額外生成固定數量的「技能碎片」商品（`type = 'SKILL_FRAGMENT'`），其 `skillId` 從全部通用技能清單（`ALL_CHARACTER_SKILLS`，不再限定角色目前 `archetypeId`）中隨機挑選（同一份當日商店內可重複出現同一 `skillId`），`fragmentAmount` 與 `price`/`currency` 由固定數值表決定；系統另 SHALL 固定生成 4 個「技能經驗值晶片」商品（`type = 'SKILL_EXP_CHIP'`，3 個 GOLD 格 + 1 個 GEMS 格），每格固定販售 1 顆晶片。上述三種商品皆與既有裝備商品共用同一份當日商店文件與商品清單，但不佔用裝備商品原有的稀有度權重表。

#### Scenario: 當日首次查詢觸發生成
- **WHEN** 今天尚未有該角色的商店文件，玩家呼叫 `GET /api/character/{characterId}/shop`
- **THEN** 系統生成當日商品（含金幣商品、寶石商品、技能碎片商品、技能經驗值晶片商品）並以單一清單回傳，之後同一天再次查詢回傳相同商品

#### Scenario: 同一天重複查詢不重複生成
- **WHEN** 當日商店已存在，玩家再次呼叫 `GET /api/character/{characterId}/shop`
- **THEN** 回傳既有商品清單，不重新生成（商品內容與上次查詢相同）

#### Scenario: 技能碎片商品不限角色職業
- **WHEN** 角色 `archetypeId = 'fighter'`，其當日商店的技能碎片商品被生成
- **THEN** 商品的 `skillId` 可能是全部 10 個技能中的任一個，不限定於 `fighter` 的技能

#### Scenario: 每日固定 4 個技能經驗值晶片商品
- **WHEN** 查詢當日商店
- **THEN** 商品清單中包含 4 個 `type = 'SKILL_EXP_CHIP'` 商品（3 個 GOLD、1 個 GEMS），各自 `sold = false`，每格售出 1 顆晶片

## ADDED Requirements

### Requirement: 商店技能經驗值晶片商品
系統 SHALL 於購買 `type = 'SKILL_EXP_CHIP'` 商品時，比照現有裝備商品購買流程扣款、標記 `sold: true`，並將 1 顆 `templateId = 'skill_exp_chip'` 的道具實體加入該角色永久背包（受既有 500 格上限限制）。此商品類型 SHALL 忽略 `destination` 參數（不支援直接裝備）。

#### Scenario: 成功購買技能經驗值晶片
- **WHEN** 玩家對未售出的 `SKILL_EXP_CHIP` 商品送出購買請求，且貨幣足夠
- **THEN** 對應貨幣被扣除、該商品標記為 `sold: true`，角色永久背包新增 1 顆 `skill_exp_chip` 道具實體

#### Scenario: 背包已滿無法購買
- **WHEN** 角色永久背包已達 500 格上限，玩家購買 `SKILL_EXP_CHIP` 商品
- **THEN** 系統回傳錯誤，不扣款、不標記商品售出

#### Scenario: 已售出的晶片商品不可重複購買
- **WHEN** 玩家對已 `sold: true` 的 `SKILL_EXP_CHIP` 商品送出購買請求
- **THEN** 系統回傳衝突錯誤，不修改任何資料
