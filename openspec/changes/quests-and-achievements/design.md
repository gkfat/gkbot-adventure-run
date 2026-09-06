## Context

`shared/schemas/firestore/quest.schema.ts` 已定義 `dailyQuestSchema`/`achievementProgressSchema`，皆為扁平文件，且以 `accountId` 為範疇鍵。分析階段（`openspec/analysis/`）完成於 2026-08-26，假設「一帳號對應恰好一個角色」；`multi-character-roster` change 於 2026-08-28 上線後，一帳號可擁有最多 3 個角色（`CHARACTER_ROSTER_MAX`），且 gold/gems 是 `Character` 文件的欄位（非帳號欄位，見 `shop.service.ts` 的既有慣例）。本 change 因此改為角色範疇：比照 shop/inventory/talents 的路由慣例（`/api/character/{characterId}/...`，前端由 `useCharacter()` composable 提供 `characterId`，不在前端路徑上出現）。

新增「常駐任務」（`persistent-quests`）為本次新發現的第三種型態，與「成就」的差異：
- 常駐任務：內容為遊戲進度取向（跟每日任務同類型，只是門檻更高、不重置），獎勵以 gold 為主，gems 僅高門檻項目少量發放（0~2）
- 成就：內容為里程碑取向（累積擊殺、破紀錄分數…），獎勵僅 gems

任務/成就的「進度計數」需要被其他系統事件觸發（完成冒險、擊殺數、購買次數…），但這些觸發來源（`adventure-run-core`、`shop`）在時序上可能晚於或早於本 change 完成，需要設計成鬆耦合介面。

## Goals / Non-Goals

**Goals:**
- 任務（每日＋常駐）/成就的 CRUD 與領取邏輯獨立完整可測試，不依賴其他 change 已經上線
- 提供清楚的「進度更新」介面契約，讓其他 change 之後串接時改動最小
- 三種進度型態皆以 `characterId` 為範疇鍵，跟現有玩法系統（shop/inventory/talents）的路由與所有權驗證方式（`CharacterRepository.getByIdForAccount`）一致

**Non-Goals:**
- 不在本 change 內建立任何實際觸發進度更新的呼叫點（那些邏輯屬於觸發來源所在的 change，例如冒險結算屬於 `adventure-run-core`）
- 不解決 AGG-006 邊界與扁平文件實作的根本落差（已記錄為已知偏差，不在本 change 範圍內重新設計）
- 不重新規劃已作廢的帳號範疇 API（`api-model.yaml` API-016~019）—— 直接以角色範疇路由取代，不做相容層
- 每日/常駐任務、成就的實際模板內容（清單、門檻、文案）留待實作階段細部討論，本文件只定案資料結構與介面

## Decisions

- **路由與所有權驗證比照 shop/inventory**：所有 API 掛在 `/api/character/{characterId}/...` 下，Handler 用 `CharacterRepository.getByIdForAccount(characterId, accountId)` 驗證角色屬於呼叫者，找不到回 404（與 `sell.post.ts`、`shop/index.get.ts` 相同 pattern）。
- **每日任務用 Firestore batch write 重置 3 份文件**：`QuestService.resetDailyQuests(characterId, date)` 一次 batch 寫入當日 3 個任務模板對應的文件，達成「同時全部出現，不會有部分任務缺漏」的效果，即使不是單一文件的原生 atomic write。
- **常駐任務不重置，懶建立**：首次查詢時為每個常駐任務模板建立一份 `claimed: false, currentCount: 0` 的文件（比照每日任務的懶生成，但不需要 `date` 欄位、不需要每日 batch 重置）。
- **常駐任務與每日任務共用 `QuestRepository`/`QuestService`，成就獨立一份 `AchievementRepository`/`AchievementService`**：常駐任務與每日任務的文件結構高度相似（`currentCount`/`targetCount`/`rewardGold`/`rewardGems`/`claimed`），只差在有無 `date` 欄位與重置行為，適合同一個 repository 用不同 collection（`dailyQuests`/`persistentQuests`）+ 方法區分；成就沒有 `rewardGold` 欄位、也沒有「每日」概念，維持獨立 schema/collection（`achievementProgress`）。
- **進度更新介面統一為 `incrementProgress(characterId, eventType, amount)`**：`QuestService`（涵蓋每日＋常駐）/`AchievementService` 各自維護一份「事件類型 → 影響哪些任務/成就模板」的對照表（存於 `server/constants/quests.ts`、`server/constants/persistent-quests.ts`、`server/constants/achievements.ts`），呼叫端（例如冒險結算）不需要知道任務/成就的內部細節，只需回報「發生了什麼事件、發生幾次」。單一事件（例如 `KILL_ENEMIES`）可能同時影響每日任務、常駐任務、成就，三者各自的 `incrementProgress` 都要呼叫——由觸發來源那個 change 決定要呼叫哪幾個服務。
- **領取採 Firestore transaction，同時寫入任務/成就文件與角色文件**：比照 `ShopService.purchaseItem` 的多文件 transaction 手法——`tx.get` 任務/成就文件確認 `completed && !claimed`、`tx.get` 角色文件取得目前 gold/gems，兩者在同一個 transaction 內一起寫入（任務/成就標記 `claimed = true`、角色 gold/gems 增加），避免併發雙重領取（RULE-010/RULE-011），也避免「標記已領但沒發錢」或反過來的不一致。

