## Context

`shared/schemas/firestore/quest.schema.ts` 已定義 `dailyQuestSchema`/`achievementProgressSchema`，皆為扁平文件（見 proposal 的「已知設計偏差」）。任務/成就的「進度計數」需要被其他系統事件觸發（完成冒險、擊殺數、購買次數…），但這些觸發來源（`adventure-run-core`、`shop`）在時序上可能晚於或早於本 change 完成，需要設計成鬆耦合介面。

## Goals / Non-Goals

**Goals:**
- 任務/成就的 CRUD 與領取邏輯獨立完整可測試，不依賴其他 change 已經上線
- 提供清楚的「進度更新」介面契約，讓其他 change 之後串接時改動最小

**Non-Goals:**
- 不在本 change 內建立任何實際觸發進度更新的呼叫點（那些邏輯屬於觸發來源所在的 change，例如冒險結算屬於 `adventure-run-core`）
- 不解決 AGG-006 邊界與扁平文件實作的根本落差（已記錄為已知偏差，不在本 change 範圍內重新設計）

## Decisions

- **每日任務用 Firestore batch write 重置 3 份文件**：`QuestService.resetDailyQuests(accountId, date)` 一次 batch 寫入當日 3 個任務模板對應的文件，達成「同時全部出現，不會有部分任務缺漏」的效果，即使不是單一文件的原生 atomic write。
- **進度更新介面統一為 `incrementProgress(accountId, eventType, amount)`**：`QuestService`/`AchievementService` 各自維護一份「事件類型 → 影響哪些任務/成就模板」的對照表（存於 `server/constants/quests.ts`/`achievements.ts`），呼叫端（例如冒險結算）不需要知道任務/成就的內部細節，只需回報「發生了什麼事件、發生幾次」。
- **領取採樂觀鎖**：`claim` 前先讀 `claimed` 欄位，`claimed = false` 才允許領取並寫入，用 Firestore transaction 避免併發雙重領取（RULE-010/RULE-011）。

## Risks / Trade-offs

- [風險] `incrementProgress` 的事件類型清單在本 change 定義時，可能與之後 `adventure-run-core`/`shop` change 實際會發出的事件不完全對齊 → [緩解]：事件類型定義為開放的 string enum，之後 change 若需要新事件類型，只需擴充常數檔，不需改動本 change 的核心邏輯
- [風險] 每日任務 batch write 重置若與玩家同時讀取交錯，玩家可能短暫看到「只有 1-2 個任務」的過渡狀態 → [可接受]：機率極低（僅發生在 UTC+0 00:00 附近，且 batch write 是單次 Firestore 呼叫，延遲通常 <1s）
