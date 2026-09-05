# enemy-bestiary

## Purpose

追蹤角色已遇過/擊敗過的敵人 archetype，並提供圖鑑查詢 API 與圖鑑 dialog，讓玩家瀏覽已遇過的敵人清單、擊敗次數，未遇過的敵人以遮罩呈現以保留探索懸念。

## Requirements

### Requirement: 戰鬥開始時記錄角色遇過的敵人 Archetype
系統 SHALL 在 `CombatService` 為戰鬥節點生成第一波敵人時，將本次戰鬥中出現的每個敵人的 `archetypeSlug` 加入該角色 Firestore 文件的 `encounteredArchetypeSlugs` 陣列（若尚未存在於陣列中）。此記錄 SHALL NOT 依賴戰鬥結果（勝利/失敗/中途死亡皆需記錄）。

#### Scenario: 首次遭遇某 archetype
- **WHEN** 角色的 `encounteredArchetypeSlugs` 不含 `gkbot-repair`，且本次戰鬥生成的敵人中包含 `archetypeSlug` 為 `gkbot-repair` 的敵人
- **THEN** 該角色文件的 `encounteredArchetypeSlugs` 新增 `gkbot-repair`

#### Scenario: 重複遭遇已記錄過的 archetype
- **WHEN** 角色的 `encounteredArchetypeSlugs` 已包含 `gkbot-repair`，且本次戰鬥再次生成 `archetypeSlug` 為 `gkbot-repair` 的敵人
- **THEN** `encounteredArchetypeSlugs` 內容不重複新增，維持唯一值

#### Scenario: 戰鬥中途角色死亡仍計入遭遇
- **WHEN** 戰鬥開始時生成的敵人包含未遇過的 archetype，且該場戰鬥最終角色戰敗、未產生 `combatSummary`
- **THEN** 該 archetype 仍已於戰鬥開始當下寫入 `encounteredArchetypeSlugs`

### Requirement: 戰鬥結算時記錄角色擊敗各 Archetype 的累積次數
系統 SHALL 在 `CombatService` 結算一場戰鬥時，將該場戰鬥中每個被實際擊敗（`hp` 歸零）的敵人單位依其 `archetypeSlug` 累加進該角色 Firestore 文件的 `defeatedArchetypeCounts`（`Record<slug, count>`）。此記錄 SHALL NOT 依賴戰鬥最終勝負（角色戰敗前已擊殺的敵人仍計入累積次數）。同一場戰鬥中同一 archetype 被擊敗多次，SHALL 累加對應次數。

#### Scenario: 擊敗一隻敵人後累積次數 +1
- **WHEN** 角色的 `defeatedArchetypeCounts['gkbot-repair']` 目前為 `2`，且本次戰鬥擊敗 1 隻 `archetypeSlug` 為 `gkbot-repair` 的敵人
- **THEN** 該角色文件的 `defeatedArchetypeCounts['gkbot-repair']` 更新為 `3`

#### Scenario: 同場戰鬥擊敗同一 archetype 兩隻
- **WHEN** 本次戰鬥的多波次中共擊敗 2 隻 `archetypeSlug` 為 `rabble-raider` 的敵人，角色原本沒有 `rabble-raider` 的累積紀錄
- **THEN** 該角色文件的 `defeatedArchetypeCounts['rabble-raider']` 為 `2`

#### Scenario: 戰鬥中途角色死亡仍計入已擊殺的敵人
- **WHEN** 角色在戰鬥中擊敗 1 隻敵人後戰敗（`victory` 為 `false`）
- **THEN** 該隻已擊敗敵人的 `archetypeSlug` 仍計入 `defeatedArchetypeCounts`

### Requirement: 查詢圖鑑 API 依遭遇狀態決定資料揭露程度
系統 SHALL 提供 `GET /api/character/:characterId/bestiary`（角色須屬於呼叫者本人帳號），回傳 `server/constants/templates/enemies.ts` 定義的全部 archetype（`ENEMY_ARCHETYPES`、`GKBOT_BOSS_ARCHETYPES`、`HUMAN_ARCHETYPES`、`HUMAN_BOSS_ARCHETYPES`）清單，每筆包含 `slug` 與 `encountered: boolean`（依該角色 `encounteredArchetypeSlugs` 判定）。當 `encountered` 為 `true` 時，該筆額外包含 `name`/`description`/`portraitUrl`/`defeatedCount`（依該角色 `defeatedArchetypeCounts` 判定，無紀錄視為 `0`）；當 `encountered` 為 `false` 時，系統 SHALL NOT 於回應中包含該 archetype 的 `name`/`description`/`portraitUrl`/`defeatedCount`。回應清單 SHALL 將 `encountered` 為 `true` 的項目排列在 `encountered` 為 `false` 的項目之前；同一組內部仍維持 `ENEMY_ARCHETYPES`/`GKBOT_BOSS_ARCHETYPES`/`HUMAN_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES` 原始順序。

