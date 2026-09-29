# character-skills

## Purpose

角色技能系統：10 個通用角色技能（不限職業）與敵人技能的定義、技能碎片取得與累積、解鎖/星等升級/晶片升級/佩戴流程，以及角色頁「技能」tab 的呈現。技能於戰鬥中的觸發與效果結算屬於 `combat-engine` capability。

## Requirements

### Requirement: 角色技能與敵人技能的靜態資料
系統 SHALL 定義共 10 個 `CharacterSkill`（`shared/constants/characterSkills.ts`）：資料依 5 個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）各 2 個排列於 `CHARACTER_SKILLS: Record<archetypeId, CharacterSkill[]>`（`archetypeId` 僅作敘事/美術分類，不限制可用角色），並攤平為 `ALL_CHARACTER_SKILLS` 通用清單供解鎖驗證、技能頁、碎片掉落池與商店使用。每個技能包含 `skillId`/`name`/`description`/`icon`/`effect`（`SkillEffectKind` 之一）/`chargeSec`（靜態充能秒數）/`unlockFragmentCost`/`effectByLevel`（Lv.1~10 各自的 `SkillEffect` 數值，等級提升只增強效果數值、`chargeSec` 不隨等級變動）。系統另 SHALL 為部分敵人 archetype（`server/constants/combat.ts`）指派可選的 `EnemySkill`（`skillId`/`name`/`effect`/`chargeSec`，效果強度固定不吃等級成長），其餘敵人 archetype 維持無技能。

#### Scenario: 查表取得通用技能清單
- **WHEN** 任一消費端（技能頁、戰鬥引擎、掉落/商店）需要技能清單
- **THEN** 可由 `ALL_CHARACTER_SKILLS` 取得全部 10 個 `CharacterSkill`（不依角色職業過濾），各自包含完整的 `effectByLevel` 查表

#### Scenario: 依 archetypeId 查表僅為分類用途
- **WHEN** 以某 `archetypeId` 查詢 `CHARACTER_SKILLS`
- **THEN** 得到該職業原屬的 2 個技能，但任一角色仍可解鎖/佩戴清單中的任何技能

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
系統 SHALL 為每個角色維護 `skillFragments: Record<skillId, number>`，代表該角色目前持有的各技能碎片數量；碎片可透過冒險戰鬥掉落（`combat-engine` capability，從全部 10 個技能等機率挑選）或商店購買（`shop` capability）取得，累積不設上限；碎片僅用於「解鎖技能」與「技能星等」升星，不可直接轉換為技能 exp。

#### Scenario: 取得碎片累加至角色資料
- **WHEN** 角色透過任一管道取得 `skillId` 為 `overclock` 的碎片 5 個，角色原本 `skillFragments.overclock` 為 3
- **THEN** 該角色 `skillFragments.overclock` 更新為 8

#### Scenario: 從未取得過碎片的技能不出現在紀錄中
- **WHEN** 查詢一個從未取得過任何 `weak_point_analysis` 碎片的角色
- **THEN** 該角色的 `skillFragments` 不包含 `weak_point_analysis` 這個 key，視為 0

### Requirement: 解鎖技能
系統 SHALL 提供 `POST /api/character/:characterId/skills/unlock`，允許玩家對指定角色（須屬於自己帳號）解鎖任一個尚未解鎖、且 `skillFragments[skillId] >= unlockFragmentCost` 的技能：扣除 `unlockFragmentCost` 個碎片（超額碎片保留），並在 `unlockedSkills[skillId]` 建立 `{ level: 1, exp: 0, star: 1 }`。目標技能只須存在於全部 10 個 `CharacterSkill` 的通用清單中（`ALL_CHARACTER_SKILLS`），不再受角色 `archetypeId` 限制——任一角色皆可解鎖任一技能。任一驗證失敗時系統 SHALL 回傳 400 且不修改任何資料。

#### Scenario: 成功解鎖
- **WHEN** 角色 `skillFragments.overclock = 25`，`overclock.unlockFragmentCost = 20`，送出解鎖請求
- **THEN** `skillFragments.overclock` 變為 5，`unlockedSkills.overclock = { level: 1, exp: 0, star: 1 }`

