# shop Specification

## Purpose

角色每日商店：金幣商店與紅寶石商店的懶生成、跨日文件清理、以及商店商品購買流程。

## Requirements

### Requirement: 每日商店懶生成
系統 SHALL 於玩家查詢角色的商店時，檢查當日（UTC+0）該角色的商店是否已生成；若尚未生成，隨機生成固定數量的商品並持久化為當日文件（生成後不重複 roll，同一天內的所有查詢皆讀取同一份已持久化的結果）。金幣商店與紅寶石商店 SHALL 皆為 per-character 生成——同帳號底下的不同角色不共用商店；金幣商店稀有度上限較低，紅寶石商店稀有度上限較高。

#### Scenario: 當日首次查詢觸發生成
- **WHEN** 今天尚未有該角色的金幣商店文件，玩家呼叫 `GET /api/character/{characterId}/shop/gold`
- **THEN** 系統生成當日商品並回傳，之後同一天再次查詢回傳相同商品

#### Scenario: 同一天重複查詢不重複生成
- **WHEN** 當日商店已存在，玩家再次呼叫 `GET /api/character/{characterId}/shop/gold`
- **THEN** 回傳既有商品，不重新生成（商品內容與上次查詢相同）

#### Scenario: 不同角色各自獨立商店
- **WHEN** 同一帳號底下的兩個角色在同一天分別查詢自己的 `GET /api/character/{characterId}/shop/gold`（或 `/gems`）
- **THEN** 兩者各自獨立生成、看到不同的商品清單（不共用彼此的商店）

### Requirement: 商店文件清理
系統 SHALL 於觸發生成新一天商店文件（`shopsGold` 或 `shopsGems`）時，best-effort 刪除該角色前一天的對應商店文件；找不到前一天文件不視為錯誤。

#### Scenario: 跨日生成時清除前一天文件
- **WHEN** 玩家在新的一天（UTC+0）首次查詢角色的商店，觸發當日商店生成
- **THEN** 系統生成當日商店文件，並嘗試刪除該角色前一天的同類型商店文件

#### Scenario: 前一天文件不存在
- **WHEN** 玩家連續多天未上線，重新查詢時「前一天」的商店文件已不存在（或從未生成過）
- **THEN** 刪除操作視為無操作，不影響當日商店的生成與回傳

#### Scenario: 刪除角色時一併清理商店文件
- **WHEN** 玩家呼叫 `DELETE /api/character/{characterId}` 刪除一個角色
- **THEN** 系統 best-effort 刪除該角色今天與昨天的 `shopsGold`/`shopsGems` 文件（找不到不視為錯誤），避免角色刪除後商店文件永久孤兒化

### Requirement: 購買商店商品
系統 SHALL 於購買時檢查商品未售出且玩家資源（gold 或 gems）足夠，扣款並發放物品實體；商品一旦售出即標記 `sold`，不可重複購買。

#### Scenario: 成功購買並放入背包
- **WHEN** 玩家對未售出的商品呼叫 `POST /api/character/{characterId}/shop/purchase`，資源足夠，`destination = INVENTORY`
- **THEN** 該商品標記 sold，該角色對應資源扣除商品價格，物品實體出現在該角色永久背包

#### Scenario: 購買並直接裝備
- **WHEN** 玩家購買時指定 `destination = EQUIP`
- **THEN** 物品同時出現在玩家永久背包與對應裝備槽位（若已有裝備，遵循 `equipment` capability 的替換規則）——裝備中的物品仍計入永久背包的參照清單，與其他方式取得的裝備一致

#### Scenario: 商品已售出
- **WHEN** 玩家對已標記 sold 的商品呼叫購買
- **THEN** 系統回傳 409，不扣款

#### Scenario: 資源不足
- **WHEN** 玩家 gold/gems 少於商品價格
- **THEN** 系統回傳 400，不扣款、不標記售出

#### Scenario: 背包已滿
- **WHEN** 玩家購買時角色永久背包已達 500 格上限（`inventory` capability 的容量限制）——`destination = INVENTORY` 或 `EQUIP` 皆同，因為兩者都需要先把物品加入永久背包參照
- **THEN** 系統回傳 400，不扣款、不標記售出、不交付物品——整筆交易回滾，不留部分狀態

#### Scenario: 交付物品與商店列表顯示一致
- **WHEN** 玩家成功購買一件商品
- **THEN** 交付到背包或裝備欄的 `ItemInstance`（含 rarity/stats）與購買前 `GET /api/character/{characterId}/shop/gold`（或 `/gems`）回應中該 slot 顯示的物品完全一致，不重新生成/roll
