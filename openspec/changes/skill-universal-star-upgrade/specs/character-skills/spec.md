## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: 消耗碎片主動強化技能
**Reason**：技能碎片改為專用於「升星」（見「技能星等」需求），Lv.1~10 的養成改由新增的「技能經驗值晶片」負責（見「技能經驗值晶片直接升級」需求），碎片不再能直接轉換為技能 exp，避免碎片同時身兼兩種用途導致資源規劃混亂。
**Migration**：既有呼叫 `POST /api/character/:characterId/skills/strengthen` 的前端程式碼一併移除；玩家原本持有的碎片不做轉換，直接沿用既有 `skillFragments` 數量繼續累積、改用於升星。