#### Scenario: 碎片不足
- **WHEN** 角色 `skillFragments.overclock = 10`，`overclock.unlockFragmentCost = 20`
- **THEN** 系統回傳 400，不修改 `skillFragments`/`unlockedSkills`

#### Scenario: 已解鎖的技能不可重複解鎖
- **WHEN** 角色的 `unlockedSkills` 已包含目標 `skillId`
- **THEN** 系統回傳 400，不修改任何資料

#### Scenario: 可解鎖非本角色職業的技能
- **WHEN** 角色 `archetypeId = 'fighter'`，玩家對其送出 `skillId = 'scholar_weak_point_mark'`（原屬 `scholar` 職業）的解鎖請求，且碎片足夠
- **THEN** 系統成功解鎖該技能，不因職業不符而拒絕

#### Scenario: 未知技能不可解鎖
- **WHEN** 玩家送出的 `skillId` 不存在於 `ALL_CHARACTER_SKILLS`
- **THEN** 系統回傳 400，不修改任何資料

### Requirement: 技能等級與 exp 曲線
系統 SHALL 依累積 `exp` 決定 `unlockedSkills[skillId].level`，等級範圍 1~10，採用固定遞增的 Lv.1~10 exp 門檻表（`SKILL_EXP_TABLE`，獨立於 `weapon-proficiency` 的門檻表，各星等共用同一張表）；`exp` 為「目前星等內」的累積值，升星（見「技能星等」）後 `level`/`exp` 重置為 `1`/`0` 並重新依此曲線累積；exp 達門檻時 SHALL 自動視為已升級，不需要玩家手動觸發任何端點，等級 10 為上限，超過門檻的 exp 繼續累積但不再提升等級。技能等級提升時，戰鬥中觸發的效果數值改用 `effectByLevel[level - 1]`，`chargeSec` 維持不變。

#### Scenario: exp 累積達門檻自動升級
- **WHEN** 角色某已解鎖技能的 exp 跨過 Lv.3 所需門檻
- **THEN** 查詢角色資料時，該技能 `unlockedSkills[skillId].level` 已更新為 3

#### Scenario: 等級上限為 10
- **WHEN** 角色某已解鎖技能的 exp 超過 Lv.10 所需門檻
- **THEN** `level` 維持為 10，exp 持續累積但不影響 level

#### Scenario: 升星後等級曲線重新開始
- **WHEN** 角色某技能升星成功，`level`/`exp` 重置為 `1`/`0`
- **THEN** 後續 exp 累積依同一張 `SKILL_EXP_TABLE` 從 Lv.1 重新計算，不因星等而使用不同門檻

#### Scenario: 等級提升只影響效果數值，不影響充能時間
- **WHEN** 角色某技能從 Lv.2 升級到 Lv.3
- **THEN** 該技能戰鬥中套用的 `effect` 數值改用 `effectByLevel[2]`，`chargeSec` 與升級前完全相同

### Requirement: 戰鬥觸發累積技能 exp
系統 SHALL 於每場戰鬥結算（`combat-engine` capability 的 `resolve()`）時，依角色本場戰鬥中每個已佩戴技能的實際觸發次數，一次性為對應 `unlockedSkills[skillId].exp` 累加 `EXP_PER_SKILL_TRIGGER × 觸發次數`，並套用「技能等級與 exp 曲線」的升級判定；每次觸發的 exp 量不因星等而異，且該技能已達 Lv.10 時 exp 仍持續累加、`level` 維持 10。

#### Scenario: 戰鬥觸發次數轉換為 exp
- **WHEN** 角色佩戴的 `overclock` 技能在本場戰鬥中觸發 2 次
- **THEN** 戰鬥結算後 `unlockedSkills.overclock.exp` 增加 `EXP_PER_SKILL_TRIGGER × 2`

