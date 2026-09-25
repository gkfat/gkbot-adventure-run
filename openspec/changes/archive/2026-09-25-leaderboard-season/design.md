## Context

既有 `leaderboard`（見 `openspec/specs/leaderboard/spec.md`）是「帳號層級、歷史最高分、doc id = accountId、永不重置」。現在要改成「角色層級、本賽季最高分、每週一重置」。每日任務重置（`quest.service.ts` 的 `new Date().toISOString().slice(0, 10)`）沿用 UTC 日期邊界、不做時區轉換，本 change 的週邊界比照同一慣例，用 UTC 時間切 ISO 週，避免額外引入時區處理的複雜度與不一致。

`mailbox` change（見該 change 的 proposal/design）提供 `MailboxService.send(characterId, title, body, rewards)`，本 change 是它的第一個實際呼叫方，發生在賽季結算 cron。

## Goals / Non-Goals

**Goals:**
- `seasonId` 是純時間函式（不落地儲存 Season 實體），任何時間點呼叫都能算出「現在是第幾賽季」與「這一季何時結束」
- 排行榜寫入路徑（`updateIfBetter`）用 doc id 隔開不同賽季的資料，同一角色跨賽季各自獨立，不互相覆蓋
- 結算 cron 是純伺服器排程觸發，不需要玩家在場，且具備防止外部直接打端點的驗證
- 前端頁面顯示賽季倒數時間，且倒數的計算基準與後端 `seasonEndsAt` 一致（前端不得自行用不同規則計算週邊界）

**Non-Goals:**
- 不做「上一賽季名次徽章/稱號」等賽季外的衍生獎勵展示（只發 gold/gems 到信箱）
- 不做賽季資料自動封存/刪除（舊賽季 `leaderboardEntries` 文件保留，可能之後有「歷史賽季」查詢需求時再處理）
- 不支援管理員手動指定 `seasonId` 或補發特定賽季獎勵（cron 只結算「剛結束的那一週」，若排程漏跑，之後另行手動處理，本 change 不含補跑工具）
- 不做 Vercel Cron 以外的排程機制（不考慮外部 cron 服務或 queue）

## Decisions

