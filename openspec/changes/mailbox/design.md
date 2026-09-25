## Context

遊戲的金幣/鑽石/道具都是**角色**（`characterId`）層級的資源（`Character.gold`/`gems`、`Inventory` 皆以 characterId 為鍵），一個帳號可有多名角色（roster）。因此信箱收件人是 `characterId`，而非 `accountId`——比照 `achievements`/`quests` 既有的 `/api/character/{characterId}/...` 路由與 `CharacterRepository.getByIdForAccount` 擁有權驗證模式（見 `server/api/character/[characterId]/achievements/claim/[achievementId].post.ts`）。

首個呼叫方是排行榜季結算（`leaderboard-season` change，尚未提出）：結算時對該季 `leaderboardEntries.characterId` 逐一發信。本 change 只做信箱本體，不含任何發信呼叫點。

## Goals / Non-Goals

**Goals:**
- 提供 `MailboxService.send()` 給其他 service 呼叫，一次寫入一封信
- 玩家可查詢自己角色的信件列表（含已讀/已領取狀態），並逐封領取獎勵
- 領獎與角色資源入帳（gold/gems/道具）在同一個 Firestore transaction 內完成，避免獎勵重複入帳或信件狀態與實際入帳不同步

**Non-Goals:**
- 不做批次「一鍵全領」（v1 僅逐封領取，未來如有需求再加）
- 不做信件永久保存或封存 UI，也不做信件過期自動刪除（先不設 TTL，留待之後量大再優化）
- 不支援玩家對玩家寄信，僅伺服器內部呼叫發信
- 不在本 change 內處理任何實際發信呼叫點（排行榜季結算等），那些屬於呼叫方 change 的範圍

## Decisions

- **收件人欄位用 `characterId`（非 `accountId`）**：獎勵（gold/gems/道具）本就是角色層級資源，用 characterId 收件可直接複用 `CharacterRepository`/`InventoryRepository` 既有的角色層級入帳邏輯，不需要「帳號 -> 選哪個角色領」的額外決策。
- **讀信與領取合併為單一 `claim` 操作**：v1 不需要「已讀但未領」這種中間狀態的獨立 UI，玩家點開信件內容時若有獎勵就一併入帳，簡化狀態機（`unclaimed` -> `claimed`）。無獎勵的通知信（如果未來有）claim 後僅標記 `claimed`，語意上等同「已讀」。
- **獎勵型別複用既有 reward 欄位命名**：`rewardGold`/`rewardGems`（比照 `quest.ts` 的 `rewardGold`/`rewardGems`）+ `rewardItemIds: string[]`（比照 `InventoryRepository.addItem` 接受既有 itemId 參照，發信方需先在 `items` collection 產生好道具實例，本 change 不含道具產生邏輯）。
- **claim 用 Firestore transaction**：於同一 transaction 內讀信件、檢查未領取、更新角色 gold/gems、把 `rewardItemIds` 逐一加入 inventory（沿用 `InventoryRepository.addItem` 的容量檢查語意）、標記信件 `claimed`。道具已滿時整個 claim 失敗並回滾，玩家可先清空背包再重試（比照 `InventoryRepository.addItem` 對容量已滿丟出 `BusinessLogicError`的既有語意）。

## Risks / Trade-offs

- [風險] `claim` transaction 內若要新增多個道具（`rewardItemIds` 多筆）且中途容量已滿，會整筆回滾、玩家看起來像「領取失敗」但其實是背包滿 → [緩解]：`BusinessLogicError` 訊息明確標示「背包已滿」，前端顯示對應提示
- [風險] 信件無 TTL，長期會讓 `mailboxMessages` 無限增長 → [可接受]：v1 資料量小，之後量大再補上過期自動清除或封存機制
- [風險] 收件人是 characterId 意味著若角色被刪除，該角色的未領信件變成孤兒資料 → [可接受]：本 change 不處理刪除角色時的信箱清理，留待之後有實際需求再補
