# character-talents

## Purpose

定義每個可選職業的天賦樹（`TalentTree`）靜態資料、天賦點的發放與投點規則，以及天賦效果併入角色 stats 計算的方式，作為職業差異化機制的正式落地方案。

## Requirements

### Requirement: 每個可選職業定義一棵天賦樹
系統 SHALL 為 5 個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）各定義恰好一棵靜態 `TalentTree`：5 層（Tier 1~5），第 1/3/5 層各 1 個節點，第 2/4 層各 2 個節點（`branchGroup` 相同、彼此互斥），每個節點 `maxRank` 皆為 3，附帶一組以固定數值套用於 stats 的 `TalentEffect`（`stat` + 每級增量 `perRank`）。

#### Scenario: 查表取得職業天賦樹
- **WHEN** 任一消費端（stats 計算、前端天賦樹頁面）需要某職業的天賦樹定義
- **THEN** 可用 `archetypeId` 查得唯一一棵 `TalentTree`，包含 7 個節點與各自的 `tier`/`branchGroup`/`maxRank`/`effect`

### Requirement: 投入天賦點到節點
系統 SHALL 提供 `POST /api/character/:characterId/talents`，允許玩家對指定角色（須屬於自己帳號）的天賦樹上某一節點投入 1 點（`talents[nodeId] += 1`），並扣除 1 點 `talentPoints`。投點須通過以下驗證，任一驗證失敗時系統 SHALL 回傳 400 且不修改任何資料：
- 目標節點須存在於該角色 `archetypeId` 對應的 `TalentTree`。
- 該角色 `talentPoints` 須 >= 1。
- 目標節點目前 rank（未投點視為 0）須小於其 `maxRank`（3）。
- 若目標節點 `tier` 大於 1，該樹中 `tier` 為目標節點 `tier - 1` 的節點裡，須至少有一個 rank 已達其 `maxRank`；`tier` 為 1 的節點視為永遠已開放。
- 若目標節點具備 `branchGroup`，同一 `tier` 且同一 `branchGroup` 的其他節點 rank 須為 0（尚未投入另一分支）。

#### Scenario: 成功投點（Tier 1 永遠開放）
- **WHEN** 角色 `talentPoints >= 1`，對其職業天賦樹的 Tier 1 節點送出投點請求
- **THEN** 該節點 rank +1，`talentPoints` -1

#### Scenario: 天賦點不足
- **WHEN** 角色 `talentPoints = 0`，對任一節點送出投點請求
- **THEN** 系統回傳 400，不修改 `talents`/`talentPoints`

#### Scenario: 節點已點滿
- **WHEN** 目標節點 rank 已等於其 `maxRank`（3），送出投點請求
- **THEN** 系統回傳 400，不修改 `talents`/`talentPoints`

#### Scenario: 上一層尚未點滿，無法投入下一層
- **WHEN** 目標節點 `tier = 2`，其 `tier = 1` 的節點 rank 尚未達 `maxRank`
- **THEN** 系統回傳 400，不修改 `talents`/`talentPoints`

#### Scenario: 岔路互斥——已投入對向分支則鎖定
- **WHEN** 同一 `tier` 且同一 `branchGroup` 的另一節點 rank > 0，對目標節點送出投點請求
- **THEN** 系統回傳 400，不修改 `talents`/`talentPoints`

#### Scenario: 岔路擇一後仍可繼續投滿該分支
- **WHEN** 某節點已投入 rank = 1 且其對向分支 rank 仍為 0，再次對同一節點送出投點請求
- **THEN** 該節點 rank +1，不受岔路互斥規則阻擋（互斥規則只鎖定對向分支，不鎖定自己已選的分支）

#### Scenario: 對不屬於自己的角色投點
- **WHEN** 已登入玩家對不屬於自己帳號的 `characterId` 呼叫此端點
- **THEN** 系統回傳 404，且不修改任何資料

### Requirement: 天賦效果併入角色 stats 計算
系統 SHALL 將角色已投入的天賦節點效果（`talents` 中 rank > 0 的節點，依 rank 乘上各自 `TalentEffect.perRank` 加總）套用於 `GET /api/character/:characterId` 回傳的 stats，套用順序在裝備加成（`equipmentBonus`）之後；回傳的 `talentBonus` 只列出非零項，且僅計入永久成長類 `stat`（`ATK`/`DEF`/`HP_MAX`/`actionIntervalSec`/`critChance`/`dodgeChance`/`carryCapacity`）。`carryCapacity` 的計算 SHALL 為 `attributes.STR + attributes.CON + talentBonus.carryCapacity`（若有）。

#### Scenario: 天賦加成反映在 stats
- **WHEN** 角色的天賦樹上某節點（`effect.stat = 'DEF'`, `perRank = 2`）投入 rank = 2
- **THEN** 該角色回傳的 `stats.DEF` 較未投入該節點時多 4，且 `talentBonus.DEF = 4`

#### Scenario: 未投入任何天賦不影響 stats
- **WHEN** 角色的 `talents` 為空
- **THEN** 回傳的 stats 與未套用天賦邏輯前完全一致，`talentBonus` 為空物件

#### Scenario: 天賦對負重的加成疊加在 attributes 之上
- **WHEN** 角色 `attributes.STR + attributes.CON = 5`，且已投入的天賦節點合計提供 `carryCapacity` +3
- **THEN** 回傳的 `stats.carryCapacity = 8`

### Requirement: 不支援天賦重置
系統 SHALL NOT 提供任何將已投入的天賦節點 rank 歸零或轉移點數的端點；一旦某岔路節點被投入至少 1 點，其對向分支節點永久維持 rank 0（見「投入天賦點到節點」的岔路互斥規則），不可逆轉。

#### Scenario: 無重置端點
- **WHEN** 玩家嘗試尋找任何可將 `talents` 中某節點 rank 歸零、或把已花費的 `talentPoints` 收回的 API
- **THEN** 系統不提供此類端點
