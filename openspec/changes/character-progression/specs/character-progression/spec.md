## ADDED Requirements

### Requirement: 查詢角色資料與計算後 Stats
系統 SHALL 提供 `GET /api/character`，回傳角色的 level/exp/gold/gems/attributes/unspentAttributePoints/nickname，並附上 server 依 attributes（+ 未來的裝備/run modifiers）即時計算出的 stats（ATK/DEF/HP_MAX/actionIntervalSec/critChance/critMultiplier/dodgeChance）。Stats SHALL NOT 被寫入 Firestore。

#### Scenario: 查詢自己的角色
- **WHEN** 已登入玩家呼叫 `GET /api/character`
- **THEN** 回傳該玩家角色的完整資料與計算後 stats

#### Scenario: 角色等級恆不超過上限
- **WHEN** 查詢角色資料
- **THEN** `level` 欄位保證落在 1 到 30 之間

### Requirement: 分配屬性點
系統 SHALL 提供 `POST /api/character/attributes`，允許玩家把 `unspentAttributePoints` 分配到 STR/AGI/CON/LUCK，總分配點數不可超過剩餘點數。

#### Scenario: 成功分配
- **WHEN** 玩家的 `unspentAttributePoints = 5`，送出 `{ STR: 3, AGI: 2 }`
- **THEN** `attributes.STR += 3`、`attributes.AGI += 2`，`unspentAttributePoints` 變為 0

#### Scenario: 分配點數超過剩餘點數
- **WHEN** 玩家的 `unspentAttributePoints = 2`，送出 `{ STR: 5 }`
- **THEN** 系統回傳 400，且不修改任何 attributes 或 unspentAttributePoints

### Requirement: 設定暱稱
系統 SHALL 提供 `POST /api/character/nickname`，允許玩家設定 1~20 字元的暱稱，供排行榜顯示使用。

#### Scenario: 成功設定暱稱
- **WHEN** 玩家送出合法暱稱（1~20 字元）
- **THEN** 該角色的 `nickname` 更新為新值

#### Scenario: 暱稱格式不合法
- **WHEN** 玩家送出空字串或超過 20 字元的暱稱
- **THEN** 系統回傳 400，`nickname` 維持原值
