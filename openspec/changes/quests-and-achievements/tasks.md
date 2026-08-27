## 1. 模板常數

- [ ] 1.1 新增 `server/constants/quests.ts`：每日任務模板（例：完成 1 次冒險、擊殺 X 隻怪、商店購買 1 次）與事件類型對照表
- [ ] 1.2 新增 `server/constants/achievements.ts`：成就模板（累計擊殺、最高分達到 X、累計 run 次數…）與事件類型對照表

## 2. Repository

- [ ] 2.1 新增 `server/repositories/quest.repository.ts`：`getDailyQuests(accountId, date)`、`batchCreateDailyQuests`、`claimQuest`
- [ ] 2.2 新增 `server/repositories/achievement.repository.ts`：`getAll(accountId)`、`incrementProgress`、`claimAchievement`

## 3. Service

- [ ] 3.1 新增 `server/services/quest.service.ts`：懶生成（UTC+0 判斷）、`incrementProgress(accountId, eventType, amount)`、`claim(accountId, questId)`
- [ ] 3.2 新增 `server/services/achievement.service.ts`：`incrementProgress(accountId, eventType, amount)`、`claim(accountId, achievementId)`
- [ ] 3.3 領取邏輯使用 Firestore transaction 防止併發雙重領取

## 4. API

- [ ] 4.1 新增 `server/api/quests/daily.get.ts`
- [ ] 4.2 新增 `server/api/quests/claim/[questId].post.ts`
- [ ] 4.3 新增 `server/api/achievements/index.get.ts`
- [ ] 4.4 新增 `server/api/achievements/claim/[achievementId].post.ts`

## 5. 文件與驗證

- [ ] 5.1 於 `server/utils/openapi.ts` 註冊 4 個新路徑
- [ ] 5.2 執行 `pnpm nuxt typecheck`
- [ ] 5.3 手動驗證：任務/成就查詢、達成前後領取行為、重複領取被拒
- [ ] 5.4 記錄 `incrementProgress` 的事件類型清單，供後續 `adventure-run-core`/`shop` change 串接參考
