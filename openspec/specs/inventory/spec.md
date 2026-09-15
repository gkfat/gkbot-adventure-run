# inventory

## Purpose

角色的永久背包管理：容量上限、內容查詢、捨棄物品，以及背包頁面的前端呈現。永久背包以 `characterId` 為單位獨立管理（一個帳號最多 3 個角色，彼此不共用背包），只存 `itemId` 參照，完整物品資料由 `item-generation` capability 的 `items` collection 提供。

## Requirements

### Requirement: 永久背包容量上限
系統 SHALL 將每個角色的永久背包容量限制為 500 格；超過上限時拒絕新增物品。永久背包以 `characterId` 為單位獨立管理，同一帳號底下的不同角色不共用背包。

#### Scenario: 查詢背包內容
- **WHEN** 已登入玩家呼叫 `GET /api/character/{characterId}/inventory`
- **THEN** 回傳該角色永久背包的 `items` 陣列、目前數量 `count` 與上限 `maxCount = 500`

#### Scenario: 背包已滿無法新增物品
- **WHEN** 角色背包已有 500 件物品，系統嘗試新增第 501 件（例如商店購買選擇放入背包）
- **THEN** 該筆新增操作被拒絕，背包內容維持 500 件不變

### Requirement: 捨棄背包物品
系統 SHALL 提供 `DELETE /api/character/{characterId}/inventory/{itemId}`，允許玩家永久捨棄一件該角色永久背包內的物品；捨棄後不可復原。

> 注意：本需求對應 `openspec/analysis/api-model.yaml` 的 API-012，該端點在原始 spec 文件中沒有直接來源（見 traceability.yaml 的 needs-review gap），本 spec 按既有程式碼 schema 的既定行為描述。

#### Scenario: 成功捨棄物品
- **WHEN** 玩家對自己角色背包內存在的 `itemId` 呼叫 `DELETE /api/character/{characterId}/inventory/{itemId}`
- **THEN** 該物品從永久背包移除，且無法再被查詢到

#### Scenario: 捨棄不存在的物品
- **WHEN** 玩家對不屬於該角色背包的 `itemId` 呼叫刪除
- **THEN** 系統回傳 404，背包內容不變

#### Scenario: 不可捨棄目前已裝備的物品
- **WHEN** 玩家嘗試捨棄目前被裝備在某個槽位上的物品
- **THEN** 系統回傳 400，要求先卸下該裝備才能捨棄

#### Scenario: 捨棄同時刪除物品本體
- **WHEN** 捨棄成功
- **THEN** 系統除了從永久背包的參照清單移除該 `itemId`，也一併刪除獨立 `items/{itemId}` 文件本體（該物品此後不再被任何容器參照，且捨棄不可復原，故不保留孤兒文件）

### Requirement: 背包頁面呈現
系統 SHALL 提供一個角色頁面（沿用既有路由，內容不再只是背包）：由上至下依序為屬性面板（LV/職業/屬性/可分配屬性點）、戰鬥數值面板、武器熟練度面板（`weapon-proficiency` capability「角色頁面顯示武器熟練度與被動解鎖狀態」）、裝備總覽（角色目前已裝備的 6 個槽位，有裝備顯示物品、無裝備顯示空槽位樣式，並顯示目前總重量／負重上限，超過上限時以警示樣式呈現該數字），下方以格狀呈現永久背包物品，並可依「裝備 / 道具」類型篩選、依稀有度排序（預設由高到低：L → SSR → SR → R → N）。`BottomNav` 的「背包」入口 SHALL 改回「角色」，點擊後導向此頁面。角色主畫面（`/main`）SHALL NOT 再顯示屬性面板與戰鬥數值面板（見 `equipment` capability「主畫面精簡呈現」）。

> 更新：此頁面 `BottomNav` label 曾經是「角色」，後改為「背包」（見舊版 spec 記載）；本次因內容涵蓋屬性/戰鬥數值/武器熟練度，改回「角色」。

#### Scenario: 頂部裝備總覽
- **WHEN** 玩家進入角色頁
- **THEN** 頂端 6 個槽位依角色目前的 `equipment`（slot -> itemId）顯示對應物品，未裝備的槽位顯示空槽位樣式

#### Scenario: 裝備總覽顯示負重狀態
- **WHEN** 玩家進入角色頁，角色目前已裝備道具的 `weight` 總和為 12，`stats.carryCapacity` 為 14
- **THEN** 裝備總覽旁顯示「12 / 14」，未超過上限時不使用警示樣式

#### Scenario: 超重時裝備總覽以警示樣式呈現
- **WHEN** 角色目前已裝備道具的 `weight` 總和超過 `stats.carryCapacity`
- **THEN** 裝備總覽旁的重量數字改用警示色樣式呈現

#### Scenario: 篩選裝備
- **WHEN** 玩家在下方格狀背包選擇「裝備」篩選
- **THEN** 只顯示 `type: EQUIPMENT` 的物品

#### Scenario: 篩選道具
- **WHEN** 玩家選擇「道具」篩選
- **THEN** 只顯示 `type: POTION` 的物品

#### Scenario: 依稀有度排序
- **WHEN** 角色頁載入或篩選條件變更
- **THEN** 物品清單依稀有度由高到低排序（L → SSR → SR → R → N）

#### Scenario: 主畫面不重複顯示屬性/戰鬥數值
- **WHEN** 玩家進入角色主畫面（`/main`）
- **THEN** 畫面不顯示屬性面板與戰鬥數值面板，這兩者只存在於角色頁

### Requirement: 物品詳情顯示重量與武器類型
系統 SHALL 在物品詳情 dialog 中，對每一件 `type: EQUIPMENT` 的物品顯示其 `weight` 數值；對帶有 `weaponType` 的武器類物品，額外顯示武器類型（`FIST`/`BLADE`/`BLUNT`/`POLEARM`/`RANGED`）的圖示或文字標籤。

#### Scenario: 顯示裝備重量
- **WHEN** 玩家開啟任一 `EQUIPMENT` 物品的詳情 dialog
- **THEN** dialog 中顯示該物品的 `weight` 數值

#### Scenario: 武器額外顯示武器類型
- **WHEN** 玩家開啟一件帶 `weaponType = BLADE` 的武器詳情 dialog
- **THEN** dialog 中額外顯示「BLADE」對應的類型標籤，非武器道具（`POTION` 或無 `weaponType` 的防具）不顯示此標籤
