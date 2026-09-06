## Why

每日任務、常駐任務與成就是玩家取得 gold/gems（紅寶石商店的貨幣來源之一）的主要管道。目前完全沒有任務/成就的資料層與 API，玩家無法追蹤進度也無法領取獎勵。三者皆為「每角色」獨立進度——比照 shop/inventory/talents 等既有玩法系統的角色範疇慣例（`character.value.characterId` → `/api/character/{characterId}/...`），而非帳號範疇。

## What Changes

- 新增每日任務（`daily-quests`）：每角色每日（UTC+0）固定 3 個，不允許 reroll，完成後需手動領取（gold 10~50，不發放 gems）。內容為遊戲進度取向（完成冒險、擊殺數、購買次數…）
- 新增常駐任務（`persistent-quests`）：不重置，該角色終身限領一次。內容同為遊戲進度取向但門檻更高、多階梯（COMPLETE_RUN/KILL_ENEMIES/PURCHASE_SHOP/EARN_GOLD 各 5 個門檻，共 20 個），獎勵以 gold 為主，gems 僅高門檻項目少量發放（0~2）
- 新增成就（`achievements`）：不重置，該角色終身限領一次。內容為里程碑取向（累積擊殺、破紀錄分數…），獎勵僅 gems 3~5
- 新增前端入口：
  - BottomNav 最右側新增「任務」，取代原本尚未串接功能的「排行」按鈕；任務頁內有「每日任務／常駐任務」兩個 tab
  - AccountDrawer 新增「成就」入口（比照現有「切換角色／圖鑑」方形按鈕列）
- 新增 API（皆為角色範疇）：
  - `GET /api/character/{characterId}/quests/daily`、`POST .../quests/daily/claim/{questId}`
  - `GET /api/character/{characterId}/quests/persistent`、`POST .../quests/persistent/claim/{questId}`
  - `GET /api/character/{characterId}/achievements`、`POST .../achievements/claim/{achievementId}`

**BREAKING**：分析階段（`openspec/analysis/api-model.yaml` API-016~019）定義的帳號範疇路由 `GET/POST /api/quests/...`、`/api/achievements/...`（無 `characterId`）已作廢，改為角色範疇路由。原因：`multi-character-roster` change（2026-08-28 上線）已將帳號改為可擁有最多 3 個角色，打破了分析階段「一帳號一角色」的假設（見 `openspec/analysis/data-model.yaml` REL-001，該假設現已過期）；領取任務/成就獎勵需要明確的 gold/gems 發放對象（`Character` 文件），角色範疇路由與其餘玩法系統一致，也不需要額外的 characterId 參數傳遞問題。

## Capabilities

### New Capabilities
- `daily-quests`：每角色每日任務生成、進度追蹤、領取
- `persistent-quests`：每角色常駐任務進度追蹤、限領一次
- `achievements`：每角色常駐成就進度追蹤、限領一次

## Impact

- 新增 `server/constants/quests.ts`：每日任務模板與事件類型對照表
- 新增 `server/constants/persistent-quests.ts`：常駐任務模板與事件類型對照表
- 新增 `server/constants/achievements.ts`：成就模板與事件類型對照表
- 新增 `server/repositories/quest.repository.ts`（每日+常駐共用或分離，見 design.md）、`server/repositories/achievement.repository.ts`——皆以 `characterId` 為範疇鍵（每日任務另加 `date`）
- 新增 `server/services/quest.service.ts`、`server/services/achievement.service.ts`
- 新增前端：`bottomNav.vue`（新增任務入口、移除/保留排行按鈕邏輯）、`accountDrawer.vue`（新增成就入口）、任務頁（`/quests`，含 tab）、成就頁或 dialog
- 依賴 `character-progression` 的 `CharacterService`/`CharacterRepository`（發放 gold/gems、驗證角色歸屬 `getByIdForAccount`）
- 進度更新已接上 `adventure-run-core` 預留的 `ProgressTracker` 呼叫點（`ADVENTURE_COMPLETED`、`ENEMY_KILLED`，見 `server/services/progress-tracker.service.ts`）；`shop` 的購買事件（`PURCHASE_SHOP`）與其餘事件類型仍無來源，留給對應 change 串接
- 對應分析：FR-036~040、UC-014~017、AGG-006/AGG-007/ENT-007/ENT-008/VO-007/VO-008、RULE-001/010/011（`persistent-quests` 為本次新增範圍，分析階段尚無對應 FR/UC，需要之後補 `system-analysis` 或直接於 spec 中標注「待補分析追溯」）

## 已知設計偏差（承接自分析階段）

`openspec/analysis/data-model.yaml` 已記錄：`AGG-006 DailyQuestSet` 在領域模型中是「一組 3 個任務」的一致性邊界，但既有實作是「每任務一份扁平文件」。本 change 沿用扁平文件設計，重置時以 Firestore batch write 一次寫入 3 份文件，作為邊界不完全一致的緩解。

另：本 change 的分析文件於帳號範疇路由定案（見上方 BREAKING 說明），為新發現的設計偏差，`openspec/analysis/traceability.yaml`／`api-model.yaml` 尚未反映此變更，屬已知落差。
