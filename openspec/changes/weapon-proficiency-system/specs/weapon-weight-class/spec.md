## ADDED Requirements

### Requirement: 全部裝備定義獨立重量點數
系統 SHALL 為每個 `type: EQUIPMENT` 的 `ItemTemplate`（涵蓋 `HEAD`/`BODY`/`SHOES`/`LEFT_HAND`/`RIGHT_HAND`/`RING` 全部 6 個槽位）定義一個獨立的 `weight`（正整數），不隨稀有度改變。

#### Scenario: 每個裝備都有 weight
- **WHEN** 檢視任一 `type: EQUIPMENT` 的 `ItemTemplate`
- **THEN** 該 template 定義 `weight` 為一個正整數

#### Scenario: weight 不隨稀有度變動
- **WHEN** 同一個 template 分別生成不同稀有度的物品實體
- **THEN** 各實例的 `weight` 皆相同，等於該 template 定義的數值

### Requirement: 全身總重超過負重上限時套用固定懲罰，不阻擋裝備
系統 SHALL 在角色 stats 計算時，加總其目前 6 個裝備槽位已裝備道具的 `weight`，若總和超過角色 `carryCapacity`（`STR+CON+talentBonus.carryCapacity`），依超出量套用固定懲罰表（累加，見 design.md D6 的懲罰表），疊加於既有 HEAVY 分類道具本身的 `actionSpeedMod`/`dodgeChanceMod` 懲罰之外（兩者並存，互不取代、互不折抵）。裝備/卸下動作 SHALL NOT 因總重超過 `carryCapacity` 而被拒絕。

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
系統 SHALL 依每個 `type: EQUIPMENT` 的 `ItemTemplate`（不限 `equipSlot`，涵蓋 `LEFT_HAND`/`RIGHT_HAND`/`HEAD`/`BODY`/`SHOES`/`RING`）的 `weight` 數值，自動推導出其 `weaponWeightClass`（`LIGHT` / `MEDIUM` / `HEAVY`）：`weight` 落在對應區間即決定該分類（區間門檻見 design.md D6），`weaponWeightClass` 不再是範本獨立指定的欄位，而是由 `weight` 計算得出的衍生值，不隨稀有度改變（因為 `weight` 本身不隨稀有度改變）。

#### Scenario: 分類由 weight 推導，固定不隨稀有度變動
- **WHEN** 同一個 template 分別生成 rarity=N 與 rarity=L 的物品實體
- **THEN** 兩個實例的 `weaponWeightClass` 皆相同，等於依該 template `weight` 推導出的分類

#### Scenario: weight 落在不同區間得到不同分類
- **WHEN** 兩個 template 的 `weight` 分別落在 LIGHT 與 HEAVY 的區間
- **THEN** 兩者推導出的 `weaponWeightClass` 分別為 `LIGHT`／`HEAVY`

#### Scenario: 非 EQUIPMENT 類道具不需要重量分類
- **WHEN** 檢視 `type` 為 `POTION` 的 template
- **THEN** 該 template 不需要（也不應該）定義 `weight` 或 `weaponWeightClass`
