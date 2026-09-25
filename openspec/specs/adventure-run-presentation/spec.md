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
系統 SHALL 在戰鬥演出中，針對 `combatLog` 的每一筆 `ATTACK`/`CRIT` 事件顯示對應目標的傷害數字飄字，針對每一筆 `DODGE` 事件顯示「閃避」文字效果；`CRIT` 事件並 SHALL 以比一般 `ATTACK` 更顯眼的圖示/樣式呈現，且字級 SHALL 大於一般 `ATTACK` 的傷害數字。傷害數字飄字的顯示時長 SHALL 為 1,500ms（一般 `ATTACK`）；`CRIT` 事件的傷害飄字（含放大樣式與爆擊字樣）顯示時長 SHALL 為 2,000ms，比一般 `ATTACK` 多 500ms；`DODGE` 的「閃避」文字顯示時長不受本次調整影響，維持原本時長。

#### Scenario: 一般攻擊顯示傷害飄字
- **WHEN** `combatLog` 播放至一筆 `action: 'ATTACK'` 事件
- **THEN** 受擊目標旁顯示對應 `damage` 數值的飄字效果，顯示時長 1,500ms

#### Scenario: 爆擊顯示更顯眼且更持久的樣式
- **WHEN** `combatLog` 播放至一筆 `action: 'CRIT'` 事件
- **THEN** 受擊目標旁顯示對應 `damage` 數值的飄字效果，字級比一般攻擊大，顯示時長為 2,000ms

#### Scenario: 閃避顯示文字效果，時長不受影響
- **WHEN** `combatLog` 播放至一筆 `action: 'DODGE'` 事件
- **THEN** 該回合的目標旁顯示「閃避」文字效果，不顯示傷害數字，顯示時長維持原本時長不變

#### Scenario: 短時間內多筆傷害事件各自完整顯示
- **WHEN** 同一次攻擊觸發 AoE 或濺射，短時間內對多個目標各自產生一筆 `ATTACK`/`CRIT` 事件
- **THEN** 每個目標各自的傷害飄字依其事件類型（一般/爆擊）套用對應的顯示時長，不因同時觸發多筆事件而縮短或提前消失

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

### Requirement: 戰鬥與事件演出觸發對話氣泡且不阻塞既有時間軸
系統 SHALL 在戰鬥演出（`combatLog` 播放至 `ATTACK`/`CRIT`/`DODGE`/`DEATH` 事件）與事件結算（`EventResult` 為 `HEAL`/`BLESSING`/`CURSE`/`WHEEL`/`CHOICE` 類型）時，觸發對應主體（玩家或敵人）的對話氣泡；對話氣泡的顯示與淡出 SHALL 為獨立關注點，不得阻塞或延遲既有的傷害飄字、閃避文字、HP/行動條更新、banner 等演出時間軸。

#### Scenario: 攻擊命中同時觸發傷害飄字與對話氣泡
- **WHEN** `combatLog` 播放至一筆 `action: 'ATTACK'` 事件，且該次觸發中選顯示對話氣泡
- **THEN** 受擊目標旁同時顯示傷害飄字與（若中選）攻守雙方各自的對話氣泡，兩者互不阻塞彼此的顯示時機

#### Scenario: 對話氣泡演出不延遲時間軸推進
- **WHEN** 對話氣泡的淡出動畫尚未播放完畢
- **THEN** 戰鬥演出時間軸依既定排程繼續播放後續 `combatLog` 批次，不因氣泡尚未消失而暫停

#### Scenario: 遭遇敵人時觸發氣泡
- **WHEN** 玩家的冒險運行進入 COMBAT/ELITE/STRONG_ELITE/BOSS 節點並顯示敵人預覽
- **THEN** 系統觸發敵人一方的 `ENCOUNTER` 對話氣泡（若該敵人身份有可用台詞）

#### Scenario: 事件結算觸發玩家對話氣泡
- **WHEN** `POST /api/adventure/event/resolve` 回傳的 `EventResult.type` 為 `HEAL` 且 `hpHealed` 有值
- **THEN** 系統觸發玩家角色的 `HEAL` 對話氣泡（若玩家身份有可用台詞）

### Requirement: Boss 節點敵我圖像尺寸差異化
系統 SHALL 在 BOSS 節點的戰鬥演出中，將 boss 本體的圖像顯示尺寸放大為一般小兵圖像顯示尺寸的 1.2 倍（或等效地將小兵圖像縮小至 boss 圖像尺寸的 1/1.2），使 boss 與小兵在畫面上可被玩家直觀區分；boss 隨從/minion 的圖像尺寸 SHALL 維持與一般小兵相同，不受此差異化影響。

#### Scenario: Boss 圖像顯示尺寸大於小兵
- **WHEN** 玩家在 BOSS 節點的戰鬥畫面中同時看到 boss 本體與（若有）隨從/小兵的圖像
- **THEN** boss 本體的圖像顯示尺寸為小兵圖像顯示尺寸的 1.2 倍

#### Scenario: 非 boss 節點的敵人圖像尺寸不受影響
- **WHEN** 玩家在一般 COMBAT/ELITE/STRONG_ELITE 節點的戰鬥畫面中看到敵人圖像
- **THEN** 敵人圖像維持既有顯示尺寸，不套用 boss 節點的尺寸差異化規則

#### Scenario: Boss 隨從圖像尺寸與小兵一致
- **WHEN** 玩家在 BOSS 節點的戰鬥畫面中看到 boss 隨從/minion 的圖像
- **THEN** 隨從/minion 圖像顯示尺寸與一般小兵相同，不因位於 boss 節點而放大或縮小
