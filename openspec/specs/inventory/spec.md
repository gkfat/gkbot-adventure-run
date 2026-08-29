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
系統 SHALL 提供一個背包頁面：頂端呈現角色目前已裝備的 6 個槽位（有裝備顯示物品，無裝備顯示空槽位樣式），下方以格狀呈現永久背包物品，並可依「裝備 / 道具」類型篩選、依稀有度排序（預設由高到低：L → SSR → SR → R → N）。BottomNav 原本的「角色」入口 SHALL 改為「背包」，點擊後導向此頁面。

#### Scenario: 頂部裝備總覽
- **WHEN** 玩家進入背包頁
- **THEN** 頂端 6 個槽位依角色目前的 `equipment`（slot -> itemId）顯示對應物品，未裝備的槽位顯示空槽位樣式

#### Scenario: 篩選裝備
- **WHEN** 玩家在下方格狀背包選擇「裝備」篩選
- **THEN** 只顯示 `type: EQUIPMENT` 的物品

#### Scenario: 篩選道具
- **WHEN** 玩家選擇「道具」篩選
- **THEN** 只顯示 `type: POTION` 的物品

#### Scenario: 依稀有度排序
- **WHEN** 背包頁載入或篩選條件變更
- **THEN** 物品清單依稀有度由高到低排序（L → SSR → SR → R → N）