#### Scenario: 未佩戴的技能不累積 exp
- **WHEN** 角色已解鎖但未佩戴的技能在本場戰鬥中不會被觸發
- **THEN** 戰鬥結算後該技能的 `exp` 不變化

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
系統 SHALL 提供 `GET /api/character/:characterId/skills`，回傳全部 10 個通用技能（`ALL_CHARACTER_SKILLS`，不再依角色 `archetypeId` 過濾），每筆包含 `skillId`/`name`/`icon`；已取得碎片或已解鎖的技能額外附上 `fragmentCount`/`unlockFragmentCost`，已解鎖的技能再附上 `level`/`exp`/`star`/目前生效的 `effect`（已套用星等加成的 `effectByLevel[level-1]`）/`isEquipped`；尚未取得任何碎片、也未解鎖的技能 SHALL NOT 包含 `description`/效果數值細節，僅回傳 `skillId`/`name`/`icon`/`unlockFragmentCost`。回應另 SHALL 包含 `unlockedSlotCount` 與 `equippedSkillIds`。缺少 `star` 欄位的既有紀錄（本變更上線前建立）SHALL 被視為 `star = 1`。

#### Scenario: 查詢已解鎖技能
- **WHEN** 玩家查詢自己角色的技能資料，某技能已解鎖且為 `star = 2`、`Lv.3`
- **THEN** 回應中該技能包含 `level = 3`、`star = 2`、`exp`、已套用星等加成的 `effect` 數值、`isEquipped` 狀態

#### Scenario: 查詢尚未取得碎片的技能
- **WHEN** 玩家查詢自己角色的技能資料，某技能從未取得過碎片
- **THEN** 回應中該技能只包含 `skillId`/`name`/`icon`/`unlockFragmentCost`，不包含 `description`/效果數值

#### Scenario: 回傳全部技能，不受角色職業限制
- **WHEN** 角色 `archetypeId = 'fighter'` 查詢自己的技能資料
- **THEN** 回應的技能清單包含全部 10 個技能（含其餘 4 職業的技能），不只是 `fighter` 的 2 個

#### Scenario: 舊資料缺少 star 欄位時視為 1
- **WHEN** 角色 `unlockedSkills.overclock = { level: 3, exp: 120 }`（本變更上線前寫入，無 `star` 欄位）
- **THEN** 查詢回應中該技能的 `star` 為 1

#### Scenario: 查詢他人角色的技能資料被拒絕
- **WHEN** 已登入玩家查詢不屬於自己帳號的 `characterId` 的技能資料
- **THEN** 系統回傳 404，不回傳任何技能資料

### Requirement: 不支援技能重置
系統 SHALL NOT 提供任何將已解鎖技能的 `level`/`exp` 歸零、或將已消耗的 `skillFragments`/`unlockFragmentCost` 收回的端點。

#### Scenario: 無重置端點
- **WHEN** 玩家嘗試尋找可將 `unlockedSkills` 某技能等級歸零、或退還已消耗碎片的 API
- **THEN** 系統不提供此類端點

### Requirement: 角色頁「技能」tab 呈現
系統 SHALL 在 `inventory` 頁（`app/pages/inventory.vue`）的 tab 切換新增「技能」選項，比照既有裝備/道具 tab 的一格一格格狀呈現：上方固定顯示 3 個佩戴欄位格（依 `unlockedSlotCount` 區分已開放/未開放），下方為全部 10 個通用技能的格狀清單（不再依角色職業分組/過濾）；未解鎖的技能格 SHALL 以碎片進度（`目前/門檻`）呈現，不顯示效果數值細節，已解鎖的技能格 SHALL 顯示目前星等與等級（例如「★2 Lv.3」）與是否佩戴中的標記。點擊任一技能格 SHALL 開啟 dialog：已解鎖時顯示技能標題、描述、星等、目前等級效果數值（已套用星等加成）、exp 進度、佩戴/卸下操作、可用的技能經驗值晶片庫存與「使用晶片升級」操作、以及 Lv.10 時的「消耗碎片升星」操作（顯示下一星等所需碎片數與目前持有碎片數）；未解鎖時顯示技能標題、描述、碎片進度，不顯示效果數值。

#### Scenario: 新增技能 tab
- **WHEN** 玩家進入角色頁（`/inventory`）
- **THEN** tab 選項中包含「技能」，點擊後切換至技能格狀清單，清單包含全部 10 個技能

#### Scenario: 未解鎖技能格顯示碎片進度
- **WHEN** 技能 tab 中某技能尚未解鎖，`skillFragments[skillId] = 8`，`unlockFragmentCost = 20`
- **THEN** 該技能格顯示「8 / 20」的碎片進度，不顯示效果描述細節

