## 1. 模板常數

- [x] 1.1 每日任務模板與事件類型對照表 —— 沿用既有 `server/constants/templates/quests.ts`（`QUEST_TEMPLATES`，已存在 3 個模板），事件類型對照表以模板自身的 `type: QuestType` 欄位查詢，不另建對照表檔案，避免重複資料來源
- [x] 1.2 新增 `server/constants/templates/persistentQuests.ts`：常駐任務模板（同每日任務內容取向，門檻更高）與事件類型對照（同上，用 `type` 欄位）
- [x] 1.3 成就模板 —— 沿用既有 `server/constants/templates/achievement.ts`（`ACHIEVEMENT_TEMPLATES`，已存在 4 個模板），事件類型對照同上用 `type: AchievementType` 欄位

## 2. Repository

- [x] 2.1 新增 `server/repositories/quest.repository.ts`：每日任務（`dailyQuests`）`getDailyQuests`/`batchCreateDailyQuests`，常駐任務（`persistentQuests`）`getPersistentQuests`/`batchCreatePersistentQuests`（領取邏輯改放 Service，見 design.md 的 ShopService 慣例，不放在 repository）
- [x] 2.2 新增 `server/repositories/achievement.repository.ts`：`getAll(characterId)`/`batchCreate`（領取邏輯同上改放 Service）

## 3. Service

- [x] 3.1 新增 `server/services/quest.service.ts`：每日任務懶生成（UTC+0，batch write）、常駐任務懶建立（不重置）、`incrementProgress(characterId, eventType, amount)`（同時影響每日與常駐任務模板）、`claimDaily`/`claimPersistent(accountId, characterId, questId)`
- [x] 3.2 新增 `server/services/achievement.service.ts`：`incrementProgress(characterId, eventType, amount)`、`claim(accountId, characterId, achievementId)`
- [x] 3.3 領取邏輯使用 Firestore transaction，同時讀寫任務/成就文件與角色文件（gold/gems 發放），防止併發雙重領取

## 4. API

- [x] 4.1 新增 `server/api/character/[characterId]/quests/daily.get.ts`
- [x] 4.2 新增 `server/api/character/[characterId]/quests/daily/claim/[questId].post.ts`
- [x] 4.3 新增 `server/api/character/[characterId]/quests/persistent.get.ts`
- [x] 4.4 新增 `server/api/character/[characterId]/quests/persistent/claim/[questId].post.ts`
- [x] 4.5 新增 `server/api/character/[characterId]/achievements/index.get.ts`
- [x] 4.6 新增 `server/api/character/[characterId]/achievements/claim/[achievementId].post.ts`

## 5. 前端

- [x] 5.1 `bottomNav.vue`：最右側新增「任務」入口（取代原本未串接的「排行」按鈕），導向 `/quests`
- [x] 5.2 新增 `/quests` 頁面：「每日任務」「常駐任務」兩個 tab，顯示進度與領取按鈕
- [x] 5.3 `accountDrawer.vue`：既有「切換角色／圖鑑」方形按鈕列新增「成就」按鈕，開啟 `GameCommonAchievementsDialog`（比照 `GameCommonBestiaryDialog` 的 fullscreen dialog 形式）
- [x] 5.4 新增 `useQuests`/`useAchievements` composable 串接上述 API，claim 成功後樂觀更新該筆 `claimed` 並重新整理角色資料（gold/gems）

## 6. 文件與驗證

- [x] 6.1 於 `server/utils/openapi.ts` 註冊 6 個新路徑
- [x] 6.2 執行 `pnpm nuxt typecheck`（新增/修改的檔案零新增錯誤，仍是修改前就存在的 42 個既有錯誤；`pnpm test` 291/291 通過；`pnpm lint` 對新檔案僅剩 repo 既有的 base `no-unused-vars` 誤判型別參數名稱與 `catch (err: any)` 慣例兩類既有落差，非本次新增）
- [x] 6.3 手動驗證：啟動 `pnpm dev`，實際登入後透過 bottomNav「任務」與 accountDrawer「成就」點開驗證，於過程中發現並修正一個真實 bug ——
  `QuestRepository.getDailyQuests`/`getPersistentQuests`、`AchievementRepository.getAll` 原本用 `BaseRepository.snapshotToArray`（或手動複製其邏輯），會在每筆文件塞入一個合成的 `id: doc.id` 欄位；但 `dailyQuestSchema`/`persistentQuestSchema`/`achievementProgressSchema` 都是 `.strict()`，多出的 `id` 讓查詢一律回 500（`Unrecognized key: "id"`）。修正為直接回傳 `doc.data()`（這些文件本來就有自己的 `questId`/`achievementId` 當識別欄位，不需要外掛 `id`）。順便補上 `achievementsDialog.vue` 原本沒有的錯誤狀態顯示（失敗時只會一片空白），並把 `useAchievements.ts` 的 `AchievementProgress` 型別改名為 `AchievementProgressView`，避免跟 `shared/types/quest.ts` 的同名型別在 Nuxt auto-import 撞名。修正後每日任務／常駐任務／成就三個入口都手動驗證過可以正常讀取。
  領取流程（達成後成功領取、尚未達成 400、重複領取 409、404 跨角色保護）尚未實際手動跑過（需要先讓某個任務/成就達成門檻），留待下次驗證。
