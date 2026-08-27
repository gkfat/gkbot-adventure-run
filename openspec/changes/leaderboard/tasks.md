## 1. Repository

- [ ] 1.1 新增 `server/repositories/leaderboard.repository.ts`：`get(accountId)`、`upsertIfHigher(entry)`（transaction）、`getTopN(limit)`、`countHigherThan(score)`

## 2. Service

- [ ] 2.1 新增 `server/services/leaderboard.service.ts`：`updateIfBetter(accountId, characterId, nickname, score, runId, meta)`、`getLeaderboard(limit, requesterAccountId)`

## 3. API

- [ ] 3.1 新增 `server/api/leaderboard/index.get.ts`（`limit` query param，1..100，預設 50）

## 4. 文件與驗證

- [ ] 4.1 於 `server/utils/openapi.ts` 註冊新路徑
- [ ] 4.2 建立 Firestore 索引（`score` DESC）於 `firestore.indexes.json`
- [ ] 4.3 執行 `pnpm nuxt typecheck`
- [ ] 4.4 手動驗證：`updateIfBetter` 對更高/更低分數的行為、Top-N 排序正確性、`myRank` 計算正確性
