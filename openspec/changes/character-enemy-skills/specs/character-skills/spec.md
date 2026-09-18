## ADDED Requirements

### Requirement: 角色技能與敵人技能的靜態資料
系統 SHALL 為 5 個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）各定義 2~3 個呼應該職業定位敘事的 `CharacterSkill`（`server/constants/templates/characterSkills.ts`，`CHARACTER_SKILLS: Record<archetypeId, CharacterSkill[]>`），每個技能包含 `skillId`/`name`/`description`/`icon`/`effect`（`SkillEffectKind` 之一）/`chargeSec`（靜態充能秒數）/`unlockFragmentCost`/`effectByLevel`（Lv.1~10 各自的 `SkillEffect` 數值，等級提升只增強效果數值、`chargeSec` 不隨等級變動）。系統另 SHALL 為部分敵人 archetype（`server/constants/combat.ts`）指派可選的 `EnemySkill`（`skillId`/`name`/`effect`/`chargeSec`，效果強度固定不吃等級成長），其餘敵人 archetype 維持無技能。

#### Scenario: 查表取得職業技能清單
- **WHEN** 任一消費端（技能頁、戰鬥引擎）需要某可選職業的技能清單
- **THEN** 可用 `archetypeId` 查得該職業對應的 2~3 個 `CharacterSkill`，各自包含完整的 `effectByLevel` 查表

#### Scenario: 敵人技能為可選欄位
- **WHEN** 查詢某個未被指派技能的 `EnemyArchetype`
- **THEN** 該 archetype 的 `skill` 欄位為 `undefined`，戰鬥中該敵人只會使用普通攻擊

### Requirement: 技能效果分類
系統 SHALL 支援 11 種 `SkillEffectKind`：`DAMAGE_SINGLE`（對目前普通攻擊目標造成 `ATK × multiplier` 傷害）、`DAMAGE_AOE`（對本波所有存活敵人各造成 `ATK × multiplier` 傷害）、`DAMAGE_SPLASH`（主目標 `ATK × multiplier`、其餘存活敵人 `ATK × multiplier × splashRatio`）、`FREEZE`（目標下一次行動延後 `durationSec` 秒）、`HASTE_SELF`（自身 `actionIntervalSec` 短暫下降 `percent`%，持續 `durationSec` 秒）、`HEAL_SELF`（恢復自身 `hpMax × percent`% 的 HP）、`DEFENSE_UP`（自身 `DEF` 短暫提升 `percent`%，持續 `durationSec` 秒）、`CRIT_UP`（自身 `critChance` 短暫提升 `flatPercent` 個百分點，持續 `durationSec` 秒）、`ARMOR_BREAK`（目標 `DEF` 短暫降低 `percent`%，持續 `durationSec` 秒）、`DOT`（對目標造成初始傷害後附加每次 tick 固定 `tickDamage`、共 `ticks` 次的持續傷害）、`SHIELD`（為自身建立 `hpMax × percent`% 的護盾值，優先吸收傷害直到耗盡或戰鬥結束）。

#### Scenario: 傷害類效果套用 ATK 倍率
- **WHEN** 某技能 `effect.kind = DAMAGE_SINGLE`，`multiplier = 1.5`
- **THEN** 該技能觸發造成的傷害為施放者 `ATK × 1.5`（經 crit/dodge 判定後的結果）

#### Scenario: 持續性效果標註持續時間
- **WHEN** 某技能 `effect.kind = DEFENSE_UP`，`durationSec = 8`
- **THEN** 該效果生效後 8 秒（戰鬥模擬時間）內，施放者的 `DEF` 維持提升狀態，超過後失效

### Requirement: 技能碎片累積
系統 SHALL 為每個角色維護 `skillFragments: Record<skillId, number>`，代表該角色目前持有的各技能碎片數量；碎片可透過冒險戰鬥掉落（`combat-engine` capability）或商店購買（`shop` capability）取得，累積不設上限。

#### Scenario: 取得碎片累加至角色資料
- **WHEN** 角色透過任一管道取得 `skillId` 為 `overclock` 的碎片 5 個，角色原本 `skillFragments.overclock` 為 3
- **THEN** 該角色 `skillFragments.overclock` 更新為 8