- [x] 6.4 記錄 `incrementProgress` 的事件類型清單，供後續 `adventure-run-core`/`shop` change 串接參考（見 design.md）
- [x] 6.5 新增 `server/services/progress-tracker.service.ts`（`QuestAchievementProgressTracker implements ProgressTracker`），接上 `adventure-run-core` 已預留的 `ProgressTracker` 呼叫點（`ADVENTURE_COMPLETED`→`COMPLETE_RUN`/`TOTAL_RUNS`、`ENEMY_KILLED`→`KILL_ENEMIES`/`TOTAL_KILLS`），取代 `AdventureRunService` 建構子裡的 `NoopProgressTracker`；同步更新 `adventure-run.service.test.ts` 的 mock
- [x] 6.6 成就內容擴充至 18 個模板（新增 14 個：4 個指定 + 10 個生成），新增 `KILL_GKBOT`/`KILL_HUMAN`/`DISCOVER_FACILITIES`/`ATTACK_SPEED`/`CHARACTER_LEVEL` 五個 `AchievementType` 與 `AchievementTemplate.compare`（PEAK 模式方向）；接上 `ENEMY_KILLED_GKBOT`/`ENEMY_KILLED_HUMAN`/`CHARACTER_LEVEL_REACHED`/`FACILITY_DISCOVERED` 四個新事件（見 design.md）。`ATTACK_SPEED`/`MAX_SCORE`/`REACH_STEP`/`TOTAL_GOLD`/`EQUIP_LEGENDARY` 維持未接上狀態
- [x] 6.8 每日任務改為不發放 gems（`complete_run` 的 `rewardGems` 1→0，其餘本就是 0）；常駐任務擴充為 20 個（`COMPLETE_RUN`/`KILL_ENEMIES`/`PURCHASE_SHOP`/`EARN_GOLD` 各 5 階梯門檻），並調降 gems 發放（大多 0，最高門檻項目至多 2）；同步更新 proposal/design/specs 文字敘述
- [x] 6.9 `/quests` 任務列改為單排緊湊列（比照使用者提供的參考圖），並再迭代：全部元素（內容文字／進度條／gold 與 gems 獎勵／領取狀態圖示）併成同一列、垂直置中；gold/gems 獎勵改用邊框小方塊（icon button 樣式）包起來；進度用 `v-progress-linear` 視覺化取代純數字；顯示 `quest.description`（具體任務內容，如「累計完成 100 次冒險」）取代 `quest.name`（名稱移到 `title` tooltip）；領取狀態圖示（鎖頭／發光下載匣／綠色勾勾）取代文字按鈕；描述文字改為可換行不 truncate（`white-space: normal` + `word-break: break-word`）；gems 獎勵顯示順序調到 gold 之前；進度條移到描述文字下方獨立一行（原本內嵌在同一行），並附上小字 `N/N`。已用 dev server 截圖確認每日/常駐任務列表顯示正常（含長描述換行、進度條位置）
- [x] 6.7 成就 UI 改版：一列 3 個徽章格狀排列（比照 `bestiaryDialog.vue` 的「上方預覽＋下方格狀選取」版面），像素風機械科幻徽章（`public/images/pixel-icons/achievementBadgeLit.png`/`achievementBadgeLocked.png`，用 pixel-art-studio 產出，32x32，配色取自 `app/plugins/vuetify.ts` 的 theme primary/dark/green 與既有 pixel-icon 的外框色 `#2b2d30` 系）。`completed` 決定顯示 lit 或 locked 徽章（不看 `claimed`），完成未領取的徽章有呼吸光暈動畫提示。已用 dev server 實機截圖確認 18 個成就的格狀版面與像素圖渲染皆正常
