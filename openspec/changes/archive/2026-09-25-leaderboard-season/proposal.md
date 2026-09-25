## Why

現行 `leaderboard` 是全服常駐、不重置的歷史最高分榜（明確排除每日/每週排行榜）。現在要改為每週結算的賽季制：每週一 00:00 重置排名，結算時依名次分級發放獎勵，且要有主頁進入口與獨立頁面可查看。這需要打破既有 `leaderboard` 的「不重置」設計，並新增前端頁面與排程結算。

## What Changes

- **BREAKING**：`leaderboardEntries` 的語意從「帳號歷史最高分（doc id = accountId）」改為「該角色本賽季最高分（doc id = `{seasonId}_{characterId}`）」；賽季邊界為 ISO 週（每週一 00:00 UTC+8 重置），`seasonId` 為純時間函式（如 `2026-W39`），不需要額外的 Season 實體/collection
- `GET /api/leaderboard` 回應新增 `seasonEndsAt`（本賽季結算時間戳），Top-N/myRank 皆只計算當前 `seasonId`
- 新增 Vercel Cron 排程端點 `GET /api/cron/leaderboard-season-settle`：每週一 00:00 觸發，對上一賽季所有有紀錄的角色，依名次分級（Top1／Top2-3／Top4-10／Top11+）計算 gold/gems 獎勵，透過 `MailboxService.send()`（`mailbox` change）逐一發信；不做任何排行榜資料刪除，舊賽季資料留存供歷史查詢
- 新增前端「排行榜」頁面（`/leaderboard`，full page）：由主頁頂部列新增的圖示按鈕進入，顯示依名次升冪排序的榜單、自己的名次、本賽季剩餘結算時間倒數，頁面最下方為 block「關閉」按鈕返回主頁
- 主頁頂部列（`GameLayoutsHeader`）新增排行榜圖示按鈕（gear 圖示左側）
- 接上排行榜的實際寫入點：`adventure-run-core` 既有的 `AdventureRunService` 在建構子寫死 `leaderboardUpdater = new NoopLeaderboardUpdater()`（介面 `LeaderboardUpdater` 早已預留，見 `shared/types/adventure.ts`），本 change 提供真正的實作並換掉這個 no-op。分數採用**該次 run 擊敗的敵人總數**（`AdventureRun` 新增 `enemiesDefeated` 累計欄位，比照 `expEarned` 的累加方式，於每場戰鬥勝利時累加），run 結束時（不論結果）以此數值呼叫 `LeaderboardService.updateIfBetter`

## Capabilities

### New Capabilities
- `leaderboard-page`：排行榜前端頁面呈現規則（進入口、排序顯示、倒數計時、關閉行為）

### Modified Capabilities
- `leaderboard`：從「帳號歷史最高分、不重置」改為「角色本賽季最高分、每週重置＋結算發獎」

## Impact

- 修改 `server/repositories/leaderboard.repository.ts`：doc id 改為 `{seasonId}_{characterId}`，`upsertIfHigher`/`getTopN`/`countHigherThan` 皆需依 `seasonId` 過濾；新增 `getAllForSeason(seasonId)`（結算用，含分級所需的全量本季資料）
- 修改 `server/services/leaderboard.service.ts`：`updateIfBetter` 的 entry 需帶入依當下時間計算出的 `seasonId`；`getLeaderboard` 回應加上 `seasonEndsAt`
- 修改 `shared/schemas/{api,firestore}/leaderboard.schema.ts`、`shared/types/leaderboard.ts`：新增 `seasonId` 欄位、API 回應新增 `seasonEndsAt`
- 新增 `server/utils/season.ts`：`getCurrentSeasonId()`、`getSeasonEndsAt()`、`getPreviousSeasonId()` 純函式（ISO 週計算）
- 新增 `server/constants/leaderboardSeason.ts`：名次分級獎勵表（Top1/Top2-3/Top4-10/Top11+ 的 gold/gems）
- 新增 `server/api/cron/leaderboard-season-settle.get.ts`，於 `server/middleware/auth.global.ts` 的 `publicPaths` 加入此路徑並改用 `CRON_SECRET` bearer token 驗證（比照 Vercel Cron 慣例）
- 新增 `vercel.json` 的 `crons` 設定（每週一 00:00 觸發）
- 新增 `app/pages/leaderboard.vue`、`app/composables/useLeaderboard.ts`
- 修改 `app/components/game/layouts/header.vue`：新增排行榜圖示按鈕
- 依賴 `mailbox` change 提供的 `MailboxService.send()`（本 change 是該介面的第一個實際呼叫方）
- 依賴既有 `character-progression` 暱稱設定（沿用 `leaderboard` baseline 的既有依賴）
- 修改 `shared/types/adventure.ts`：`AdventureRun` 新增 `enemiesDefeated`；`LeaderboardUpdater` 介面擴充 `nickname`/`runId`/`meta`（原本只有 `accountId`/`characterId`/`score`，實作時才發現缺這些欄位無法真正呼叫 `LeaderboardService.updateIfBetter`）
- 修改 `shared/schemas/firestore/adventure.schema.ts`：新增 `enemiesDefeated`
- 修改 `server/repositories/adventure-run.repository.ts`：建立 run 時初始化 `enemiesDefeated: 0`；`withStageDefaults` 對舊 run 文件 tolerate 缺欄位（比照 `expEarned` 的既有模式）
- 修改 `server/services/adventure-run.service.ts`：戰鬥勝利時累加 `enemiesDefeated`；`settleRun` 改用它當 `score` 呼叫 `leaderboardUpdater.updateIfBetter`
- 新增 `server/services/leaderboard-run-updater.ts`：實作 `LeaderboardUpdater`，包裝 `LeaderboardService.updateIfBetter`，換掉 `AdventureRunService` 建構子裡的 `NoopLeaderboardUpdater`