#### Scenario: 從未取得過碎片的技能不出現在紀錄中
- **WHEN** 查詢一個從未取得過任何 `weak_point_analysis` 碎片的角色
- **THEN** 該角色的 `skillFragments` 不包含 `weak_point_analysis` 這個 key，視為 0

### Requirement: 解鎖技能
系統 SHALL 提供 `POST /api/character/:characterId/skills/unlock`，允許玩家對指定角色（須屬於自己帳號）解鎖一個尚未解鎖、且 `skillFragments[skillId] >= unlockFragmentCost` 的技能：扣除 `unlockFragmentCost` 個碎片（超額碎片保留），並在 `unlockedSkills[skillId]` 建立 `{ level: 1, exp: 0 }`。目標技能須屬於該角色 `archetypeId` 對應的 `CHARACTER_SKILLS` 清單，任一驗證失敗時系統 SHALL 回傳 400 且不修改任何資料。

#### Scenario: 成功解鎖
- **WHEN** 角色 `skillFragments.overclock = 25`，`overclock.unlockFragmentCost = 20`，送出解鎖請求
- **THEN** `skillFragments.overclock` 變為 5，`unlockedSkills.overclock = { level: 1, exp: 0 }`

#### Scenario: 碎片不足
- **WHEN** 角色 `skillFragments.overclock = 10`，`overclock.unlockFragmentCost = 20`
- **THEN** 系統回傳 400，不修改 `skillFragments`/`unlockedSkills`

#### Scenario: 已解鎖的技能不可重複解鎖
- **WHEN** 角色的 `unlockedSkills` 已包含目標 `skillId`
- **THEN** 系統回傳 400，不修改任何資料

#### Scenario: 技能不屬於該角色職業
- **WHEN** 玩家對角色送出的 `skillId` 不在該角色 `archetypeId` 對應的 `CHARACTER_SKILLS` 清單中
- **THEN** 系統回傳 400，不修改任何資料

### Requirement: 技能等級與 exp 曲線
系統 SHALL 依累積 `exp` 決定 `unlockedSkills[skillId].level`，等級範圍 1~10，採用固定遞增的 Lv.1~10 exp 門檻表（`SKILL_EXP_TABLE`，獨立於 `weapon-proficiency` 的門檻表）；exp 達門檻時 SHALL 自動視為已升級，不需要玩家手動觸發任何端點，等級 10 為上限，超過門檻的 exp 繼續累積但不再提升等級。技能等級提升時，戰鬥中觸發的效果數值改用 `effectByLevel[level - 1]`，`chargeSec` 維持不變。

#### Scenario: exp 累積達門檻自動升級
- **WHEN** 角色某已解鎖技能的 exp 跨過 Lv.3 所需門檻
- **THEN** 查詢角色資料時，該技能 `unlockedSkills[skillId].level` 已更新為 3

#### Scenario: 等級上限為 10
- **WHEN** 角色某已解鎖技能的 exp 超過 Lv.10 所需門檻
- **THEN** `level` 維持為 10，exp 持續累積但不影響 level

#### Scenario: 等級提升只影響效果數值，不影響充能時間
- **WHEN** 角色某技能從 Lv.2 升級到 Lv.3
- **THEN** 該技能戰鬥中套用的 `effect` 數值改用 `effectByLevel[2]`，`chargeSec` 與升級前完全相同

### Requirement: 戰鬥觸發累積技能 exp
系統 SHALL 於每場戰鬥結算（`combat-engine` capability 的 `resolve()`）時，依角色本場戰鬥中每個已佩戴技能的實際觸發次數，一次性為對應 `unlockedSkills[skillId].exp` 累加 `EXP_PER_SKILL_TRIGGER × 觸發次數`，並套用「技能等級與 exp 曲線」的升級判定。

#### Scenario: 戰鬥觸發次數轉換為 exp
- **WHEN** 角色佩戴的 `overclock` 技能在本場戰鬥中觸發 2 次
- **THEN** 戰鬥結算後 `unlockedSkills.overclock.exp` 增加 `EXP_PER_SKILL_TRIGGER × 2`

