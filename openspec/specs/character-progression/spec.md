# character-progression

## Purpose

角色查詢、屬性點分配、暱稱設定；提供玩家查詢角色資料與 server 即時計算後 stats、分配屬性點，以及建立/設定角色暱稱供排行榜顯示使用。

## Requirements

### Requirement: 查詢角色資料與計算後 Stats
系統 SHALL 提供 `GET /api/character/:characterId`，回傳指定角色（須屬於呼叫者帳號）的 level/exp/gold/gems/attributes/unspentAttributePoints/nickname/archetypeId/className，並附上 server 依 attributes（+ 未來的裝備/run modifiers）即時計算出的 stats（ATK/DEF/HP_MAX/actionIntervalSec/critChance/critMultiplier/dodgeChance/carryCapacity）。`actionIntervalSec` 的計算 SHALL 在套用裝備 `actionSpeedMod` 加總時，對其中來自 `HEAVY` 分類裝備的部分，先依角色 `STR`+`CON` 套用負重折扣（`1 - min(MAX_HEAVY_PENALTY_MITIGATION, (STR + CON) × HEAVY_PENALTY_MITIGATION_PER_POINT)`，公式與 `weapon-weight-class` capability「負重能力抑制 HEAVY 懲罰」一致）再累加；`LIGHT`/`MEDIUM` 裝備的 `actionSpeedMod` 不受此折扣影響。`carryCapacity`（負重）SHALL 等於該角色的 `STR + CON`，純由 attributes 衍生、不受裝備影響，供玩家理解「還能承受多少重裝備懲罰」的正向狀態值。Stats SHALL NOT 被寫入 Firestore。

#### Scenario: 查詢自己的角色
- **WHEN** 已登入玩家呼叫 `GET /api/character/:characterId`，且該角色屬於自己帳號
- **THEN** 回傳該角色的完整資料與計算後 stats

#### Scenario: 角色等級恆不超過上限
- **WHEN** 查詢角色資料
- **THEN** `level` 欄位保證落在 1 到 30 之間

#### Scenario: 查詢不屬於自己的角色
- **WHEN** 已登入玩家呼叫 `GET /api/character/:characterId`，但該角色不屬於自己帳號
- **THEN** 系統回傳 404

#### Scenario: STR+CON 負重折扣降低 HEAVY 裝備的速度懲罰
- **WHEN** 角色裝備一件 `HEAVY` 分類道具（`actionSpeedMod` 為代表變慢的懲罰值），且該角色 `STR`+`CON` 大於 0
- **THEN** 回傳的 `actionIntervalSec` 相較未套用負重折扣時更短（懲罰被部分抵銷），但不會優於未裝備該道具時的 `actionIntervalSec`

#### Scenario: 折扣不影響 LIGHT/MEDIUM 裝備的速度加成
- **WHEN** 角色裝備一件 `LIGHT` 或 `MEDIUM` 分類道具
- **THEN** 該道具對 `actionIntervalSec` 的影響不受角色 `STR`+`CON` 負重折扣調整

#### Scenario: carryCapacity 反映角色的 STR+CON
- **WHEN** 查詢角色資料
- **THEN** 回傳的 `stats.carryCapacity` 等於該角色目前 `attributes.STR + attributes.CON`

#### Scenario: 不同職業初始 carryCapacity 不同
- **WHEN** 分別查詢兩個剛建立、尚未分配任何屬性點的不同職業角色
- **THEN** 若兩職業的 `archetype.attributes` 中 `STR + CON` 不同，兩者的初始 `stats.carryCapacity` 也不同（直接沿用各職業既有的固定初始 attributes，不需為 carryCapacity 另立職業專屬欄位）

#### Scenario: carryCapacity 不受裝備影響
- **WHEN** 角色裝備任意道具（含 `HEAVY` 分類）
- **THEN** `stats.carryCapacity` 前後不變，只有裝備本身的 `actionIntervalSec`/`dodgeChance` 受負重折扣影響

### Requirement: 分配屬性點
系統 SHALL 提供 `POST /api/character/:characterId/attributes`，允許玩家把指定角色（須屬於自己帳號）的 `unspentAttributePoints` 分配到 STR/AGI/CON/LUCK，總分配點數不可超過該角色剩餘點數。

#### Scenario: 成功分配
- **WHEN** 指定角色的 `unspentAttributePoints = 5`，送出 `{ STR: 3, AGI: 2 }`
- **THEN** 該角色的 `attributes.STR += 3`、`attributes.AGI += 2`，`unspentAttributePoints` 變為 0

#### Scenario: 分配點數超過剩餘點數
- **WHEN** 指定角色的 `unspentAttributePoints = 2`，送出 `{ STR: 5 }`
- **THEN** 系統回傳 400，且不修改該角色任何 attributes 或 unspentAttributePoints

#### Scenario: 對不屬於自己的角色分配點數
- **WHEN** 已登入玩家對不屬於自己帳號的 `characterId` 呼叫此端點
- **THEN** 系統回傳 404，且不修改任何資料

### Requirement: 建立角色時自動產生預設暱稱
系統 SHALL 在建立角色時（含依範本建立新角色、以及既有單一角色帳號的相容性補值情境）自動產生一個非空的預設 `nickname`，確保排行榜一開始即有可顯示名稱，不需依賴玩家後續手動設定。依範本建立的角色，預設 `nickname` 格式為 `{職業名稱}{characterId 後 6 碼大寫}`（例如「野蠻人A1B2C3」），避免同一帳號的多個角色出現相同預設暱稱。

#### Scenario: 依範本建立新角色
- **WHEN** 玩家以某個 archetype 建立新角色
- **THEN** 新角色的 `nickname` 立即為 `{職業名稱}{characterId 後 6 碼大寫}` 格式的值，不為 undefined 或空字串

#### Scenario: 既有單一角色帳號的相容性
- **WHEN** 系統讀取一筆多角色功能上線前建立的舊格式角色（`archetypeId` 被判定為 `legacy`）
- **THEN** 若該角色原本已有 `nickname` 則維持不變；若沒有則沿用原本 `玩家{accountId 後 6 碼大寫}` 的格式補值

### Requirement: 設定暱稱
系統 SHALL 提供 `POST /api/character/:characterId/nickname`，允許玩家設定指定角色（須屬於自己帳號）1~20 字元的暱稱，供排行榜顯示使用；此操作會覆蓋建立角色時系統自動產生的預設暱稱。

#### Scenario: 成功設定暱稱
- **WHEN** 玩家對自己帳號名下的角色送出合法暱稱（1~20 字元）
- **THEN** 該角色的 `nickname` 更新為新值（無論原值是預設暱稱或先前的自訂暱稱）

#### Scenario: 暱稱格式不合法
- **WHEN** 玩家送出空字串或超過 20 字元的暱稱
- **THEN** 系統回傳 400，`nickname` 維持原值

#### Scenario: 對不屬於自己的角色設定暱稱
- **WHEN** 已登入玩家對不屬於自己帳號的 `characterId` 呼叫此端點
- **THEN** 系統回傳 404，且不修改任何資料