#### Scenario: 查詢已遇過的敵人
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色已遇過 `slug` 為 `gkbot-repair` 的 archetype
- **THEN** 回應中 `gkbot-repair` 該筆的 `encountered` 為 `true`，且包含其 `name`/`description`/`portraitUrl`/`defeatedCount`

#### Scenario: 已遇過但尚未擊敗過的敵人回傳擊敗次數 0
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色已遇過 `slug` 為 `gkbot-repair` 的 archetype 但從未擊敗過（例如僅在戰前預覽/戰鬥開始時看過）
- **THEN** 回應中 `gkbot-repair` 該筆的 `defeatedCount` 為 `0`

#### Scenario: 查詢尚未遇過的敵人
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色尚未遇過 `slug` 為 `human-elite-sniper` 的 archetype
- **THEN** 回應中 `human-elite-sniper` 該筆的 `encountered` 為 `false`，且不包含 `name`/`description`/`portraitUrl` 欄位（或其值為 `null`）

#### Scenario: 已遇過的敵人排列在最前面
- **WHEN** 已登入玩家查詢自己角色的圖鑑，且該角色只遇過清單中排序較後的 `slug`（例如 `human-elite-sniper`）
- **THEN** 回應清單中該筆排在所有 `encountered` 為 `false` 的項目之前

#### Scenario: 查詢他人角色的圖鑑被拒絕
- **WHEN** 已登入玩家嘗試查詢不屬於自己帳號的 `characterId` 的圖鑑
- **THEN** 系統回傳授權錯誤，不回傳任何圖鑑資料

### Requirement: Nav Drawer 提供圖鑑入口
系統 SHALL 在 `app/components/game/accountDrawer.vue`（帳號 nav drawer）新增一個「圖鑑」可點擊項目，與既有「切換角色」項目同列並排、兩者皆為 col-4 等寬；點擊「圖鑑」項目後開啟滿版（fullscreen）圖鑑 dialog，且不關閉底層的 nav drawer 操作流程之外的頁面狀態（即開啟圖鑑不需先關閉 nav drawer，或依現有 drawer 互動慣例自動收起）。

#### Scenario: 從 nav drawer 開啟圖鑑
- **WHEN** 玩家開啟 nav drawer 並點擊「圖鑑」項目
- **THEN** 系統開啟滿版圖鑑 dialog，顯示敵人清單

### Requirement: 圖鑑 Dialog 版面與互動
圖鑑 dialog SHALL 以滿版呈現，並分為上下兩區：上半部為單一大方框，顯示目前選取敵人的頭像、名稱、描述、累積擊敗次數；下半部為每列 5 個一組的敵人格狀清單，涵蓋圖鑑 API 回傳的全部 archetype，並可捲動瀏覽超出畫面的項目。點擊下半部任一敵人格子 SHALL 將該敵人設為目前選取項目，並更新上半部顯示內容。Dialog 最下方 SHALL 提供一個關閉按鈕，點擊後關閉 dialog。

#### Scenario: 切換上半部顯示內容
- **WHEN** 圖鑑 dialog 已開啟，且玩家點擊下半部格狀清單中的某個敵人頭像
- **THEN** 上半部大方框更新為顯示該敵人的頭像、名稱、描述、累積擊敗次數（`defeatedCount`）

#### Scenario: 關閉圖鑑
- **WHEN** 圖鑑 dialog 已開啟，玩家點擊最下方的關閉按鈕
- **THEN** dialog 關閉，回到開啟前的畫面

### Requirement: 未遇過的敵人以遮罩呈現
下半部格狀清單中，`encountered` 為 `false` 的敵人格子 SHALL 顯示固定的未知外形剪影佔位圖（而非該敵人的實際頭像），且不顯示其真實名稱；若該敵人被選取為上半部顯示內容，上半部亦 SHALL 顯示相同的剪影佔位圖與固定的「尚未遭遇」文案，不顯示真實名稱/描述。

#### Scenario: 未遇過敵人的格子呈現
- **WHEN** 圖鑑清單中某敵人 `encountered` 為 `false`
- **THEN** 其格子頭像顯示為外形剪影佔位圖，不顯示真實名稱

#### Scenario: 選取未遇過的敵人
- **WHEN** 玩家點擊下半部一個 `encountered` 為 `false` 的敵人格子
- **THEN** 上半部大方框顯示剪影佔位圖與「尚未遭遇」等固定文案，不顯示該敵人的真實名稱與描述
