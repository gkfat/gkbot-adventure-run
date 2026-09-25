## 1. Season 計算與常數

- [x] 1.1 新增 `server/utils/season.ts`：`getCurrentSeasonId(now?)`、`getSeasonEndsAt(now?)`、`getPreviousSeasonId(now?)`（UTC ISO 週）
- [x] 1.2 新增 `server/constants/leaderboardSeason.ts`：`LEADERBOARD_SEASON_REWARDS`（Top1/Top2-3/Top4-10/Top11+ 的 gold/gems）

## 2. Schema 與型別調整

- [x] 2.1 `shared/types/leaderboard.ts` 新增 `seasonId` 欄位
- [x] 2.2 `shared/schemas/firestore/leaderboard.schema.ts` 新增 `seasonId`
- [x] 2.3 `shared/schemas/api/leaderboard.schema.ts` 回應新增 `seasonEndsAt`

## 3. Repository / Service 調整

- [x] 3.1 `server/repositories/leaderboard.repository.ts`：doc id 改為 `{seasonId}_{characterId}`；`upsertIfHigher`/`getTopN`/`countHigherThan` 加上 `seasonId` 過濾；新增 `getAllForSeason(seasonId)`
- [x] 3.2 `server/services/leaderboard.service.ts`：`updateIfBetter` 帶入 `getCurrentSeasonId()`；`getLeaderboard` 回應加上 `seasonEndsAt`
- [x] 3.3 新增 `server/services/leaderboard-season-settlement.service.ts`：讀取上一賽季 `getAllForSeason`，依名次分級計算獎勵，逐一呼叫 `MailboxService.send()`

## 4. Cron 結算端點

- [x] 4.1 新增 `server/api/cron/leaderboard-season-settle.get.ts`：驗證 `Authorization: Bearer <CRON_SECRET>`，呼叫結算 service
- [x] 4.2 `server/middleware/auth.global.ts` 的 `publicPaths` 加入此路徑
- [x] 4.3 `nuxt.config.ts` runtimeConfig 新增 `cronSecret`（讀取 `CRON_SECRET`）
- [x] 4.4 `vercel.json` 新增 `crons` 設定（`0 0 * * 1`，每週一 00:00 觸發）

## 5. 前端頁面

- [x] 5.1 新增 `app/composables/useLeaderboard.ts`：呼叫 `GET /api/leaderboard`，暴露 entries/myRank/myEntry/seasonEndsAt 與倒數計算
- [x] 5.2 新增 `app/pages/leaderboard.vue`：full page，榜單依名次升冪顯示、標示自己名次、賽季倒數、底部 block「關閉」按鈕（`navigateTo('/main')`）
- [x] 5.3 修改 `app/components/game/layouts/header.vue`：齒輪圖示左側新增排行榜圖示按鈕，點擊 `navigateTo('/leaderboard')`

## 6. 文件與驗證

- [x] 6.1 於 `server/utils/openapi.ts` 更新 `GET /api/leaderboard` 的回應說明（含 `seasonEndsAt`）；`Leaderboard` tag 下新增 cron 結算端點說明
- [x] 6.2 `firestore.indexes.json` 新增複合索引（`seasonId` ASC + `score` DESC）（部署見 6.5）
- [x] 6.3 執行 `pnpm nuxt typecheck`（無新增錯誤；確認 `app/composables/useApi.ts` 的 TS2321 excessive-stack-depth 是既有問題，暫時移走本次新增的 3 個 route 檔案重跑仍會出現，與本次變更無關）
- [x] 6.4 單元測試：`season.test.ts`（`seasonEndsAt`/跨年 ISO 週邊界正確性）、`leaderboard.repository.test.ts`（跨賽季不沿用舊分數）、`leaderboard-season-settlement.service.test.ts`（名次分級正確性）。cron 端點的 `CRON_SECRET` 驗證沒有走單元測試（repo 目前沒有任何 `server/api/**/*.test.ts` 前例，H3 route handler 需要 Nuxt/Nitro runtime 的 auto-import 才能執行），改在 6.5 手動以 curl 驗證
- [x] 6.5 手動走過排行榜頁面（進入口圖示 → `/leaderboard` → 空榜單狀態正確顯示「本賽季目前還沒有人上榜」→ 倒數確認會即時遞減 → 「關閉」正確回到主頁）。實測時發現並修正一個真實 bug：`countHigherThan` 的 `where(seasonId==).where(score>x)` 需要與 `getTopN` 方向相反的複合索引（`score` ASC 而非 DESC），已補進 `firestore.indexes.json` 並部署兩個索引；也順手驗證 cron 端點缺少/錯誤 `CRON_SECRET` 皆正確回 401

