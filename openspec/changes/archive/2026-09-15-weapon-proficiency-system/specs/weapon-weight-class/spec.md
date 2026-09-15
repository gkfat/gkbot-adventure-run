## ADDED Requirements

### Requirement: 範本定義基準重量，實例依稀有度與 roll 品質動態推導最終重量
系統 SHALL 為每個 `type: EQUIPMENT` 的 `ItemTemplate`（涵蓋 `HEAD`/`BODY`/`SHOES`/`LEFT_HAND`/`RIGHT_HAND`/`RING` 全部 6 個槽位）定義一個獨立的 `weight`（正整數）作為基準值。系統 SHALL 在生成 `ItemInstance` 時，依該 instance 的 rarity 與主屬性（`ATK`/`DEF`）roll 品質，疊加 `RARITY_WEIGHT_BONUS`／`ROLL_QUALITY_BONUS`（見 design.md D6）於範本基準值之上，得出該 instance 最終的 `weight`，不再直接沿用範本值。

#### Scenario: 每個裝備範本都有基準 weight
- **WHEN** 檢視任一 `type: EQUIPMENT` 的 `ItemTemplate`
- **THEN** 該 template 定義 `weight` 為一個正整數，代表基準值

#### Scenario: weight 隨稀有度提升而增加
- **WHEN** 同一個 template 分別生成不同稀有度的物品實體
- **THEN** 較高稀有度 instance 的最終 `weight` 不低於較低稀有度 instance（依 `RARITY_WEIGHT_BONUS` 遞增）

#### Scenario: roll 品質較好時 weight 較重
- **WHEN** 同一個 template、同一稀有度分別生成兩個 instance，其中一個的主屬性（`ATK`/`DEF`）roll 結果落在該稀有度區間中位數以上，另一個落在中位數以下
- **THEN** 主屬性 roll 結果較高的 instance，最終 `weight` 比另一個高（或至少不低）

### Requirement: 全身總重超過負重上限時套用固定懲罰，不阻擋裝備
系統 SHALL 在角色 stats 計算時，加總其目前 6 個裝備槽位已裝備道具的 `weight`（instance 最終值，已含稀有度/roll 加成），若總和超過角色 `carryCapacity`（`BASE_CARRY_CAPACITY + (STR+CON)×CARRY_CAPACITY_PER_STAT_POINT + talentBonus.carryCapacity`），依超出量套用固定懲罰表（累加，見 design.md D6 的懲罰表），疊加於既有 HEAVY 分類道具本身的 `actionSpeedMod`/`dodgeChanceMod` 懲罰之外（兩者並存，互不取代、互不折抵）。裝備/卸下動作 SHALL NOT 因總重超過 `carryCapacity` 而被拒絕。

#### Scenario: 超重只影響 stats，不擋裝備
- **WHEN** 角色目前已裝備道具的 `weight` 總和已達到 `carryCapacity`，玩家再裝備一件會讓總和超過上限的道具
- **THEN** 裝備動作成功執行，`equipment` 正常更新為新道具

#### Scenario: 超重套用固定懲罰
- **WHEN** 角色裝備後總重量比 `carryCapacity` 多 1 點
- **THEN** 查詢角色資料時，回傳的 `stats.actionIntervalSec` 比未超重時多 0.5 秒

#### Scenario: 超重懲罰隨超出量疊加
- **WHEN** 角色裝備後總重量比 `carryCapacity` 多 2 點
- **THEN** `stats.actionIntervalSec` 的懲罰與超出 1 點時相同，另外還疊加 `dodgeChance` 的懲罰

#### Scenario: 超重懲罰與 HEAVY 道具本身的懲罰並存
- **WHEN** 角色裝備一件 `HEAVY` 分類道具（已有其自身的 `actionSpeedMod`/`dodgeChanceMod` 懲罰，且已套用 STR+CON 折扣），且全身總重同時超過 `carryCapacity`
- **THEN** 回傳的 stats 同時反映 HEAVY 道具自身的懲罰（含折扣後）與全身超重的固定懲罰，兩者分別計算後加總，互不取代

#### Scenario: 卸下裝備後懲罰隨之解除
- **WHEN** 角色卸下部分裝備，使總重量回到 `carryCapacity` 以內
- **THEN** 查詢角色資料時，超重固定懲罰不再套用於 stats

## MODIFIED Requirements

### Requirement: 裝備重量分類定義
系統 SHALL 依每個 `type: EQUIPMENT` 的 `ItemInstance`（不限 `equipSlot`，涵蓋 `LEFT_HAND`/`RIGHT_HAND`/`HEAD`/`BODY`/`SHOES`/`RING`）最終的 `weight` 數值（已含稀有度/roll 加成），自動推導出其 `weaponWeightClass`（`LIGHT` / `MEDIUM` / `HEAVY`）：`weight` 落在對應區間即決定該分類（區間門檻見 design.md D6），`weaponWeightClass` 不是範本或實例上獨立指定的欄位，而是由 `weight` 計算得出的衍生值。因為 instance `weight` 依稀有度/roll 品質變動，同一個 template 在不同稀有度下生成的 instance，`weaponWeightClass` 可能不同（例如基準值接近門檻的範本，在高稀有度會被推到更高一級分類）。

#### Scenario: 高稀有度可能把分類推到更高一級
- **WHEN** 同一個 template 的基準 `weight` 落在某分類區間的上緣（例如 MEDIUM 區間的 6），分別生成 rarity=N 與 rarity=L 的物品實體
- **THEN** rarity=N 的 instance 維持原分類（MEDIUM），rarity=L 的 instance 因 `RARITY_WEIGHT_BONUS` 疊加後 `weight` 超過門檻，`weaponWeightClass` 推導為更高一級（HEAVY）

#### Scenario: weight 落在不同區間得到不同分類
- **WHEN** 兩個 template 的 `weight` 分別落在 LIGHT 與 HEAVY 的區間
- **THEN** 兩者推導出的 `weaponWeightClass` 分別為 `LIGHT`／`HEAVY`

#### Scenario: 非 EQUIPMENT 類道具不需要重量分類
- **WHEN** 檢視 `type` 為 `POTION` 的 template
- **THEN** 該 template 不需要（也不應該）定義 `weight` 或 `weaponWeightClass`
