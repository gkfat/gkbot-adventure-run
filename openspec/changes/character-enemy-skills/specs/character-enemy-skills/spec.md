## ADDED Requirements

### Requirement: 角色技能靜態資料
系統 SHALL 為每個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）定義恰好一筆 `CharacterSkill` 靜態資料，包含 `archetypeId`、`skillId`、`name`、`description`、`energyThreshold`、`effect`（`SkillEffect`）。

#### Scenario: 查表取得職業戰鬥技能
- **WHEN** 戰鬥引擎需要取得某可選職業的戰鬥技能
- **THEN** 可用 `archetypeId` 查得唯一一筆 `CharacterSkill`

#### Scenario: 已停用舊職業沒有對應戰鬥技能
- **WHEN** 查詢已停用（retired）舊職業（`barbarian`/`rogue`/`paladin`/`wanderer`）的 `CharacterSkill`
- **THEN** 系統回傳查無資料，不影響其角色既有的普通攻擊行為

### Requirement: 敵人技能靜態資料
系統 SHALL 允許 `EnemyArchetype` 附帶一筆可選的 `EnemySkill`（`skillId`、`name`、`energyThreshold`、`effect`），未設定 `skill` 的敵人範本 SHALL 維持純普通攻擊行為，不受本次變更影響。

#### Scenario: 敵人範本攜帶技能
- **WHEN** 一個 `EnemyArchetype` 設定了 `skill` 欄位
- **THEN** 由該範本生成的 `CombatUnit` 在戰鬥中可依資源值觸發規則發動該技能

#### Scenario: 敵人範本未攜帶技能維持既有行為
- **WHEN** 一個 `EnemyArchetype` 未設定 `skill` 欄位
- **THEN** 由該範本生成的 `CombatUnit` 全程只會發動普通攻擊，行為與本次變更之前完全一致

### Requirement: 資源值累積與技能觸發
系統 SHALL 為戰鬥中每個具備技能的單位（玩家或敵人）維護一個 `energy` 值（初始為 0），該單位每完成一次普通攻擊行動（不論是否命中/被閃避）後 `energy` SHALL 增加固定量；輪到該單位行動時，若 `energy >= energyThreshold`，本次行動 SHALL 改為發動技能而非普通攻擊，並從 `energy` 扣除 `energyThreshold`（不歸零，允許保留溢出量）。不具備技能的單位 SHALL NOT 累積或檢查 `energy`。

#### Scenario: energy 達門檻時改為發動技能
- **WHEN** 某具備技能的單位輪到行動，且其 `energy >= energyThreshold`
- **THEN** 該次行動結算技能效果，`combatLog` 記錄一筆 `SKILL` 事件，而非 `ATTACK`/`CRIT`/`DODGE`

#### Scenario: energy 未達門檻維持普通攻擊
- **WHEN** 某具備技能的單位輪到行動，其 `energy < energyThreshold`
- **THEN** 該次行動維持既有普通攻擊流程（dodge/crit/damage 判定）

#### Scenario: 技能觸發後保留溢出 energy
- **WHEN** 一個單位觸發技能時 `energy` 為 `energyThreshold` 加上額外溢出量
- **THEN** 觸發後的 `energy` 等於觸發前數值減去 `energyThreshold`，而非重置為 0

### Requirement: 技能效果結算
系統 SHALL 支援至少 `BONUS_DAMAGE`（本次攻擊傷害依 `multiplier` 加成後套用既有傷害公式）、`HEAL_SELF`（回復施放者 `hpMax` 的 `percent` 百分比，不超過 `hpMax`）、`DEBUFF_TARGET_DEF`（目標本場戰鬥剩餘時間 `DEF` 降低 `percent` 百分比，僅作用於本次模擬記憶體中的數值，不寫回角色或敵人範本的永久資料）三種 `SkillEffect.kind`。

#### Scenario: BONUS_DAMAGE 疊加既有傷害公式
- **WHEN** 一個技能效果為 `BONUS_DAMAGE`、`multiplier = 1.5`
- **THEN** 該次技能造成的傷害為 `computeDamage` 基礎結果乘上 1.5，其餘 dodge/crit 判定規則不變

#### Scenario: HEAL_SELF 不超過生命上限
- **WHEN** 施放者當前 HP 加上治療量會超過 `hpMax`
- **THEN** 施放者 HP 結算後等於 `hpMax`，不會溢出

#### Scenario: DEBUFF_TARGET_DEF 只影響本場戰鬥計算
- **WHEN** 一個技能效果為 `DEBUFF_TARGET_DEF` 並命中目標
- **THEN** 該目標本場戰鬥後續的傷害承受計算使用降低後的 DEF，但其角色/敵人範本的永久資料不受影響