#### Scenario: 已解鎖技能格顯示星等與等級
- **WHEN** 某已解鎖技能 `star = 2`、`level = 3`
- **THEN** 該技能格顯示「★2 Lv.3」樣式的標示

#### Scenario: 點擊技能格開啟 dialog
- **WHEN** 玩家點擊一個已解鎖的技能格
- **THEN** 系統開啟 dialog，顯示該技能的標題、描述、星等、目前等級效果數值、exp 進度、佩戴/卸下操作、晶片使用操作，Lv.10 時額外顯示升星操作

#### Scenario: Lv.10 未滿星時顯示升星入口
- **WHEN** 玩家點擊一個 `level = 10`、`star = 2`（未達上限 5）的已解鎖技能格
- **THEN** dialog 顯示「消耗 200 個碎片升至 ★3」的操作，並顯示玩家目前持有的碎片數

#### Scenario: 未滿 Lv.10 不顯示升星入口
- **WHEN** 玩家點擊一個 `level = 5` 的已解鎖技能格
- **THEN** dialog 不顯示升星操作，只顯示晶片升級操作

#### Scenario: 佩戴欄位格顯示已開放/未開放狀態
- **WHEN** 角色 `unlockedSlotCount = 1`
- **THEN** 上方 3 個佩戴欄位格中，第 1 格顯示為可用（可放入已解鎖技能），第 2、3 格顯示為未開放（不可點擊放入）

### Requirement: 技能星等
系統 SHALL 為每個已解鎖技能維護 `star`（整數，1~5），解鎖時固定為 1。技能星等只有在該技能 `level = SKILL_MAX_LEVEL(10)` 且 `star < 5` 時，才可透過消耗技能碎片升星；升星消耗的碎片數依目前星等固定：升至 2★ 需 50 個、升至 3★ 需 200 個、升至 4★ 需 450 個、升至 5★ 需 800 個。升星成功後，該技能的 `level`/`exp` 重置為 `1`/`0`（重新從 Lv.1 開始在新星等下練級），`star` 增加 1。5★ 為星等上限，系統 SHALL NOT 提供超過 5★ 的升星。系統 SHALL 提供 `POST /api/character/:characterId/skills/star-up`（body：`skillId`）執行此操作；任一前置條件不成立（未達 Lv.10、已達 5★上限、碎片不足、技能未解鎖）時系統 SHALL 回傳 400 且不修改任何資料。

#### Scenario: 成功升星
- **WHEN** 角色某已解鎖技能 `level = 10`、`star = 1`，`skillFragments[skillId] = 60`，送出升星請求
- **THEN** `skillFragments[skillId]` 變為 10，該技能更新為 `{ level: 1, exp: 0, star: 2 }`

#### Scenario: 未達 Lv.10 不可升星
- **WHEN** 角色某已解鎖技能 `level = 8`，送出升星請求
- **THEN** 系統回傳 400，不修改任何資料

#### Scenario: 已達星等上限不可再升星
- **WHEN** 角色某已解鎖技能 `level = 10`、`star = 5`
- **THEN** 系統回傳 400，不修改任何資料

#### Scenario: 碎片不足不可升星
- **WHEN** 角色某已解鎖技能 `level = 10`、`star = 2`（升至 3★ 需 200 碎片），`skillFragments[skillId] = 100`
- **THEN** 系統回傳 400，不修改任何資料

#### Scenario: 技能尚未解鎖不可升星
- **WHEN** 玩家對尚未出現在 `unlockedSkills` 的 `skillId` 送出升星請求
- **THEN** 系統回傳 400，不修改任何資料

### Requirement: 星等對技能效果的加成
系統 SHALL 在結算技能生效效果（戰鬥觸發、技能頁顯示）時，依目前 `star` 對 `effectByLevel[level-1]` 套用加成：`multiplier`/`percent`/`flatPercent`/`FREEZE` 效果的 `durationSec`（凍結時長本身即為該效果主數值）等數值類欄位，SHALL 乘以 `1 + 0.1 × (star - 1)`；其餘作為「持續性 buff 持續時間」用途的 `durationSec`（如 `DEFENSE_UP`/`HASTE_SELF`/`CRIT_UP`/`ARMOR_BREAK` 的效果持續秒數）SHALL NOT 受星等影響。技能定義本身的靜態 `chargeSec` SHALL 乘以 `max(0.6, 1 - 0.05 × (star - 1))`（充能時間隨星等縮短，下限為原始值的 60%）。

