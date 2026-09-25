# leaderboard Specification

## Purpose
TBD - created by archiving change leaderboard. Update Purpose after archive.
## Requirements
### Requirement: 排行榜僅保留歷史最高分且僅由伺服器寫入
系統 SHALL 只在 server 端（run 結算流程）比較並更新每個帳號的歷史最高分，不接受任何 client 直接提交的分數值；每個帳號在排行榜上僅保留一筆（其最高分）。

#### Scenario: 新分數超過歷史最高
- **WHEN** 角色本次 run 分數高於既有排行榜紀錄
- **THEN** 該帳號的 leaderboardEntry 更新為新分數、新 runId、新 achievedAt

#### Scenario: 新分數未超過歷史最高
- **WHEN** 角色本次 run 分數低於或等於既有排行榜紀錄
- **THEN** leaderboardEntry 維持不變

### Requirement: 查詢排行榜與自己的名次
系統 SHALL 提供 `GET /api/leaderboard`，回傳依分數排序的 Top-N（預設 50，上限 100）與玩家自己的名次；顯示名稱 SHALL 使用玩家自訂暱稱，不得使用 email 或 accountId。

#### Scenario: 查詢 Top-N
- **WHEN** 玩家呼叫 `GET /api/leaderboard?limit=10`
- **THEN** 回傳依 score 由高到低排序的前 10 筆，每筆包含 nickname 與 score

#### Scenario: 查詢自己的名次
- **WHEN** 玩家已有排行榜紀錄
- **THEN** 回應包含 `myRank` 與 `myEntry`

#### Scenario: 尚無紀錄
- **WHEN** 玩家從未完成過任何 run
- **THEN** `myRank`/`myEntry` 為空（無紀錄），但 Top-N 清單仍正常回傳