## Risks / Trade-offs

- [風險] `incrementProgress` 的事件類型清單在本 change 定義時，可能與之後 `adventure-run-core`/`shop` change 實際會發出的事件不完全對齊 → [緩解]：事件類型定義為開放的 string enum，之後 change 若需要新事件類型，只需擴充常數檔，不需改動本 change 的核心邏輯
- [風險] 每日任務 batch write 重置若與玩家同時讀取交錯，玩家可能短暫看到「只有 1-2 個任務」的過渡狀態 → [可接受]：機率極低（僅發生在 UTC+0 00:00 附近，且 batch write 是單次 Firestore 呼叫，延遲通常 <1s）
- [風險] 常駐任務與成就的模板池若內容取向劃分不清楚（例如同一個「累積擊殺 500 隻」門檻，重複出現在常駐任務跟成就），玩家會混淆兩個入口的差異 → [緩解]：實作階段訂模板清單時，明確以「遊戲進度型」vs「里程碑型」分流，不共用同一個 `templateId` 命名空間
- [風險] 分析階段的 `traceability.yaml`/`api-model.yaml` 尚未反映角色範疇路由與 `persistent-quests` 新 capability → [緩解]：`proposal.md` 已標注為已知落差；若之後需要嚴謹追溯，可重跑 `system-analysis`/`api-modeling`/`analysis-validator` 針對這三個 capability 補齊

## 補充決策：MAX_SCORE/REACH_STEP 類成就的進度顯示（`AchievementProgressMode`）

`MAX_SCORE`（單場冒險分數達到 X）、`REACH_STEP`（單場冒險推進到 X 步）這類「單次嘗試的峰值」型成就，語意上跟 `TOTAL_KILLS`/`TOTAL_RUNS` 這種「累計次數」型成就不同：不應該把每次呼叫 `incrementProgress` 的 `amount`（例如某一場 run 的分數）加總起來，也不該直接把原始分數／步數當進度條分母顯示（會誤讀成「離累計 10000 分還差多少」）。

新增 `AchievementTemplate.mode?: 'CUMULATIVE' | 'PEAK'`（省略時預設 `CUMULATIVE`，既有累計型模板不用改）：
- `PEAK` 模式：`incrementProgress` 不加總，改成「這次的 `amount` 單獨是否達標」——達標就直接把 `currentCount` 設為 `targetCount`（完成），不達標維持原狀（不會因為某次表現差而被拉低）
- `AchievementService.getAll()` 對 `PEAK` 模式的項目，回應時把 `currentCount`/`targetCount` 覆寫成 `0/1`（未達成）或 `1/1`（已達成），前端只會看到布林式的 0/1，不會看到原始分數/步數
- 目前只有 `high_score`（`MAX_SCORE`）套用 `mode: 'PEAK'`；`REACH_STEP` 尚無任何模板使用，之後若要新增，記得一併標注 `mode: 'PEAK'`

## 補充決策：成就內容擴充（18 個模板）與新增事件

新增 `AchievementType`：`KILL_GKBOT`、`KILL_HUMAN`（依 `AdventureRun.factionType` 拆分陣營擊殺數）、`DISCOVER_FACILITIES`（設施主題發現數）、`ATTACK_SPEED`（角色 `actionIntervalSec` 門檻，`compare: 'LTE'`）、`CHARACTER_LEVEL`（角色等級門檻）。新增 `AchievementTemplate.compare?: 'GTE' | 'LTE'`（PEAK 模式專用，預設 GTE），讓「數值越低越好」的成就（`ATTACK_SPEED`）也能用同一套 PEAK 邏輯。

