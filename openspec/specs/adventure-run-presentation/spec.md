# adventure-run-presentation

## Purpose

冒險頁面與戰鬥演出的視覺呈現規則：節點背景底圖對應、角色背面圖與走路動畫、HP/行動條浮動位置、戰鬥傷害飄字/閃避文字/爆擊圖示、敵我 panel 與 avatar 顯示。

## Requirements

### Requirement: 冒險頁面背景依節點設施狀態顯示對應底圖
系統 SHALL 依當前 `severityTier`（`DEEP_WRECK`/`PARTIAL_ACTIVE`/`HIGHLY_ACTIVE`）顯示對應的設施背景底圖；若當前 `currentNodeType` 有專屬覆蓋底圖則優先顯示，否則 fallback 至該 `severityTier` 的預設底圖。

#### Scenario: 一般節點依 severityTier 顯示背景
- **WHEN** 玩家的冒險運行處於某個 `severityTier`，且當前 `currentNodeType` 沒有專屬覆蓋底圖
- **THEN** 冒險頁面顯示該 `severityTier` 對應的預設背景底圖

#### Scenario: 特定節點類型顯示專屬覆蓋背景
- **WHEN** 當前 `currentNodeType` 有對應的專屬覆蓋底圖（如 BOSS 節點）
- **THEN** 冒險頁面優先顯示該節點類型的專屬背景，忽略 `severityTier` 的預設底圖

### Requirement: HP 與行動條浮動於角色身側
系統 SHALL 將角色 HP 條與行動條顯示於角色圖像身側，不得將 HP 顯示固定於頁面頂端獨立區塊。

#### Scenario: 冒險頁面不顯示固定頂部 HP
- **WHEN** 玩家進入冒險頁面
- **THEN** 頁面頂端不存在獨立的固定 HP 顯示區塊，角色目前 HP 與行動條進度顯示於角色圖像旁

### Requirement: 點擊推進觸發走路節拍與背景移動感
系統 SHALL 在玩家點擊「推進」時，開始一段固定長度的走路節拍：角色背面圖維持既有靜態立繪（不播放走路幀序列），背景呈現位移動畫以產生移動感；節拍播放期間不得阻擋後續 API 回應到達後的狀態更新。

#### Scenario: 推進觸發走路節拍
- **WHEN** 玩家點擊「推進」且尚未有走路節拍在播放
- **THEN** 角色維持靜態背面立繪，背景同步呈現位移動畫，節拍結束後畫面切換至新節點狀態

#### Scenario: 推進 API 回應早於節拍播放完畢
- **WHEN** 玩家點擊「推進」後，`advance()` 的 API 回應在走路節拍尚未播放完畢前就已到達
- **THEN** 系統不因節拍尚未結束而阻塞或延遲新節點狀態的顯示邏輯（節拍效果與狀態更新為獨立關注點）

### Requirement: 戰鬥演出提供傷害飄字與閃避文字回饋
系統 SHALL 在戰鬥演出中，針對 `combatLog` 的每一筆 `ATTACK`/`CRIT` 事件顯示對應目標的傷害數字飄字，針對每一筆 `DODGE` 事件顯示「閃避」文字效果；`CRIT` 事件並 SHALL 以比一般 `ATTACK` 更顯眼的圖示/樣式呈現。

#### Scenario: 一般攻擊顯示傷害飄字
- **WHEN** `combatLog` 播放至一筆 `action: 'ATTACK'` 事件
- **THEN** 受擊目標旁顯示對應 `damage` 數值的飄字效果，並顯示命中圖示

#### Scenario: 爆擊顯示更顯眼的樣式
- **WHEN** `combatLog` 播放至一筆 `action: 'CRIT'` 事件
- **THEN** 受擊目標旁顯示對應 `damage` 數值的飄字效果，其樣式（顏色/大小/圖示）比一般攻擊更顯眼

#### Scenario: 閃避顯示文字效果
- **WHEN** `combatLog` 播放至一筆 `action: 'DODGE'` 事件
- **THEN** 該回合的目標旁顯示「閃避」文字效果，不顯示傷害數字

### Requirement: 敵我 panel 顯示 avatar
系統 SHALL 在戰鬥演出的我方與敵方 panel 中顯示 avatar 圖像。玩家 avatar 使用其角色既有 `spriteUrl`；敵人 avatar 依 `factionType` 與威脅等級（`isBoss` 為真時為 `boss`，否則依當前 `currentNodeType` 是否為 `ELITE`/`STRONG_ELITE` 決定為 `elite` 或 `normal`）對應至共用圖像，不要求每個敵人有專屬圖像。

#### Scenario: 玩家 panel 顯示角色 avatar
- **WHEN** 戰鬥演出畫面渲染我方 panel
- **THEN** panel 顯示該角色的 `spriteUrl` 對應圖像

#### Scenario: 一般敵人依陣營顯示共用 avatar
- **WHEN** 戰鬥演出畫面渲染敵方 panel，且該敵人 `isBoss` 為否、`currentNodeType` 為 `COMBAT`
- **THEN** panel 顯示 `factionType` 對應的 `normal` 等級共用 avatar

#### Scenario: 王者敵人顯示 boss 等級 avatar
- **WHEN** 戰鬥演出畫面渲染敵方 panel，且該敵人 `isBoss` 為真
- **THEN** panel 顯示 `factionType` 對應的 `boss` 等級共用 avatar，不論 `currentNodeType` 為何
