# weapon-weight-class

## Purpose

TBD — 裝備重量分類（LIGHT/MEDIUM/HEAVY）：為每個 `EQUIPMENT` template 指定固定的重量分類，決定其數值走向（主屬性 vs. `actionSpeedMod`/`dodgeChanceMod` 副屬性代價），並定義角色 `STR`+`CON` 對 `HEAVY` 分類懲罰的負重折扣公式。

## Requirements

### Requirement: 裝備重量分類定義
系統 SHALL 為每個 `type: EQUIPMENT` 的 `ItemTemplate`（不限 `equipSlot`，涵蓋 `LEFT_HAND`/`RIGHT_HAND`/`HEAD`/`BODY`/`SHOES`/`RING`）指定唯一的 `weaponWeightClass`（`LIGHT` / `MEDIUM` / `HEAVY`），作為該道具固定的分類屬性，不隨稀有度改變。

#### Scenario: 分類固定不隨稀有度變動
- **WHEN** 同一個 template 分別生成 rarity=N 與 rarity=L 的物品實體
- **THEN** 兩個實例的 `weaponWeightClass` 皆相同，等於該 template 定義的分類

#### Scenario: 非 EQUIPMENT 類道具不需要重量分類
- **WHEN** 檢視 `type` 為 `POTION` 的 template
- **THEN** 該 template 不需要（也不應該）定義 `weaponWeightClass`

### Requirement: 各重量分類的數值走向
系統 SHALL 依 `weaponWeightClass` 決定該 template `baseStatsRange` 中「主屬性」與「副屬性」的走向規則，兩者為抽象角色而非固定欄位：
- **主屬性**：由該 template 既有槽位設計決定（例如 HAND 類武器以 `ATK` 為主屬性、HAND 類防具/`HEAD`/`BODY` 以 `DEF`/`HP` 為主屬性），weight class 不改變主屬性本身是哪個欄位。
- **副屬性**：`actionSpeedMod`（速度）與 `dodgeChanceMod`（閃避），weight class 決定副屬性相對主屬性的取捨走向：
  - `LIGHT`：以副屬性加成為主，主屬性幅度低於 `MEDIUM`/`HEAVY`；僅 `SSR`/`L` 稀有度同時提供主屬性與副屬性雙加成。
  - `MEDIUM`：純主屬性隨稀有度提升，不含副屬性（`actionSpeedMod`/`dodgeChanceMod`）加成。
  - `HEAVY`：主屬性幅度為三者最大，但 `actionSpeedMod`（變慢）與 `dodgeChanceMod`（閃避降低）隨稀有度同步惡化，視為代價軸。

> 各槽位主屬性/副屬性的具體對應（尤其 `SHOES`/`RING` 現行已以 `actionSpeedMod` 作為主要成長屬性，與此處副屬性定義如何共存）留待 tasks 數值曲線設計階段（見 design.md Open Questions）逐槽位確認，本 Requirement 只訂通則。

#### Scenario: LIGHT 分類低稀有度只有副屬性加成
- **WHEN** 檢視 `weaponWeightClass = LIGHT` 的 template 在 `N`/`R`/`SR` 稀有度的 `baseStatsRange`
- **THEN** 這些稀有度只定義副屬性（`actionSpeedMod`）加成，不含主屬性

#### Scenario: LIGHT 分類高稀有度雙加成
- **WHEN** 檢視 `weaponWeightClass = LIGHT` 的 template 在 `SSR`/`L` 稀有度的 `baseStatsRange`
- **THEN** 這兩個稀有度同時定義主屬性與副屬性（`actionSpeedMod`）加成

#### Scenario: MEDIUM 分類只有主屬性
- **WHEN** 檢視 `weaponWeightClass = MEDIUM` 的 template 的 `baseStatsRange`
- **THEN** 所有稀有度只定義主屬性區間，不含 `actionSpeedMod` 或 `dodgeChanceMod`

