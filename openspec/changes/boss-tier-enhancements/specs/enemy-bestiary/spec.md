## MODIFIED Requirements

### Requirement: 查詢圖鑑 API 依遭遇狀態決定資料揭露程度
系統 SHALL 提供 `GET /api/character/:characterId/bestiary`（角色須屬於呼叫者本人帳號），回傳 `server/constants/templates/enemies.ts` 定義的全部 archetype（`ENEMY_ARCHETYPES`、`GKBOT_BOSS_ARCHETYPES`、`HUMAN_ARCHETYPES`、`HUMAN_BOSS_ARCHETYPES`）清單，每筆包含 `slug` 與 `encountered: boolean`（依該角色 `encounteredArchetypeSlugs` 判定）。當 `encountered` 為 `true` 時，該筆額外包含 `name`/`description`/`portraitUrl`/`defeatedCount`（依該角色 `defeatedArchetypeCounts` 判定，無紀錄視為 `0`）/`tier`（該 archetype 的位階：來自 `ENEMY_ARCHETYPES`/`HUMAN_ARCHETYPES` 者為 `'NORMAL'`，來自 `GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES` 者為 `'BOSS'`）；當 `encountered` 為 `false` 時，系統 SHALL NOT 於回應中包含該 archetype 的 `name`/`description`/`portraitUrl`/`defeatedCount`/`tier`。回應清單 SHALL 將 `encountered` 為 `true` 的項目排列在 `encountered` 為 `false` 的項目之前；同一組內部仍維持 `ENEMY_ARCHETYPES`/`GKBOT_BOSS_ARCHETYPES`/`HUMAN_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES` 原始順序。

#### Scenario: 查詢已遇過的敵人
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色已遇過 `slug` 為 `gkbot-repair` 的 archetype
- **THEN** 回應中 `gkbot-repair` 該筆的 `encountered` 為 `true`，且包含其 `name`/`description`/`portraitUrl`/`defeatedCount`/`tier`

#### Scenario: 已遇過但尚未擊敗過的敵人回傳擊敗次數 0
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色已遇過 `slug` 為 `gkbot-repair` 的 archetype 但從未擊敗過（例如僅在戰前預覽/戰鬥開始時看過）
- **THEN** 回應中 `gkbot-repair` 該筆的 `defeatedCount` 為 `0`

#### Scenario: 已遇過的 boss archetype 回傳 BOSS 位階
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色已遇過 `slug` 屬於 `GKBOT_BOSS_ARCHETYPES` 或 `HUMAN_BOSS_ARCHETYPES` 的 archetype
- **THEN** 回應中該筆的 `tier` 為 `'BOSS'`

#### Scenario: 已遇過的一般敵人 archetype 回傳 NORMAL 位階
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色已遇過 `slug` 屬於 `ENEMY_ARCHETYPES` 或 `HUMAN_ARCHETYPES` 的 archetype
- **THEN** 回應中該筆的 `tier` 為 `'NORMAL'`

#### Scenario: 查詢尚未遇過的敵人
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色尚未遇過 `slug` 為 `human-elite-sniper` 的 archetype
- **THEN** 回應中 `human-elite-sniper` 該筆的 `encountered` 為 `false`，且不包含 `name`/`description`/`portraitUrl`/`tier` 欄位（或其值為 `null`）

#### Scenario: 已遇過的敵人排列在最前面
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色只遇過清單中排序較後的 `slug`（例如 `human-elite-sniper`）
- **THEN** 回應清單中該筆排在所有 `encountered` 為 `false` 的項目之前

#### Scenario: 查詢他人角色的圖鑑被拒絕
- **WHEN** 已登入玩家嘗試查詢不屬於自己帳號的 `characterId` 的圖鑑
- **THEN** 系統回傳授權錯誤，不回傳任何圖鑑資料

### Requirement: 圖鑑 Dialog 版面與互動
圖鑑 dialog SHALL 以滿版呈現，並分為上下兩區：上半部為單一大方框，顯示目前選取敵人的頭像、名稱、描述、累積擊敗次數、位階標籤（`tier`，例如「小兵」/「Boss」）；下半部為每列 5 個一組的敵人格狀清單，涵蓋圖鑑 API 回傳的全部 archetype，並可捲動瀏覽超出畫面的項目；已遇過的格子 SHALL 額外顯示該敵人的位階標籤。點擊下半部任一敵人格子 SHALL 將該敵人設為目前選取項目，並更新上半部顯示內容。Dialog 最下方 SHALL 提供一個關閉按鈕，點擊後關閉 dialog。

#### Scenario: 切換上半部顯示內容
- **WHEN** 圖鑑 dialog 已開啟，且玩家點擊下半部格狀清單中的某個敵人頭像
- **THEN** 上半部大方框更新為顯示該敵人的頭像、名稱、描述、累積擊敗次數（`defeatedCount`）、位階標籤（`tier`）

#### Scenario: 格狀清單顯示已遇過敵人的位階標籤
- **WHEN** 圖鑑 dialog 下半部格狀清單中某敵人 `encountered` 為 `true`
- **THEN** 該格子額外顯示其位階標籤（小兵或 Boss）

#### Scenario: 關閉圖鑑
- **WHEN** 圖鑑 dialog 已開啟，玩家點擊最下方的關閉按鈕
- **THEN** dialog 關閉，回到開啟前的畫面

### Requirement: 未遇過的敵人以遮罩呈現
下半部格狀清單中，`encountered` 為 `false` 的敵人格子 SHALL 顯示固定的未知外形剪影佔位圖（而非該敵人的實際頭像），且不顯示其真實名稱與位階標籤；若該敵人被選取為上半部顯示內容，上半部亦 SHALL 顯示相同的剪影佔位圖與固定的「尚未遭遇」文案，不顯示真實名稱/描述/位階標籤。

#### Scenario: 未遇過敵人的格子呈現
- **WHEN** 圖鑑清單中某敵人 `encountered` 為 `false`
- **THEN** 其格子頭像顯示為外形剪影佔位圖，不顯示真實名稱與位階標籤

#### Scenario: 選取未遇過的敵人
- **WHEN** 玩家點擊下半部一個 `encountered` 為 `false` 的敵人格子
- **THEN** 上半部大方框顯示剪影佔位圖與「尚未遭遇」等固定文案，不顯示該敵人的真實名稱、描述與位階標籤
