## Context

排行榜是查詢密集、寫入稀少的資料（只在 run 結算且破紀錄時寫入）。用 `accountId` 當文件 id 讓「只保留最高分」的 upsert 語意天然簡單（RULE-012）。

## Goals / Non-Goals

**Goals:**
- Top-N 查詢需要對 `score` 建立索引（Firestore 複合索引或單欄位索引皆可，因排序欄位本身就是 `score`）
- 排行榜只能由 server 寫入，任何寫入路徑都要先比較新分數與既有分數（NFR-011）

**Non-Goals:**
- 不做每日/每週排行榜（spec 明確：全服常駐、不 reset）
- 不在本 change 內建立呼叫 `updateIfBetter` 的實際觸發點（那屬於 `adventure-run-core` change 的 run 結算流程）

## Decisions

- **`upsertIfHigher` 用 Firestore transaction**：讀取現有 entry，若不存在或新分數更高才寫入，避免併發下（理論上同一角色不會併發，但仍防禦性處理）分數被較低值覆蓋。
- **`myRank` 計算方式**：用 `score > myScore` 的 count query（Firestore aggregation query `count()`）而非把整張榜單讀出來排序，避免榜單成長後查詢成本失控。

## Risks / Trade-offs

- [風險] Firestore 的 `count()` aggregation query 對非常大量文件仍有計費與延遲考量 → [可接受]：初期玩家規模小，且這是唯一在乎「精確名次」的地方，先用最直接的做法，之後量大再優化（快取/定期批次計算名次）
- [風險] `nickname` 若玩家事後修改，排行榜上顯示的是「寫入當下」還是「即時」的暱稱，需要決策 → [決策]：本 change 採「寫入當下快照」（`leaderboardEntries.nickname` 於每次 upsert 時一併更新為呼叫當下的角色暱稱），避免排行榜查詢時要額外 join `characters` collection
