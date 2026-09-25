# leaderboard Specification

## Purpose
TBD - created by archiving change leaderboard. Update Purpose after archive.
## Requirements
### Requirement: 排行榜僅保留本賽季最高分且僅由伺服器寫入
系統 SHALL 只在 server 端（run 結算流程）比較並更新每個角色**本賽季**的最高分，不接受任何 client 直接提交的分數值；每個角色在排行榜上每個賽季僅保留一筆（其本賽季最高分）。賽季邊界為 UTC ISO 週（週一 00:00 重置），賽季切換時視為該角色在新賽季沒有既有紀錄，不沿用前一賽季的分數。

#### Scenario: 新分數超過本賽季既有最高
- **WHEN** 角色本次 run 分數高於同一 `seasonId` 下既有的排行榜紀錄
- **THEN** 該角色本賽季的 leaderboardEntry 更新為新分數、新 runId、新 achievedAt

#### Scenario: 新分數未超過本賽季既有最高
- **WHEN** 角色本次 run 分數低於或等於同一 `seasonId` 下既有的排行榜紀錄
- **THEN** leaderboardEntry 維持不變

#### Scenario: 新賽季第一筆紀錄
- **WHEN** 角色在新賽季（新的 `seasonId`）首次完成 run
- **THEN** 無論該角色上一賽季的分數多高，本賽季一律視為沒有既有紀錄，直接以本次分數建立新賽季的 leaderboardEntry

### Requirement: 查詢排行榜與自己的名次
系統 SHALL 提供 `GET /api/leaderboard`，回傳依分數排序的**本賽季** Top-N（預設 50，上限 100）、玩家自己的名次，以及本賽季結算時間戳 `seasonEndsAt`；顯示名稱 SHALL 使用玩家自訂暱稱，不得使用 email 或 accountId。

#### Scenario: 查詢 Top-N
- **WHEN** 玩家呼叫 `GET /api/leaderboard?limit=10`
- **THEN** 回傳本賽季依 score 由高到低排序的前 10 筆，每筆包含 nickname 與 score

#### Scenario: 查詢自己的名次
- **WHEN** 玩家的角色已有本賽季排行榜紀錄
- **THEN** 回應包含 `myRank`、`myEntry` 與 `seasonEndsAt`

#### Scenario: 尚無紀錄
- **WHEN** 玩家的角色本賽季從未完成過任何 run
- **THEN** `myRank`/`myEntry` 為空（無紀錄），但 Top-N 清單與 `seasonEndsAt` 仍正常回傳

### Requirement: run 結束時以擊敗敵人數更新排行榜
系統 SHALL 於每次 adventure run 結束時（不論結束原因為 `COMPLETED`、`DEAD` 或 `DISCONNECT`），以該次 run 累計擊敗的敵人總數作為分數，呼叫排行榜更新（`LeaderboardService.updateIfBetter` 的比大小/是否更新邏輯不變，見上一條 Requirement）。

#### Scenario: 通關結束更新排行榜
- **WHEN** 一次 run 以 `COMPLETED` 結束
- **THEN** 系統以該次 run 累計擊敗的敵人總數為分數，嘗試更新該角色本賽季的排行榜紀錄

#### Scenario: 死亡或斷線結束仍更新排行榜
- **WHEN** 一次 run 以 `DEAD` 或 `DISCONNECT` 結束
- **THEN** 系統仍以該次 run（結束前）累計擊敗的敵人總數為分數，嘗試更新該角色本賽季的排行榜紀錄

### Requirement: 賽季結算發放分級獎勵
系統 SHALL 於每週一 00:00（UTC）由排程觸發，對剛結束賽季的所有排行榜紀錄依名次分級計算 gold/gems 獎勵，透過信箱系統逐一發送給對應角色；結算端點僅接受帶有效 `CRON_SECRET` 的排程請求，拒絕其他任何來源的呼叫。

#### Scenario: 排程觸發結算
- **WHEN** 排程於賽季結束時間點以有效 `CRON_SECRET` 呼叫結算端點
- **THEN** 系統讀取剛結束賽季的全部排行榜紀錄，依名次分級（Top1／Top2-3／Top4-10／Top11+）計算獎勵，並對每個有紀錄的角色各發送一封含獎勵的信

#### Scenario: 無效或缺少 CRON_SECRET 的呼叫
- **WHEN** 呼叫結算端點的請求未帶有效 `CRON_SECRET`
- **THEN** 系統 SHALL 拒絕請求（401），且不執行任何結算或發信

#### Scenario: 該賽季無任何紀錄
- **WHEN** 剛結束的賽季沒有任何角色留下排行榜紀錄
- **THEN** 系統不發送任何信件，結算視為正常完成
