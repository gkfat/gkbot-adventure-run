## Why

系統需要一個通用管道，能在玩家離線時把獎勵非同步送達（例如每季排行榜結算獎勵），玩家下次登入時領取。目前沒有任何站內信/信箱機制，獎勵只能在玩家在場時透過既有 API 直接發放。

## What Changes

- 新增 `mailboxMessages` collection：每封信一筆文件，記錄收件人、標題、內容、附加獎勵（金幣/鑽石/道具）、已讀/已領取狀態
- 新增 `GET /api/mailbox`：查詢自己的信件列表（含已讀/已領取狀態），依建立時間新到舊排序
- 新增 `POST /api/mailbox/:mailId/claim`：領取單封信的附加獎勵，入帳角色資源後標記已領取
- 提供 `MailboxService.send(accountId, title, body, rewards)`，供其他 service（如排行榜季結算）呼叫發信，本 change 不含任何呼叫點
- 讀信（標記已讀）與領取合併為同一個操作：呼叫 claim 時一併標記已讀已領取（無獎勵的信件也可視為已讀，見 design.md 決策）

## Capabilities

### New Capabilities
- `mailbox`：站內信/信箱查詢與獎勵領取，供其他系統呼叫的伺服器端發信介面

## Impact

- 新增 `server/repositories/mailbox.repository.ts`
- 新增 `server/services/mailbox.service.ts`
- 新增 `server/api/mailbox/index.get.ts`、`server/api/mailbox/[mailId]/claim.post.ts`
- 新增 `shared/types/mailbox.ts`、`shared/schemas/firestore/mailbox.schema.ts`、`shared/schemas/api/mailbox.schema.ts`
- 領取獎勵時需要修改角色的 gold/gems（比照 `AchievementService.claim`／`QuestService.claim` 的 transaction 入帳模式）與道具入庫（比照 `InventoryRepository.addItem`），故依賴 `CharacterRepository`、`InventoryRepository`
- 預期被 `leaderboard-season`（暫定名稱，季度排行榜結算獎勵）change 呼叫，但本 change 不含該呼叫點與 UI
