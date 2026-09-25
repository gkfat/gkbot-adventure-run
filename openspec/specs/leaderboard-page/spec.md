# leaderboard-page Specification

## Purpose
TBD - created by archiving change leaderboard-season. Update Purpose after archive.
## Requirements
### Requirement: 主頁頂部列提供排行榜進入口
系統 SHALL 在主頁頂部列（設定齒輪圖示旁）提供排行榜圖示按鈕，點擊後導覽至排行榜頁面。

#### Scenario: 點擊排行榜圖示
- **WHEN** 玩家點擊頂部列的排行榜圖示
- **THEN** 系統導覽至排行榜頁面（`/leaderboard`）

### Requirement: 排行榜頁面依名次升冪顯示榜單與賽季倒數
排行榜頁面 SHALL 以獨立全頁（非彈窗）呈現，榜單依名次升冪（第 1 名在最上方）排序顯示，並顯示本賽季剩餘至結算的倒數時間；倒數時間 SHALL 以伺服器回傳的 `seasonEndsAt` 為準。

#### Scenario: 榜單依名次升冪排序
- **WHEN** 玩家進入排行榜頁面
- **THEN** 榜單由第 1 名開始依名次升冪往下顯示

#### Scenario: 顯示賽季倒數
- **WHEN** 排行榜頁面載入完成
- **THEN** 頁面顯示距離本賽季結算的剩餘時間，且隨時間即時遞減

#### Scenario: 顯示自己的名次
- **WHEN** 玩家的角色本賽季已有排行榜紀錄
- **THEN** 頁面另外標示玩家自己的名次與分數

### Requirement: 排行榜頁面不顯示金幣/鑽石資源列
排行榜頁面 SHALL 隱藏主頁共用的金幣/鑽石資源列（`GameLayoutsResourceBar`），因為排行榜比分數、不涉及角色資源。

#### Scenario: 進入排行榜頁面不顯示資源列
- **WHEN** 玩家進入排行榜頁面
- **THEN** 頁面頂端不顯示金幣/鑽石資源列

#### Scenario: 離開排行榜頁面恢復顯示資源列
- **WHEN** 玩家從排行榜頁面返回主頁或其他頁面
- **THEN** 資源列恢復正常顯示

### Requirement: 前三名以獎盃圖示呈現名次
排行榜列項的名次欄位，第 1～3 名 SHALL 以獎盃圖示取代數字（第 1 名金色、第 2 名銀色、第 3 名銅色），第 4 名以後維持純數字顯示。

#### Scenario: 第 1～3 名顯示對應顏色的獎盃
- **WHEN** 榜單列項的名次為 1、2 或 3
- **THEN** 該列項的名次欄位顯示對應顏色的獎盃圖示（金/銀/銅），不顯示數字

#### Scenario: 第 4 名以後維持數字
- **WHEN** 榜單列項的名次為 4 以上
- **THEN** 該列項的名次欄位維持純數字顯示
