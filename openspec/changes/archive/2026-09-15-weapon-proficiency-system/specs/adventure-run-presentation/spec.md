## MODIFIED Requirements

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