#### Scenario: 未佩戴的技能不累積 exp
- **WHEN** 角色已解鎖但未佩戴的技能在本場戰鬥中不會被觸發
- **THEN** 戰鬥結算後該技能的 `exp` 不變化

### Requirement: 消耗碎片主動強化技能
系統 SHALL 提供 `POST /api/character/:characterId/skills/strengthen`，允許玩家消耗指定數量（`fragmentsToSpend`，不超過角色目前 `skillFragments[skillId]`）的已解鎖技能碎片，依固定匯率 `FRAGMENT_TO_EXP_RATE` 轉換為該技能的 exp 並套用升級判定；目標技能須已存在於 `unlockedSkills`。

#### Scenario: 成功強化並升級
- **WHEN** 角色 `unlockedSkills.overclock = { level: 2, exp: 0 }`，`skillFragments.overclock = 10`，送出 `fragmentsToSpend = 10`，換算 exp 恰好達到 Lv.3 門檻
- **THEN** `skillFragments.overclock` 變為 0，`unlockedSkills.overclock` 更新為 `{ level: 3, exp: <對應餘額> }`

#### Scenario: 消耗數量超過持有碎片
- **WHEN** 角色 `skillFragments.overclock = 5`，送出 `fragmentsToSpend = 10`
- **THEN** 系統回傳 400，不修改 `skillFragments`/`unlockedSkills`

#### Scenario: 強化尚未解鎖的技能
- **WHEN** 玩家對尚未出現在 `unlockedSkills` 的 `skillId` 送出強化請求
- **THEN** 系統回傳 400，不修改任何資料

### Requirement: 技能佩戴欄位依角色等級開放
系統 SHALL 為每個角色維護 `equippedSkillIds`（固定長度 3 的陣列，未佩戴的欄位為 `null`），角色目前開放的佩戴欄位數 `unlockedSlotCount = min(3, 1 + floor(level / 7))`：Lv.1~6 開放 1 格、Lv.7~13 開放 2 格、Lv.14 以上開放 3 格（欄位總數上限 3，不因等級持續提升）。查詢角色技能資料時，系統 SHALL 一併回傳 `unlockedSlotCount`。

#### Scenario: 初始只開放 1 格
- **WHEN** 角色 `level = 3`
- **THEN** 回傳的 `unlockedSlotCount = 1`

#### Scenario: 滿 7 級開放第 2 格
- **WHEN** 角色 `level = 7`
- **THEN** 回傳的 `unlockedSlotCount = 2`

#### Scenario: 滿 14 級開放第 3 格且不再增加
- **WHEN** 角色 `level = 20`
- **THEN** 回傳的 `unlockedSlotCount = 3`

### Requirement: 裝備與卸下技能
系統 SHALL 提供 `POST /api/character/:characterId/skills/equip`，允許玩家將已解鎖技能放入指定 `slotIndex`（0-based）或從指定 `slotIndex` 卸下（`skillId = null`）。放入時須通過以下驗證，任一失敗時系統 SHALL 回傳 400 且不修改任何資料：
- `slotIndex` 須小於角色目前 `unlockedSlotCount`。
- 目標 `skillId` 須存在於該角色 `unlockedSkills`。
- 目標 `skillId` 須尚未出現在 `equippedSkillIds` 的其他欄位（不自動搬移，需玩家先卸下）。

#### Scenario: 成功佩戴
- **WHEN** 角色 `unlockedSlotCount = 2`，`equippedSkillIds = [null, null, null]`，已解鎖 `overclock`，送出 `{ skillId: 'overclock', slotIndex: 0 }`
- **THEN** `equippedSkillIds` 變為 `['overclock', null, null]`

#### Scenario: 佩戴到未開放的欄位
- **WHEN** 角色 `unlockedSlotCount = 1`，送出 `{ skillId: 'overclock', slotIndex: 1 }`
- **THEN** 系統回傳 400，`equippedSkillIds` 不變

#### Scenario: 技能已佩戴在其他欄位
- **WHEN** 角色 `equippedSkillIds = ['overclock', null, null]`，送出 `{ skillId: 'overclock', slotIndex: 1 }`
- **THEN** 系統回傳 400，`equippedSkillIds` 不變

