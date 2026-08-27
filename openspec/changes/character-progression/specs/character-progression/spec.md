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

### Requirement: 建立角色時自動產生預設暱稱
系統 SHALL 在建立角色時（含首次登入建立帳號、以及帳號存在但角色遺失而重建的情況）自動產生一個非空的預設 `nickname`，格式為 `玩家{accountId 後 6 碼大寫}`，確保排行榜一開始即有可顯示名稱，不需依賴玩家後續手動設定。

#### Scenario: 建立新角色
- **WHEN** 系統為新帳號建立角色
- **THEN** 角色的 `nickname` 立即為 `玩家{accountId 後 6 碼大寫}` 格式的值，不為 undefined 或空字串

#### Scenario: 修復缺少角色的既有帳號
- **WHEN** 帳號存在但角色遺失，系統重新建立角色
- **THEN** 新建立的角色同樣套用預設暱稱規則

### Requirement: 設定暱稱
系統 SHALL 提供 `POST /api/character/nickname`，允許玩家設定 1~20 字元的暱稱，供排行榜顯示使用；此操作會覆蓋建立角色時系統自動產生的預設暱稱。

#### Scenario: 成功設定暱稱
- **WHEN** 玩家送出合法暱稱（1~20 字元）
- **THEN** 該角色的 `nickname` 更新為新值（無論原值是預設暱稱或先前的自訂暱稱）

#### Scenario: 暱稱格式不合法
- **WHEN** 玩家送出空字串或超過 20 字元的暱稱
- **THEN** 系統回傳 400，`nickname` 維持原值