#### Scenario: HEAVY 分類主屬性最高但伴隨雙重懲罰
- **WHEN** 在同一稀有度、同一槽位分別比較 `LIGHT`/`MEDIUM`/`HEAVY` 三個 template 的主屬性區間
- **THEN** `HEAVY` 的主屬性上下界皆高於 `MEDIUM`，且 `HEAVY` 該稀有度同時定義正值的 `actionSpeedMod`（數值增加＝變慢，`actionSpeedMod` 直接加總進 `actionIntervalSec`，正值使其變大）與負值的 `dodgeChanceMod`（閃避降低）

### Requirement: 稀有度加成通則
系統 SHALL 保證 `R` 以上稀有度的 `EQUIPMENT` 類道具，每一項該分類定義的正向屬性（主屬性與副屬性）皆非零；僅 `N` 稀有度允許副屬性為 0。`HEAVY` 分類的 `actionSpeedMod`（正值，代表變慢）與 `dodgeChanceMod`（負值，代表閃避降低）懲罰視為代價軸，不受本通則限制，且 SHALL 隨稀有度提升而加重（懲罰幅度絕對值單調遞增）。

#### Scenario: N 稀有度可無副屬性
- **WHEN** 檢視任一 `EQUIPMENT` template 在 `N` 稀有度的 `baseStatsRange`
- **THEN** 允許只定義主屬性，副屬性欄位可省略或為 0

#### Scenario: R 以上稀有度必須有可量測加成
- **WHEN** 檢視任一 `EQUIPMENT` template 在 `R`/`SR`/`SSR`/`L` 稀有度的 `baseStatsRange`
- **THEN** 該分類定義的每一項正向屬性（主屬性、`LIGHT` 的 `actionSpeedMod`）區間下界皆大於 0

#### Scenario: HEAVY 懲罰隨稀有度加重
- **WHEN** 比較 `HEAVY` 分類 template 在 `N` 與 `L` 稀有度的 `actionSpeedMod`/`dodgeChanceMod` 區間
- **THEN** `L` 稀有度的懲罰幅度（絕對值）大於 `N` 稀有度

### Requirement: 負重能力抑制 HEAVY 懲罰
系統 SHALL 依角色 `STR`+`CON` 屬性計算負重折扣比例，套用於該角色已裝備的 `HEAVY` 分類道具的 `actionSpeedMod`/`dodgeChanceMod` 懲罰：`折扣後懲罰 = 基礎懲罰 × (1 - min(MAX_HEAVY_PENALTY_MITIGATION, (STR + CON) × HEAVY_PENALTY_MITIGATION_PER_POINT))`。折扣比例 SHALL 有上限（`MAX_HEAVY_PENALTY_MITIGATION`），不會使懲罰完全歸零。此折扣僅作用於 `HEAVY` 分類的負向副屬性，不影響 `LIGHT`/`MEDIUM` 分類或裝備的正向主屬性。

#### Scenario: STR+CON 越高，HEAVY 懲罰越小
- **WHEN** 兩個角色裝備同一件 `HEAVY` 分類道具，角色 A 的 `STR`+`CON` 高於角色 B
- **THEN** 角色 A 承受的 `actionSpeedMod`/`dodgeChanceMod` 懲罰幅度（絕對值）小於角色 B

#### Scenario: 折扣有上限，不會完全抵銷懲罰
- **WHEN** 角色 `STR`+`CON` 高到使計算出的折扣比例超過 `MAX_HEAVY_PENALTY_MITIGATION`
- **THEN** 實際折扣比例 clamp 在 `MAX_HEAVY_PENALTY_MITIGATION`，`HEAVY` 裝備的懲罰仍非零

#### Scenario: 折扣不影響 LIGHT/MEDIUM 分類
- **WHEN** 角色裝備 `LIGHT` 或 `MEDIUM` 分類道具
- **THEN** 該道具的主屬性/副屬性加成不受 `STR`+`CON` 負重折扣影響

> 角色查詢 API 上「負重」對應的可見 stats 欄位（`carryCapacity = STR + CON`）與其在角色資料面板的呈現方式，定義於 `character-progression` capability「查詢角色資料與計算後 Stats」Requirement。
