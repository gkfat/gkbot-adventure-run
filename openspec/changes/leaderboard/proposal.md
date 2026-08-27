## Why

Spec 要求玩家能看到其他玩家的最高分紀錄，這是遊戲的社交/競爭要素。目前沒有排行榜資料層或 API。

## What Changes

- 新增 `leaderboardEntries` collection：每帳號一筆最高分紀錄
- 新增 `GET /api/leaderboard`：Top-N 排行 + 自己的名次
- 提供 `LeaderboardService.updateIfBetter(entry)`，供 `adventure-run-core` change 在 run 結算時呼叫（本 change 不含呼叫點，只提供服務介面）

## Capabilities

### New Capabilities
- `leaderboard`：全服排行榜查詢與（由結算流程呼叫的）最高分更新

## Impact

- 新增 `server/repositories/leaderboard.repository.ts`：`upsertIfHigher(entry)`（讀取現有分數，若新分數更高才寫入）、`getTopN(limit)`、`getRank(accountId)`
- 新增 `server/services/leaderboard.service.ts`
- 新增 `server/api/leaderboard/index.get.ts`
- 依賴 `character-progression` change 的暱稱設定（`FR-042` 要求顯示暱稱而非 email/accountId）
- 對應分析：FR-041~044、UC-018~019、AGG-008/ENT-009（domain-model.yaml）、API-020（api-model.yaml）、DATA-010（data-model.yaml）、RULE-012、NFR-011
