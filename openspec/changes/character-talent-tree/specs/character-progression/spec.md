## MODIFIED Requirements

### Requirement: 查詢角色資料與計算後 Stats
系統 SHALL 提供 `GET /api/character/:characterId`，回傳指定角色（須屬於呼叫者帳號）的 level/exp/gold/gems/attributes/unspentAttributePoints/talentPoints/talents/nickname/archetypeId/className，附上該職業對應的完整 `TalentTree` 定義，並附上 server 依 attributes + 已投入天賦（+ 未來的裝備/run modifiers）即時計算出的 stats（ATK/DEF/HP_MAX/actionIntervalSec/critChance/critMultiplier/dodgeChance/carryCapacity）與 `talentBonus`（結構同 `equipmentBonus`，只列出天賦貢獻的非零項）。`actionIntervalSec` 的計算 SHALL 在套用裝備 `actionSpeedMod` 加總時，對其中來自 `HEAVY` 分類裝備的部分，先依角色 `STR`+`CON` 套用負重折扣（`1 - min(MAX_HEAVY_PENALTY_MITIGATION, (STR + CON) × HEAVY_PENALTY_MITIGATION_PER_POINT)`，公式與 `weapon-weight-class` capability「負重能力抑制 HEAVY 懲罰」一致）再累加；`LIGHT`/`MEDIUM` 裝備的 `actionSpeedMod` 不受此折扣影響，天賦對 `actionIntervalSec` 的加成在裝備折扣計算之後另外疊加。`carryCapacity`（負重）SHALL 等於該角色的 `STR + CON` 加上天賦樹投點提供的 `carryCapacity` 加成（若有），不受裝備影響，供玩家理解「還能承受多少重裝備懲罰」的正向狀態值。Stats SHALL NOT 被寫入 Firestore。

#### Scenario: 查詢自己的角色
- **WHEN** 已登入玩家呼叫 `GET /api/character/:characterId`，且該角色屬於自己帳號
- **THEN** 回傳該角色的完整資料（含 `talentPoints`/`talents`/其職業的 `TalentTree` 定義）與計算後 stats

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

## ADDED Requirements

### Requirement: 升級發放屬性點與天賦點
系統 SHALL 在角色升級時（`settleRunRewards` 結算的每一次等級提升）發放 1 點 `unspentAttributePoints` 與 3 點 `talentPoints`，兩者互不影響、同時發放。

#### Scenario: 單次升 1 級同時發放兩種點數
- **WHEN** 一次冒險結算讓角色從 5 級升到 6 級
- **THEN** `unspentAttributePoints` 增加 1，`talentPoints` 增加 3

#### Scenario: 單次結算連續升多級
- **WHEN** 一次冒險結算的 EXP 讓角色一口氣從 5 級升到 8 級（升 3 級）
- **THEN** `talentPoints` 增加 9（3 級 × 3 點），`unspentAttributePoints` 增加 3
