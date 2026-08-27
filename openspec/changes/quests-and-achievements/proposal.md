## Why

每日任務與成就是玩家取得 gems（紅寶石商店的唯一貨幣來源之一）的主要管道。目前完全沒有任務/成就的資料層與 API，玩家無法追蹤進度也無法領取獎勵。

## What Changes

- 新增每日任務：每帳號每日（UTC+0）固定 3 個，不允許 reroll，完成後需手動領取（gold 10~50、gems 0~1）
- 新增常駐成就：每帳號每成就限領一次，領取 gems 3~5
- 新增 `GET /api/quests/daily`、`POST /api/quests/claim/{questId}`
- 新增 `GET /api/achievements`、`POST /api/achievements/claim/{achievementId}`

## Capabilities

### New Capabilities
- `daily-quests`：每日任務生成、進度追蹤、領取
- `achievements`：常駐成就進度追蹤、限領一次

## Impact

- 新增 `server/constants/quests.ts`、`server/constants/achievements.ts`（任務/成就模板，靜態常數，類似 `ITEM_TEMPLATES` 的做法）
- 新增 `server/repositories/quest.repository.ts`、`server/repositories/achievement.repository.ts`（沿用既有實作慣例：每任務/每成就各一份扁平文件，`accountId+date+templateId` / `accountId+achievementId` 為邏輯複合鍵）
- 新增 `server/services/quest.service.ts`、`server/services/achievement.service.ts`
- 依賴 `character-progression` change 的 `CharacterService`（發放 gold/gems）
- 進度更新目前沒有實際觸發來源（例如「完成 1 次冒險」「擊殺 X 隻怪」需要 `adventure-run-core`/`combat-engine` change 在其結算流程呼叫 `QuestService.incrementProgress`/`AchievementService.incrementProgress`）；本 change 先提供這兩個方法與型別介面，實際呼叫點留給後續 change 串接，並在其 tasks 中明確列出
- 對應分析：FR-036~040、UC-014~017、AGG-006/AGG-007/ENT-007/ENT-008/VO-007/VO-008（domain-model.yaml）、API-016~019（api-model.yaml）、DATA-008/009（data-model.yaml）、RULE-001/010/011

## 已知設計偏差（承接自分析階段）

`openspec/analysis/data-model.yaml` 已記錄：`AGG-006 DailyQuestSet` 在領域模型中是「一組 3 個任務」的一致性邊界，但既有實作是「每任務一份扁平文件」。本 change 沿用扁平文件設計，重置時以 Firestore batch write 一次寫入 3 份文件，作為邊界不完全一致的緩解（見 `traceability.yaml` 的 medium severity gap）。