## 7. 頁面視覺微調

- [x] 7.1 `app/layouts/game.vue`：`/leaderboard` 頁面不顯示 `GameLayoutsResourceBar`（金幣/鑽石列），比照 `isAdventurePage` 的排除方式
- [x] 7.2 `app/pages/leaderboard.vue`：移除底部「關閉」按鈕（改靠底部導覽列離開頁面）。實測確認：從 `/main` 點 trophy 圖示進入時 `selectedCharacterId` 已就緒，底部導覽列正常顯示、資源列正確隱藏

## 8. 接上真正的寫入點（分數 = 擊敗敵人數）

- [x] 8.1 `shared/types/adventure.ts`：`AdventureRun` 新增 `enemiesDefeated: number`；`LeaderboardUpdater` 介面擴充為 `{ accountId, characterId, nickname, score, runId, meta?: { step?, killCount? } }`
- [x] 8.2 `shared/schemas/firestore/adventure.schema.ts`：新增 `enemiesDefeated`
- [x] 8.3 `server/repositories/adventure-run.repository.ts`：建立 run 時初始化 `enemiesDefeated: 0`；`withStageDefaults` 對舊文件補預設值
- [x] 8.4 `server/services/adventure-run.service.ts`：戰鬥勝利 checkpoint 累加 `enemiesDefeated`；`settleRun` 改用它當 `score` 呼叫 `leaderboardUpdater.updateIfBetter`（帶入 nickname/runId/meta）
- [x] 8.5 新增 `server/services/leaderboard-run-updater.ts`：實作 `LeaderboardUpdater`，包裝 `LeaderboardService`；`AdventureRunService` 建構子換掉 `NoopLeaderboardUpdater`
- [x] 8.6 更新受影響的既有測試（`adventure-run.service.test.ts` 等如有用到 run 物件字面量或斷言 leaderboardUpdater 行為）；新增 `leaderboard-run-updater.test.ts`
- [x] 8.7 執行 `pnpm nuxt typecheck` / `pnpm lint` / `pnpm test`（無新增錯誤，428 個測試全過）
- [x] 8.8 手動驗證：用真實帳號的角色實際打一場冒險（`/api/adventure/start` → `advance`/`event/resolve` → `combat/start` 擊敗 1 隻敵人 → `abandon` 結算），確認 `GET /api/leaderboard` 與排行榜頁面都正確出現該角色（score=1, myRank=1）。過程中發現並修正兩個真實 bug：
  1. `LeaderboardService.updateIfBetter` 沒帶 `meta.step`/`meta.killCount` 時，會把 `step: undefined` 寫進 Firestore 文件——Firestore 不接受欄位值是 `undefined`，導致 `upsertIfHigher` 500。改成用展開運算子有值才加欄位
  2. `LeaderboardRepository.get()` 原本透過繼承的 `getById()`（會多塞一個 `id` 欄位），但 `leaderboardEntrySchema` 是 `.strict()`，`myEntry` 驗證時因為多出 `id` 而 500。改成直接讀 doc、不繼承 `getById`

## 9. 前三名獎盃圖示

- [ ] 9.1 用 pixel-art-studio 繪製獎盃圖示（參考使用者提供的參考圖：金色高腳獎盃、雙握把、頂端有星芒裝飾），3 個顏色變體（金/銀/銅），加入 `scripts/pixel-art/game-icons/build.py` 的 `HAND_AUTHORED_ICONS`（`trophyGold`/`trophySilver`/`trophyBronze`）與 `app/utils/pixelIcons.ts`，補進 `preloadAssets.ts`
- [ ] 9.2 `app/pages/leaderboard.vue`：名次欄位第 1-3 名改顯示對應獎盃圖示，第 4 名以後維持數字
- [ ] 9.3 typecheck / lint / test；啟動 dev server 手動確認視覺效果
