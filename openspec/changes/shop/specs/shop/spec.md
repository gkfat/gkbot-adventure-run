## ADDED Requirements

### Requirement: 每日商店懶生成
系統 SHALL 於玩家查詢商店時，檢查當日（UTC+0）商店是否已生成；若尚未生成，以決定性 seed 生成固定數量的商品。金幣商店 SHALL 為 per-account 生成、稀有度上限較低；紅寶石商店 SHALL 為全服共享生成、稀有度上限較高。

#### Scenario: 當日首次查詢觸發生成
- **WHEN** 今天尚未有該帳號的金幣商店文件，玩家呼叫 `GET /api/shop/gold`
- **THEN** 系統生成當日商品並回傳，之後同一天再次查詢回傳相同商品

#### Scenario: 同一天重複查詢不重複生成
- **WHEN** 當日商店已存在，玩家再次呼叫 `GET /api/shop/gold`
- **THEN** 回傳既有商品，不重新生成（商品內容與上次查詢相同）

#### Scenario: 紅寶石商店全服共享
- **WHEN** 兩個不同帳號在同一天分別查詢 `GET /api/shop/gems`
- **THEN** 兩者看到完全相同的商品清單

### Requirement: 購買商店商品
系統 SHALL 於購買時檢查商品未售出且玩家資源（gold 或 gems）足夠，扣款並發放物品實體；商品一旦售出即標記 `sold`，不可重複購買。

#### Scenario: 成功購買並放入背包
- **WHEN** 玩家對未售出的商品呼叫 `POST /api/shop/purchase`，資源足夠，`destination = INVENTORY`
- **THEN** 該商品標記 sold，玩家對應資源扣除商品價格，物品實體出現在玩家永久背包

#### Scenario: 購買並直接裝備
- **WHEN** 玩家購買時指定 `destination = EQUIP`
- **THEN** 物品直接進入對應裝備槽位（若已有裝備，遵循 `equipment` capability 的替換規則）

#### Scenario: 商品已售出
- **WHEN** 玩家對已標記 sold 的商品呼叫購買
- **THEN** 系統回傳 409，不扣款

#### Scenario: 資源不足
- **WHEN** 玩家 gold/gems 少於商品價格
- **THEN** 系統回傳 400，不扣款、不標記售出