實際接上事件來源（`server/services/adventure-run.service.ts` → `progress-tracker.service.ts`）：
- 戰鬥結算時，除了既有的 `ENEMY_KILLED`，依 `run.factionType` 再送一次 `ENEMY_KILLED_GKBOT`/`ENEMY_KILLED_HUMAN` → 對應 `KILL_GKBOT`/`KILL_HUMAN`
- Run 結算成功時，送 `CHARACTER_LEVEL_REACHED`（`character.level`）→ `CHARACTER_LEVEL`（PEAK/GTE）
- 角色建立時（`character.service.ts` `createCharacterFromArchetype`）先送一次 `FACILITY_DISCOVERED`（amount 1），計入 chapterIndex 0 的起始設施主題；之後每次 `chapterAdvanced` 為真時再送一次 → `DISCOVER_FACILITIES`；`targetCount` 動態取 `STAGE_CONFIG.FACILITY_THEMES.length`（設施主題按 `chapterIndex % length` 固定循環出現，跑完一輪循環等同全部看過一次，見 `shared/types/adventure.ts` 的 `getFacilityTheme`）

`ATTACK_SPEED` 仍未接上：需要在 `equipItem`/`unequipItem`/`allocateAttributes`/`allocateTalent`（`character.service.ts`）等每個會改變 `actionIntervalSec` 的呼叫點回報，牽涉的呼叫點較多，留待後續一併處理，不在本次批次範圍。`MAX_SCORE`/`REACH_STEP`/`TOTAL_GOLD`/`EQUIP_LEGENDARY` 維持原本未接上的狀態不變。

成就領取獎勵範圍從原本 gems 3~5 擴大為 3~10（隨難度分級），已同步更新 `specs/achievements/spec.md`。

## Open Questions

- 每日任務／常駐任務／成就的實際模板清單（名稱、門檻數值、文案）尚未定案，待實作階段另行討論

## incrementProgress 事件類型清單（供 adventure-run-core/shop 串接參考）

`QuestService.incrementProgress(characterId, eventType, amount)` 與 `AchievementService.incrementProgress(characterId, eventType, amount)` 是本 change 提供的介面。

**更新**：`adventure-run-core` 其實已經預留了 `ProgressTracker` 介面（`shared/types/adventure.ts`）並在 `AdventureRunService` 內建好呼叫點（`ADVENTURE_COMPLETED` 於 run 結算時、`ENEMY_KILLED` 於戰鬥結算時），原本用 `NoopProgressTracker` 頂著。本 change 新增 `server/services/progress-tracker.service.ts` 的 `QuestAchievementProgressTracker implements ProgressTracker`，把這兩個事件名稱轉譯成 `QuestType.COMPLETE_RUN`/`AchievementType.TOTAL_RUNS`（`ADVENTURE_COMPLETED`）與 `QuestType.KILL_ENEMIES`/`AchievementType.TOTAL_KILLS`（`ENEMY_KILLED`），已在 `AdventureRunService` 建構子換掉 `NoopProgressTracker`。其餘事件類型（`PURCHASE_SHOP`/`EARN_GOLD`/`REACH_STEP`/`MAX_SCORE`/`TOTAL_GOLD`/`EQUIP_LEGENDARY`）目前沒有任何來源會發送，維持下方清單供之後串接參考：

- 任務（`shared/types/quest.ts` 的 `QuestType`，`QuestService.incrementProgress` 用）：
  - `COMPLETE_RUN`：完成 1 次冒險 run 時呼叫，`amount` 通常為 1
  - `KILL_ENEMIES`：戰鬥擊殺敵人時呼叫，`amount` 為本次擊殺數
  - `PURCHASE_SHOP`：商店購買成功時呼叫（`shop` change 串接），`amount` 通常為 1
  - `REACH_STEP`：冒險推進到某個 step 時呼叫
  - `EARN_GOLD`：run 中獲得 gold 時呼叫，`amount` 為獲得數量
- 成就（`shared/types/quest.ts` 的 `AchievementType`，`AchievementService.incrementProgress` 用）：
  - `TOTAL_KILLS`：同 `KILL_ENEMIES`，累計擊殺數
  - `TOTAL_RUNS`：同 `COMPLETE_RUN`，累計完成 run 數
  - `MAX_SCORE`：單場 run 分數達到門檻時呼叫（`amount` 建議直接傳分數值，由 template 的 `targetCount` 判斷是否達成，而非累加）
  - `REACH_STEP`：單場 run 內推進到的最大 step
  - `TOTAL_GOLD`：累計獲得 gold
  - `EQUIP_LEGENDARY`：裝備傳說裝備時呼叫（`equipment`/`inventory` 相關 change 串接）

哪些模板對應哪個事件類型，見各自的 `type` 欄位：`server/constants/templates/quests.ts`（每日）、`server/constants/templates/persistentQuests.ts`（常駐）、`server/constants/templates/achievement.ts`（成就）——`incrementProgress` 內部用這個欄位過濾受影響的模板，呼叫端不需要另外查表。
