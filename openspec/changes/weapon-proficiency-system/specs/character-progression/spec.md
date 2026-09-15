## MODIFIED Requirements

### Requirement: 查詢角色資料與計算後 Stats
系統 SHALL 提供 `GET /api/character/:characterId`，回傳指定角色（須屬於呼叫者帳號）的 level/exp/gold/gems/attributes/unspentAttributePoints/talentPoints/talents/nickname/archetypeId/className，附上該職業對應的完整 `TalentTree` 定義，並附上 server 依 attributes + 已投入天賦 + 裝備 + 武器熟練度 + 全身負重狀態（+ 未來的 run modifiers）即時計算出的 stats（ATK/DEF/HP_MAX/actionIntervalSec/critChance/critMultiplier/dodgeChance/carryCapacity）與 `talentBonus`（結構同 `equipmentBonus`，只列出天賦貢獻的非零項）。`actionIntervalSec` 的計算 SHALL 在套用裝備 `actionSpeedMod` 加總時，對其中來自 `HEAVY` 分類裝備的部分，先依角色 `STR`+`CON` 套用負重折扣（`1 - min(MAX_HEAVY_PENALTY_MITIGATION, (STR + CON) × HEAVY_PENALTY_MITIGATION_PER_POINT)`，公式與 `weapon-weight-class` capability「負重能力抑制 HEAVY 懲罰」一致）再累加；`LIGHT`/`MEDIUM` 裝備的 `actionSpeedMod` 不受此折扣影響。計算順序為：天賦加成 → 武器熟練度對 `ATK`/`critChance` 的加成（`weapon-proficiency` capability，雙持時各 `weaponType` 各自疊加）→ 雙持熟練度加成（`dualWieldProficiency`，只在雙手皆為武器時套用）→ 全身裝備總重量超過 `carryCapacity` 時的固定懲罰（`weapon-weight-class` capability「全身總重超過負重上限時套用固定懲罰」）。`carryCapacity`（負重）SHALL 等於該角色的 `STR + CON` 加上天賦樹投點提供的 `carryCapacity` 加成（若有），不受裝備影響，供玩家理解「還能承受多少重裝備懲罰、目前是否已經超重」的狀態值。回應 SHALL 另外附上 `weaponProficiency`（角色目前每個已使用過的 `weaponType` 的 exp/level）與 `dualWieldProficiency`（角色的雙持熟練度 exp/level）。Stats SHALL NOT 被寫入 Firestore。

#### Scenario: 查詢自己的角色
- **WHEN** 已登入玩家呼叫 `GET /api/character/:characterId`，且該角色屬於自己帳號
- **THEN** 回傳該角色的完整資料（含 `talentPoints`/`talents`/其職業的 `TalentTree` 定義/`weaponProficiency`）與計算後 stats

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

#### Scenario: carryCapacity 反映角色的 STR+CON 與天賦加成
- **WHEN** 查詢角色資料
- **THEN** 回傳的 `stats.carryCapacity` 等於該角色目前 `attributes.STR + attributes.CON` 再加上已投入天賦提供的 `carryCapacity` 加成（未投入相關天賦時等同過去純 attributes 的行為）

#### Scenario: 不同職業初始 carryCapacity 不同
- **WHEN** 分別查詢兩個剛建立、尚未分配任何屬性點或天賦點的不同職業角色
- **THEN** 若兩職業的 `archetype.attributes` 中 `STR + CON` 不同，兩者的初始 `stats.carryCapacity` 也不同（直接沿用各職業既有的固定初始 attributes，不需為 carryCapacity 另立職業專屬欄位）

#### Scenario: carryCapacity 不受裝備影響
- **WHEN** 角色裝備任意道具（含 `HEAVY` 分類）
- **THEN** `stats.carryCapacity` 前後不變，只有裝備本身的 `actionIntervalSec`/`dodgeChance` 受負重折扣影響

#### Scenario: 回傳武器熟練度資訊
- **WHEN** 角色的 `BLADE` 熟練度為 Lv.6、`FIST` 熟練度為 Lv.2，其餘類型尚未使用過
- **THEN** 回傳的 `weaponProficiency` 包含 `BLADE`（Lv.6）與 `FIST`（Lv.2），不包含其餘未使用過的 `weaponType`

#### Scenario: 回傳雙持熟練度資訊
- **WHEN** 角色的 `dualWieldProficiency` 為 Lv.3
- **THEN** 回傳的 `dualWieldProficiency` 為 `{ exp, level: 3 }`；角色從未雙持過時，回傳初始值 `{ exp: 0, level: 1 }`

#### Scenario: stats 疊加武器熟練度加成
- **WHEN** 角色一手裝備 `weaponType = BLUNT` 且熟練度 Lv.5
- **THEN** 回傳的 stats 已在天賦加成之後，再疊加 `BLUNT` Lv.2～Lv.5 的 ATK%/critChance 加成

#### Scenario: stats 疊加雙持熟練度加成
- **WHEN** 角色雙手皆裝備武器類道具，`dualWieldProficiency` 為 Lv.5
- **THEN** 回傳的 stats 在武器熟練度加成之後，再疊加 `dualWieldProficiency` Lv.2～Lv.5 的加成

#### Scenario: stats 反映全身超重的固定懲罰
- **WHEN** 角色目前裝備的 6 個槽位 `weight` 總和超過 `stats.carryCapacity`
- **THEN** 回傳的 stats 在武器熟練度加成之後，再疊加對應超出量的固定懲罰（`weapon-weight-class` capability）