#### Scenario: 傷害類效果隨星等放大
- **WHEN** 某 `DAMAGE_SINGLE` 技能 `star = 3`，`effectByLevel[level-1].multiplier = 1.5`
- **THEN** 實際生效的傷害倍率為 `1.5 × 1.2 = 1.8`

#### Scenario: FREEZE 的 durationSec 隨星等放大
- **WHEN** 某 `FREEZE` 技能 `star = 2`，`effectByLevel[level-1].durationSec = 3`
- **THEN** 實際生效的凍結時長為 `3 × 1.1 = 3.3` 秒

#### Scenario: 持續性 buff 的 durationSec 不受星等影響
- **WHEN** 某 `DEFENSE_UP` 技能 `star = 3`，`effectByLevel[level-1].percent = 26`、`durationSec = 8`
- **THEN** 實際生效的 `percent = 26 × 1.2 = 31.2`，`durationSec` 仍為 8

#### Scenario: 充能時間隨星等縮短
- **WHEN** 某技能 `chargeSec = 20`（Lv/星等皆不影響此靜態值本身），`star = 3`
- **THEN** 實際生效的充能時間為 `20 × (1 - 0.05 × 2) = 18` 秒

#### Scenario: 1 星不套用任何加成
- **WHEN** 某技能 `star = 1`
- **THEN** 實際生效的效果數值與 `chargeSec` 皆等於未套用加成前的原始值

### Requirement: 技能經驗值晶片直接升級
系統 SHALL 提供 `POST /api/character/:characterId/skills/use-exp-chip`（body：`skillId`、`itemIds: string[]`），允許玩家消耗自己角色永久背包內、`templateId = 'skill_exp_chip'` 的一或多個道具實體，為指定已解鎖技能的 `exp` 增加 `SKILL_EXP_PER_CHIP(50) × 消耗顆數`，並套用既有「技能等級與 exp 曲線」的升級判定（封頂 Lv.10）。每個 `itemId` 消耗後 SHALL 從該角色永久背包移除參照，並刪除對應 `items/{itemId}` 文件。目標技能須已存在於 `unlockedSkills`；任一 `itemId` 不屬於該角色背包或 `templateId` 不符時，系統 SHALL 回傳 400 且不修改任何資料（含不消耗任何已驗證通過的其餘晶片，整批操作要嘛全部成功要嘛全部失敗）。

#### Scenario: 成功使用晶片升級
- **WHEN** 角色 `unlockedSkills.overclock = { level: 2, exp: 0, star: 1 }`，背包內有 2 個 `skill_exp_chip`，送出 `{ skillId: 'overclock', itemIds: [id1, id2] }`，`2 × 50 = 100` exp 恰好達到 Lv.3 門檻
- **THEN** 該 2 個 item 從背包與 `items` collection 移除，`unlockedSkills.overclock` 更新為 `{ level: 3, exp: 100, star: 1 }`

#### Scenario: 消耗晶片後等級封頂
- **WHEN** 角色某技能 `level = 10`，送出使用晶片請求
- **THEN** exp 持續累加但 `level` 維持 10，晶片仍被消耗（升星前的額外練級沒有意義但不阻擋操作）

#### Scenario: 目標技能尚未解鎖
- **WHEN** 玩家對尚未出現在 `unlockedSkills` 的 `skillId` 送出使用晶片請求
- **THEN** 系統回傳 400，不消耗任何晶片

#### Scenario: 部分 itemId 不屬於該角色背包
- **WHEN** 送出的 `itemIds` 中有一個不存在於該角色永久背包
- **THEN** 系統回傳 400，不修改任何資料，也不消耗其餘合法的 itemId

#### Scenario: itemId 對應的道具不是技能經驗值晶片
- **WHEN** 送出的 `itemIds` 中有一個 `templateId` 不是 `skill_exp_chip`
- **THEN** 系統回傳 400，不修改任何資料
