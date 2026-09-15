## ADDED Requirements

### Requirement: 主畫面精簡呈現，不顯示屬性與戰鬥數值面板
系統 SHALL 讓角色主畫面（`/main`）只保留：角色等級/職業/暱稱/戰力標示、裝備欄位（角色圖像左右各 3 格，見「主畫面裝備欄位呈現」）、角色圖像、章節進度與開始冒險 CTA；屬性面板與戰鬥數值面板 SHALL NOT 顯示於主畫面，改為顯示於角色頁（`inventory` capability「背包頁面呈現」）。

#### Scenario: 主畫面不顯示屬性面板
- **WHEN** 玩家進入角色主畫面
- **THEN** 畫面中不存在屬性（STR/AGI/CON/LUCK）與可分配屬性點的互動區塊

#### Scenario: 主畫面不顯示戰鬥數值面板
- **WHEN** 玩家進入角色主畫面
- **THEN** 畫面中不存在 ATK/DEF/HP_MAX/actionIntervalSec/critChance/dodgeChance 等戰鬥數值的顯示區塊

#### Scenario: 裝備欄位維持顯示於主畫面
- **WHEN** 玩家進入角色主畫面
- **THEN** 角色圖像左右兩側仍各以 3 個小格子呈現裝備槽位，行為與「主畫面裝備欄位呈現」既有需求一致，不受本次精簡影響
