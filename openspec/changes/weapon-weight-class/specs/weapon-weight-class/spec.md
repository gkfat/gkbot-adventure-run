## ADDED Requirements

### Requirement: 武器重量分類定義
系統 SHALL 為每個 HAND 類 `ItemTemplate`（`equipSlot` 屬於 `HAND_SLOTS`）指定唯一的 `weaponWeightClass`（`LIGHT` / `MEDIUM` / `HEAVY`），作為該道具固定的分類屬性，不隨稀有度改變。

#### Scenario: 分類固定不隨稀有度變動
- **WHEN** 同一個 template 分別生成 rarity=N 與 rarity=L 的物品實體
- **THEN** 兩個實例的 `weaponWeightClass` 皆相同，等於該 template 定義的分類

#### Scenario: 非 HAND 類道具不需要重量分類
- **WHEN** 檢視 `equipSlot` 為 `HEAD`/`BODY`/`SHOES`/`RING` 的 template
- **THEN** 該 template 不需要（也不應該）定義 `weaponWeightClass`

### Requirement: 各重量分類的數值走向
系統 SHALL 依 `weaponWeightClass` 決定該 template `baseStatsRange` 的設計走向：
- `LIGHT`：以 `actionSpeedMod` 加成為主（變快），`ATK` 幅度低於 `MEDIUM`/`HEAVY`；僅 `SSR`/`L` 稀有度同時提供 `ATK` 與 `actionSpeedMod` 雙加成。
- `MEDIUM`：純 `ATK` 隨稀有度提升，不含 `actionSpeedMod`/`dodgeChanceMod`。
- `HEAVY`：`ATK` 幅度為三者最大，但 `actionSpeedMod`（變慢）與 `dodgeChanceMod`（閃避降低）隨稀有度同步惡化。

#### Scenario: LIGHT 分類低稀有度只有速度加成
- **WHEN** 檢視 `weaponWeightClass = LIGHT` 的 template 在 `N`/`R`/`SR` 稀有度的 `baseStatsRange`
- **THEN** 這些稀有度只定義 `actionSpeedMod` 加成，不含 `ATK`

#### Scenario: LIGHT 分類高稀有度雙加成
- **WHEN** 檢視 `weaponWeightClass = LIGHT` 的 template 在 `SSR`/`L` 稀有度的 `baseStatsRange`
- **THEN** 這兩個稀有度同時定義 `ATK` 與 `actionSpeedMod` 加成

#### Scenario: MEDIUM 分類只有攻擊力
- **WHEN** 檢視 `weaponWeightClass = MEDIUM` 的 template 的 `baseStatsRange`
- **THEN** 所有稀有度只定義 `ATK` 區間，不含 `actionSpeedMod` 或 `dodgeChanceMod`

#### Scenario: HEAVY 分類攻擊力最高但伴隨雙重懲罰
- **WHEN** 在同一稀有度分別比較 `LIGHT`/`MEDIUM`/`HEAVY` 三個 template 的 `ATK` 區間
- **THEN** `HEAVY` 的 `ATK` 上下界皆高於 `MEDIUM`，且 `HEAVY` 該稀有度同時定義負值的 `actionSpeedMod`（變慢）與 `dodgeChanceMod`（閃避降低）

### Requirement: 稀有度加成通則
系統 SHALL 保證 `R` 以上稀有度的 HAND 類道具，每一項該分類定義的正向屬性（主屬性與副屬性）皆非零；僅 `N` 稀有度允許副屬性為 0。`HEAVY` 分類的負向 `actionSpeedMod`/`dodgeChanceMod` 懲罰視為代價軸，不受本通則限制，且 SHALL 隨稀有度提升而加重（懲罰幅度單調遞增）。

#### Scenario: N 稀有度可無副屬性
- **WHEN** 檢視任一 HAND 類 template 在 `N` 稀有度的 `baseStatsRange`
- **THEN** 允許只定義主屬性（例如僅 `ATK`），副屬性欄位可省略或為 0

#### Scenario: R 以上稀有度必須有可量測加成
- **WHEN** 檢視任一 HAND 類 template 在 `R`/`SR`/`SSR`/`L` 稀有度的 `baseStatsRange`
- **THEN** 該分類定義的每一項正向屬性（`LIGHT` 的 `actionSpeedMod`、`MEDIUM`/`HEAVY` 的 `ATK`）區間下界皆大於 0

#### Scenario: HEAVY 懲罰隨稀有度加重
- **WHEN** 比較 `HEAVY` 分類 template 在 `N` 與 `L` 稀有度的 `actionSpeedMod`/`dodgeChanceMod` 區間
- **THEN** `L` 稀有度的懲罰幅度（絕對值）大於 `N` 稀有度
