## ADDED Requirements

### Requirement: 武器類道具定義武器類型，不限定特定手部槽位
系統 SHALL 允許任一 `equipSlot ∈ HAND_SLOTS`（`LEFT_HAND` 或 `RIGHT_HAND`）的 `ItemTemplate` 定義 `weaponType`（`FIST` / `BLADE` / `BLUNT` / `POLEARM` / `RANGED`），作為該武器固定的分類屬性，不隨稀有度改變；是否定義 `weaponType` 即為該道具是否為「武器」的判斷依據，與其預設 `equipSlot` 是 `LEFT_HAND` 或 `RIGHT_HAND` 無關——兩者皆可作為武器的預設槽位，玩家仍可用既有 `requestedSlot` 機制換手裝備。非 `HAND_SLOTS` 槽位（`HEAD`/`BODY`/`SHOES`/`RING`）的 `ItemTemplate` SHALL NOT 定義 `weaponType`。

#### Scenario: 兩手皆可作為武器的預設槽位
- **WHEN** 分別檢視一個預設 `equipSlot = RIGHT_HAND` 且定義了 `weaponType` 的武器範本，與另一個預設 `equipSlot = LEFT_HAND` 且定義了 `weaponType` 的武器範本
- **THEN** 兩者皆合法，系統不因預設槽位是左手或右手而有不同規則

#### Scenario: 非武器道具不需要武器類型
- **WHEN** 檢視一個 `equipSlot = LEFT_HAND` 但功能是防具（無 `weaponType`）的 `ItemTemplate`
- **THEN** 該 template 不定義 `weaponType`，不被視為武器

#### Scenario: 武器類型不隨稀有度變動
- **WHEN** 同一個武器 template 分別生成 rarity=N 與 rarity=L 的物品實體
- **THEN** 兩個實例的 `weaponType` 皆相同，等於該 template 定義的類型

### Requirement: 武器類型與武器重量分類是正交軸線
`weaponType` SHALL 與 `weaponWeightClass`（`weapon-weight-class` capability）共同描述同一把武器，兩者互不取代、互不衍生：`weaponType` 決定該武器歸屬的熟練度累積類型與攻擊型態風格，`weaponWeightClass` 決定其數值主/副屬性取捨曲線。

#### Scenario: 同一武器類型可以有不同重量分類
- **WHEN** 檢視 `weaponType = BLADE` 的多個 `ItemTemplate`
- **THEN** 這些 template 的 `weaponWeightClass` 不要求相同，可分別為 `LIGHT`/`MEDIUM`/`HEAVY`