#### Scenario: 卸下技能
- **WHEN** 角色 `equippedSkillIds = ['overclock', null, null]`，送出 `{ skillId: null, slotIndex: 0 }`
- **THEN** `equippedSkillIds` 變為 `[null, null, null]`

### Requirement: 查詢角色技能資料
系統 SHALL 提供 `GET /api/character/:characterId/skills`，回傳該角色 `archetypeId` 對應的完整 `CHARACTER_SKILLS` 清單，每筆包含 `skillId`/`name`/`icon`；已取得碎片或已解鎖的技能額外附上 `fragmentCount`/`unlockFragmentCost`，已解鎖的技能再附上 `level`/`exp`/目前生效的 `effect`（`effectByLevel[level-1]`）/`isEquipped`；尚未取得任何碎片、也未解鎖的技能 SHALL NOT 包含 `description`/效果數值細節，僅回傳 `skillId`/`name`/`icon`/`unlockFragmentCost`。回應另 SHALL 包含 `unlockedSlotCount` 與 `equippedSkillIds`。

#### Scenario: 查詢已解鎖技能
- **WHEN** 玩家查詢自己角色的技能資料，某技能已解鎖且為 Lv.3
- **THEN** 回應中該技能包含 `level = 3`、`exp`、目前生效的 `effect` 數值、`isEquipped` 狀態

#### Scenario: 查詢尚未取得碎片的技能
- **WHEN** 玩家查詢自己角色的技能資料，某技能從未取得過碎片
- **THEN** 回應中該技能只包含 `skillId`/`name`/`icon`/`unlockFragmentCost`，不包含 `description`/效果數值

#### Scenario: 查詢他人角色的技能資料被拒絕
- **WHEN** 已登入玩家查詢不屬於自己帳號的 `characterId` 的技能資料
- **THEN** 系統回傳 404，不回傳任何技能資料

### Requirement: 不支援技能重置
系統 SHALL NOT 提供任何將已解鎖技能的 `level`/`exp` 歸零、或將已消耗的 `skillFragments`/`unlockFragmentCost` 收回的端點。

#### Scenario: 無重置端點
- **WHEN** 玩家嘗試尋找可將 `unlockedSkills` 某技能等級歸零、或退還已消耗碎片的 API
- **THEN** 系統不提供此類端點

### Requirement: 角色頁「技能」tab 呈現
系統 SHALL 在 `inventory` 頁（`app/pages/inventory.vue`）的 tab 切換新增「技能」選項，比照既有裝備/道具 tab 的一格一格格狀呈現：上方固定顯示 3 個佩戴欄位格（依 `unlockedSlotCount` 區分已開放/未開放），下方為該角色職業全部技能的格狀清單；未解鎖的技能格 SHALL 以碎片進度（`目前/門檻`）呈現，不顯示效果數值細節，已解鎖的技能格 SHALL 顯示目前等級與是否佩戴中的標記。點擊任一技能格 SHALL 開啟 dialog：已解鎖時顯示技能標題、描述、目前等級效果數值、exp 進度、強化操作、佩戴/卸下操作；未解鎖時顯示技能標題、描述、碎片進度，不顯示效果數值。

#### Scenario: 新增技能 tab
- **WHEN** 玩家進入角色頁（`/inventory`）
- **THEN** tab 選項中包含「技能」，點擊後切換至技能格狀清單

#### Scenario: 未解鎖技能格顯示碎片進度
- **WHEN** 技能 tab 中某技能尚未解鎖，`skillFragments[skillId] = 8`，`unlockFragmentCost = 20`
- **THEN** 該技能格顯示「8 / 20」的碎片進度，不顯示效果描述細節

#### Scenario: 點擊技能格開啟 dialog
- **WHEN** 玩家點擊一個已解鎖的技能格
- **THEN** 系統開啟 dialog，顯示該技能的標題、描述、目前等級效果數值、exp 進度、強化與佩戴/卸下操作按鈕

#### Scenario: 佩戴欄位格顯示已開放/未開放狀態
- **WHEN** 角色 `unlockedSlotCount = 1`
- **THEN** 上方 3 個佩戴欄位格中，第 1 格顯示為可用（可放入已解鎖技能），第 2、3 格顯示為未開放（不可點擊放入）