- **`seasonId` 格式與計算**：`server/utils/season.ts` 提供 `getCurrentSeasonId(now = new Date())`，回傳 ISO 週字串如 `2026-W39`（ISO 8601 週數，週一為一週起點）；`getSeasonEndsAt(now)` 回傳下一個週一 00:00 UTC 的 timestamp；`getPreviousSeasonId(now)` 回傳 `now` 所在週的前一週 seasonId，供 cron 結算「剛結束的賽季」使用。三者皆為純函式，用 UTC 計算，不依賴任何外部狀態。
- **doc id 改為 `{seasonId}_{characterId}`**：比照 `dailySupply.repository.ts`/`quest.repository.ts` 既有的複合 doc id 慣例。`LeaderboardEntry` 新增 `seasonId` 欄位。`upsertIfHigher` 的比較邏輯不變（同一 doc 比大小），但因為 doc id 含 seasonId，新賽季的第一筆寫入必然是「不存在則直接寫入」，天然達成重置效果，不需要額外的清除步驟。
- **查詢一律加上 `seasonId` 過濾**：`getTopN`/`countHigherThan` 都改為先 `.where('seasonId', '==', currentSeasonId)` 再排序/計數；實測發現 Firestore 對「`seasonId` 相等 + `score` 用 `orderBy` 排序」與「`seasonId` 相等 + `score` 用 `>` 範圍過濾」需要**兩個方向不同的複合索引**（`score` DESC 給 `getTopN`/`getAllForSeason` 用，`score` ASC 給 `countHigherThan` 用），故 `firestore.indexes.json` 有兩筆 `leaderboardEntries` 索引，僅 `order` 不同。
- **結算資料來源用專用查詢，不重用 `getTopN`**：新增 `getAllForSeason(seasonId)`，`.where('seasonId', '==', seasonId).orderBy('score', 'desc').get()`（不加 limit，取全量），因為名次分級（Top11+）需要涵蓋所有上榜角色，不能被 Top-N 的顯示上限（100）截斷。
- **Cron 端點驗證用 `CRON_SECRET`，不用 Firebase Auth**：Vercel Cron 觸發時會自動帶 `Authorization: Bearer $CRON_SECRET`（讀取自同名環境變數）。端點加入 `auth.global.ts` 的 `publicPaths`（跳過 Firebase 驗證），改在端點內自行比對 header 是否等於 `runtimeConfig.cronSecret`，不符則回 401。本地開發若未設定 `CRON_SECRET`，端點直接拒絕所有請求（避免預設開洞）。
- **名次分級寫死在常數檔**：`server/constants/leaderboardSeason.ts` 定義 `LEADERBOARD_SEASON_REWARDS`：Top1（500 gold / 20 gems）、Top2-3（300 gold / 12 gems）、Top4-10（150 gold / 6 gems）、Top11+（50 gold / 2 gems，涵蓋所有本季有紀錄但未進前 10 的角色）。之後要調整數值只需改常數，不動邏輯。
- **前端倒數以後端 `seasonEndsAt` 為準**：`GET /api/leaderboard` 回應帶 `seasonEndsAt`（epoch ms），前端用 `setInterval` 純粹做「目前時間到 `seasonEndsAt` 的差值」倒數顯示，不在前端重新計算週邊界規則，避免前後端時區/演算法各算各的造成倒數不準。
- **`GET /api/leaderboard` 新增可選的 `characterId` query param，取代原本以 `accountId` 查 myEntry**：既然排行榜條目已經是「每季 + 角色」層級（doc id 含 characterId），「我的名次」天然是角色層級的概念，不是帳號層級——一個帳號最多可有 3 個角色，各自有獨立的本季分數。比照 `mailbox`/`quests`/`achievements` 既有的角色層級 API 慣例，由前端帶入目前選定角色的 `characterId`；省略時僅回傳 Top-N + `seasonEndsAt`，不含 `myRank`/`myEntry`（不報錯，維持這條路徑仍可用於純榜單展示）。
- **接上真正的寫入點，分數採用「該次 run 擊敗的敵人總數」**：`AdventureRunService` 早就對 `LeaderboardUpdater` 介面 + `NoopLeaderboardUpdater` 做好「介面 + stub」的準備（`server/services/adventure-run-stubs.ts`），呼叫點在 `settleRun`（run 結束時，不論 `endReason` 為何都會呼叫，跟 `expEarned` 一樣的既有行為）。原本 stub 呼叫點暫時餵 `expEarned`（程式碼註解標明是「ASSUMPTION...until the leaderboard capability is redesigned」的暫定值），現在正式改成擊敗敵人數：
  - `AdventureRun` 新增 `enemiesDefeated: number`，在 `resolveCombat` 戰鬥勝利的 checkpoint 裡累加 `resolution.enemies.length`（跟 `expEarned`/`goldEarned` 同一個 checkpoint、同樣的累加寫法），戰敗/中離則維持累加到那之前的數值不變（跟 `expEarned` 目前的行為一致）
  - `LeaderboardUpdater` 介面原本只有 `{ accountId, characterId, score }` 三個欄位，不夠呼叫 `LeaderboardService.updateIfBetter`（還需要 `nickname`、`runId`）——擴充為 `{ accountId, characterId, nickname, score, runId, meta?: { step?, killCount? } }`，`meta.killCount` 與 `score` 填同一個值（`score` 是排行榜排序用的數字、`killCount` 是既有的「anti-cheat 附加資訊」欄位，語意不同但這裡剛好同值）
  - 新增 `server/services/leaderboard-run-updater.ts` 實作該介面、包裝 `LeaderboardService`，在 `AdventureRunService` 建構子換掉 `NoopLeaderboardUpdater`

## Risks / Trade-offs

- [風險] Cron 若因故沒觸發（Vercel 排程失敗、部署中斷等），該賽季結算獎勵就不會發送，且下一輪 cron 只結算「上一週」，會直接跳過遺漏的那一季 → [可接受]：本 change 不做自動補跑（Non-Goal），先靠監控/人工發現後續再處理，玩家規模小、影響有限
- [風險] `getAllForSeason` 對單一賽季全量讀取，賽季末玩家數變多時讀取量會變大 → [可接受]：每週僅執行一次，且目前玩家規模小，先用最直接的做法（同 `leaderboard` baseline design.md 對量大再優化的既有立場一致）
- [風險] doc id 改變是破壞性變更，若正式環境已有舊格式（doc id = accountId）的 `leaderboardEntries` 資料，這批資料會變成孤兒（新查詢邏輯過濾不到，因為沒有 `seasonId`） → [緩解]：目前 `leaderboard` change 尚未上線（本次對話內才剛實作完成、未部署），沒有正式環境舊資料需要遷移，故不需要 migration 腳本
