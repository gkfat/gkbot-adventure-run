## Context

`adventure-stage-progression`（程式碼已實作、尚未 archive）把 run 疊了一層「Chapter（設施實例）→ Stage（10~20 節點，最後一節固定 Boss）→ Node」的結構，但維持既有 `adventure-run-core` 的「無限循環、只靠死亡/斷線結束」精神——Boss 戰勝利只會推進到下一個 Stage 或下一個 Chapter，run 本身不會結束。獎勵面，`AdventureRun.score` 是抽象分數，只有在 run 結束（死亡/斷線）當下才 1:1 折算成角色 `exp`（`AdventureRunService.settleRun` → `CharacterRepository.settleRunRewards`）。

本 change 把「一次 run」的範圍收斂成「一次 Stage 的完整攻略」：Boss 戰勝利＝這次遠征結束，直接結算並給玩家看結算頁；戰鬥獎勵改成直接發 EXP（不再有中介的 score 概念），結算頁明確演繹 EXP 增長、升級、屬性點提示。這一層只影響 run 的結束條件、獎勵資料流、與冒險/結算畫面，不影響 `combat-engine` 的戰鬥模擬機制（傷害公式、多波多敵、Blessing/Curse 套用）、`deterministic-rng`、或 `character-progression` 既有的升級/屬性點公式。

## Goals / Non-Goals

**Goals:**
- 一次 run 只涵蓋一個 Stage（10~20 節點 + 最後的 Boss）；Boss 戰勝利即結束該 run（新的 `AdventureEndReason.COMPLETED`），不再有「推進到下一個 Stage/Chapter」的分支
- 移除 `score`：戰鬥擊敗敵人直接發放 `expGained`，run 累加 `expEarned`，結算時把 `expEarned` 計入角色 `exp`（取代原本「score 在結算時折算成 exp」的間接機制）
- run 結束時（不論 `COMPLETED`/`DEAD`/`DISCONNECT`）把完整的結算資訊（金幣/寶石/實際獲得的物品清單/EXP/升級/新增屬性點）透過觸發結算的那次 API 回應回傳一次，讓前端能演繹結算頁與實際列出拿到的物品
- 冒險畫面新增結算頁：EXP 增長動畫、升級演繹、屬性點可分配提示（沿用角色畫面既有的 `unspentAttributePoints` 顯示，不新增分配 UI）
- 設施主題（原本的 `chapterIndex`）改成角色層級的持久狀態，只有 Stage 攻略成功（`COMPLETED`）才切到下一個設施主題；死亡/斷線則下次 run 沿用同一個設施主題重試
- 冒險失敗（`DEAD`/`DISCONNECT`）時，run 期間累積的金幣/寶石/物品全部作廢、只保留 EXP；結算摘要明確列出「作廢了哪些物品、多少金幣寶石」，而非讓玩家誤以為兩手空空
- 戰鬥節點在生成當下就決定第一波敵人陣容（種類/名稱/描述/生命值），讓「遭遇敵人，準備戰鬥」畫面能先行預覽；後續波次仍保持未知，戰鬥解算當下才決定

**Non-Goals:**
- 不重新設計升級所需 EXP 曲線或每級屬性點數（沿用 `character-progression` 既有的 `EXP_TABLE`、`+1 unspentAttributePoint per level` 公式，不調整數值）
- 不新增「分配屬性點」的操作 UI（那是既有但尚未建置的獨立功能，本 change 只在結算頁提示「有 N 點可分配」並引導回角色畫面，角色畫面已有現成的 `unspentAttributePoints` 顯示）
- 不處理 `leaderboard`/`quest` 對 `score`（`LeaderboardEntry.score`、`QuestType.MAX_SCORE`）的重新設計——兩者目前都只有 `Noop*` stub、尚未真正實作，本 change 不修改其型別；`LeaderboardUpdater.updateIfBetter` 沿用既有介面簽章，暫以 `expEarned` 作為傳入的 `score` 參數值
- 不處理「死亡/斷線」結束時是否也要有完整的結算頁演繹（EXP 動畫/升級）——本 change 保證死亡/斷線也會拿到同一份 `SettleResult`（不做特殊處理去掉欄位），但演繹重點（動畫、文案）以 `COMPLETED` 為主場景；`DEAD`/`DISCONNECT` 的結算頁沿用同一個結算頁元件顯示數字即可，不強求同等華麗的動畫
- 不處理既有進行中的 run（`adventure-stage-progression` 上線後才開始測試，資料量極小）——見下方 Migration Plan
- 不新增「戰鬥中隨機加入援軍」等會動態改變已決定陣容的機制；不處理第二波（以後）敵人陣容的預覽 UI，只有第一波在節點生成時決定並可預覽

## Decisions

- **Run 結束時機：Boss 戰勝利離開 RESOLUTION/BLESSING_SELECT 時直接結算，且略過 BLESSING_SELECT**：`advanceFromResolution` 與 `selectBlessing` 目前都有「離開 RESOLUTION/BLESSING_SELECT 進入下個 EXPLORING」的分支（`adventure-stage-progression` 的 Stage/Chapter 推進邏輯就長在這裡）。本 change 把這兩個分支改成：`run.currentNodeType === NodeType.BOSS` 時，**不管 `blessingPoints` 是否達到 `BLESSING_POINTS_THRESHOLD`**，直接呼叫 `settleRun(run, AdventureEndReason.COMPLETED)` 並回傳；`advanceFromResolution` 原本「blessingPoints 達門檻 → 進入 BLESSING_SELECT」的判斷只在非 Boss 節點時才檢查。
  - 理由：Boss 是這次遠征的終點，選祝福（Blessing）是為了讓後續戰鬥更好打，run 都要結束了，選祝福沒有意義；略過它可以少一次互動、結算更即時
  - 取捨：如果 Boss 戰後同時觸發保底 Blessing，玩家會「損失」這次沒選到的 Blessing——可接受，因為 Blessing 本來就是 run-only modifier，run 結束後本來就會被丟棄，選了也沒用

- **移除章節推進、`chapterIndex` 改存在角色文件**：`buildStageProgressionPatch` 整個移除（連同 `chapterStageCount`/`stageIndexInChapter` 欄位、`STAGE_CONFIG.CHAPTER_STAGE_COUNT_MIN/MAX`、`rollInRange` 章節部分）。`Character` 新增 `nextChapterIndex: number`（0-based，預設 0）：
  - `AdventureRunRepository.createRun` 建立新 run 時，讀取角色目前的 `nextChapterIndex` 存入 `run.chapterIndex`（顯示用，run 本身不再遞增它）
  - `settleRun` 呼叫 `CharacterRepository.settleRunRewards` 時多傳一個 `endReason`；只有 `endReason === COMPLETED` 才把角色的 `nextChapterIndex + 1`（同一個 transaction 內），`DEAD`/`DISCONNECT` 不變動，讓玩家下次 run 沿用同一個設施主題重試
  - `getStageDisplayName` 簡化為只回傳設施名稱（`getFacilityTheme(chapterIndex)`），不再拼「-{章節內關卡序號}」——單 Stage 制下這個序號恆為 1，拼出來沒有資訊量。既有呼叫點（`adventure.vue`、`characterStage.vue` 的 CTA 文案）改用簡化後的回傳值

- **EXP 取代 score：戰鬥層與 run 層各自的欄位改名/改語意**：
  - `combat.ts`：`scoreForKill(enemyLevel, tier)` 改名 `expForKill(enemyLevel, tier)`，`TIER_SCORE_MULTIPLIER` 改名 `TIER_EXP_MULTIPLIER`，數值原封不動延用（ASSUMPTION：沿用原本 score 的數值量級當作 EXP 量級，之後可依實測手感調整，不在本 change 重新平衡）
  - `CombatResult`：`scoreGained` 改名 `expGained`；`CombatSummary`/`combatSummarySchema` 同步
  - `AdventureRun`：`score` 改名 `expEarned`（累加語意不變，只是現在直接是「這次遠征賺的 EXP」，不再需要在結算時額外折算）
  - `AdventureRunService.settleRun` 呼叫 `characterRepo.settleRunRewards` 時，`expGained` 參數直接傳 `run.expEarned`（原本是 `run.score`）

- **`SettleResult` 擴充並持久化到 `run.settlement`，透過觸發結算的 API 回應回傳一次；物品用實際清單而非數量**：
  - `SettleResult`／新型別 `SettleSummary`（前端可見版本）欄位：`goldEarned`/`gemsEarned`（實際併入角色的金額，失敗時固定 0）、`items: ItemInstance[]`（實際轉入永久背包的物品，取代原本只回傳數量的 `itemsEarned: number`）、`untransferredItemIds: string[]`（背包已滿轉不進去的部分，沿用既有語意）、`expGained`（= `run.expEarned`）、`leveledUp`、`newLevel`、`unspentAttributePointsGained`、`forfeitedGold`/`forfeitedGems`/`forfeitedItems: ItemInstance[]`（失敗時作廢的金額與物品清單；成功時皆為 0/空陣列）
  - 改用 `items: ItemInstance[]` 而非數量，是因為結算頁要能實際列出物品圖示/名稱/稀有度（沿用 `app/utils/equipmentDisplay.ts` 既有的 `describeItem`/`RARITY_COLOR`），不能只顯示「獲得 3 件物品」這種抽象數字
  - `newLevel`/`unspentAttributePointsGained`：`unspentAttributePointsGained = newLevel - previousLevel`（因為現行 `settleRunRewards` 是每級固定 +1 點；若之後每級點數改成非固定，這裡要跟著從 `settleRunRewards` 回傳的等級差重新算，不能硬編 1）
  - `settleRun` 內把完整的結算摘要寫進 `run.settlement`（`saveCheckpoint` 的一部分），比照 `lastCombatSummary` 的模式——**存在 run 文件上是為了持久稽核紀錄**，不是給前端輪詢用
  - 觸發結算的那次呼叫（`advance`：Boss 分支／`resolveCombat`：戰鬥失敗分支／`getCurrentRun`：斷線逾時分支）直接把結算摘要一併回傳給呼叫端，前端就地渲染結算頁，不需要額外呼叫 `GET /api/adventure/current`（因為 run 一旦 `ENDED`，`getActiveByCharacterId` 的查詢條件 `state != ENDED` 就找不到它了）
  - `advanceAdventureResponseSchema`／`startCombatResponseSchema`／`getCurrentAdventureResponseSchema` 都新增可選的 `settlement` 欄位

- **失敗結算：`settleRun` 依 `endReason` 分流是否套用金幣/寶石/物品獎勵**：
  - `endReason === COMPLETED`：沿用既有邏輯，`goldEarned`/`gemsEarned` 併入角色資源，`run.runInventory` 轉入永久背包（受 500 格上限限制，轉不進去的走既有 `untransferredItemIds` 流程）
  - `endReason === DEAD` 或 `DISCONNECT`：**不**呼叫角色 gold/gems 加值（`characterRepo.settleRunRewards` 的 `goldEarned`/`gemsEarned` 參數固定傳 0）、**不**執行 run 背包轉入永久背包（`run.runInventory` 直接捨棄，不寫入任何角色/背包資料）；`expGained` 一律照給（EXP 不受這條規則影響，見使用者需求「冒險失敗時只會取得 exp」）
  - 結算摘要把捨棄前的 `run.goldEarned`/`run.gemsEarned`/`run.runInventory` 分別填進 `forfeitedGold`/`forfeitedGems`/`forfeitedItems`，讓結算頁能明確顯示「這次其實賺了多少、但因戰敗損失了」，而不是讓畫面看起來像什麼都沒撿到
  - 理由：使用者明確要求「冒險失敗時只會取得 exp, 無法帶走其他道具或金幣獎勵」；保留 forfeited 數字純粹是結算頁的敘事回饋，不影響任何實際資料寫入

- **前端：`useAdventureRun` 新增 `lastSettlement`，比照既有 `lastCombatResult`/`lastEventResult` 的「本地暫存、離開畫面或下次進冒險時清空」模式**：`advance()`／`resolveCombat()`（若導致結算）／`fetchCurrent()`（若偵測到斷線結算）把回應中的 `settlement` 存進 `lastSettlement`；`adventure.vue` 在 `!currentRun && lastSettlement` 時渲染結算頁（取代目前單純的「目前沒有進行中的冒險」空狀態），玩家點擊「返回首頁」才清空 `lastSettlement` 並導頁

- **結算頁動畫範圍（ASSUMPTION，前端表現細節，之後可微調）**：EXP 進度條從結算前的量播放到結算後的量（跨等級時允許「滿條 → 歸零 → 繼續累加」的多段播放，因為 `EXP_TABLE` 每級所需經驗不同）；升級時在動畫播放到滿條瞬間插入一個「LEVEL UP」的短暫特效（沿用專案既有 `font-pixel`/像素風格，不引入新的動畫函式庫）；若 `unspentAttributePointsGained > 0`，動畫結束後顯示一段固定文案提示（例如「獲得 N 點可分配屬性點，回到角色畫面分配吧」），不強制跳轉；`items`（成功）或 `forfeitedItems`（失敗）以既有的物品格子樣式（`describeItem`/`RARITY_COLOR`）列出，失敗時額外用警示色標示「已作廢」

- **敵人陣容於節點生成時決定第一波，戰鬥解算沿用；後續波次維持原本在戰鬥解算當下才 roll**：
  - `ENEMY_ARCHETYPES` 新增 `description: string`（ASSUMPTION：世界觀文件未定義個別敵人描述，沿用現有 4 型 GkBot 風味各補一句簡短描述）
  - `advanceFromExploring` 決定 COMBAT/ELITE/STRONG_ELITE/BOSS 節點時：先決定 `waveCount`/`enemyCountPerWave`（BOSS 固定 1/1；其餘沿用既有 `rollWaveCount`/`rollEnemyCount` 機率公式，呼叫時機從 `resolveCombat` 提前到這裡）；只對**第一波**的每個敵人位置 roll 一次 archetype（沿用 `combat.service.ts` 現有的 `Math.floor(roll * ENEMY_ARCHETYPES.length)` 邏輯搬到這裡），用 `getStatMultipliers(enemyLevel, tier)` 算出顯示用 HP，連同 archetype 的 name/description 存進 `currentNodeData.firstWaveEnemies: { archetypeIndex, name, description, level, hp }[]`
  - `CombatContext` 新增 `firstWaveArchetypeIndices?: number[]`（可選——只有 COMBAT/ELITE/STRONG_ELITE/BOSS 有值），`resolveCombat` 組 context 時從 `nodeData.firstWaveEnemies` 取出對應的 `archetypeIndex` 陣列；`waveCount`/`enemyCountPerWave` 也改成直接讀 `nodeData`，不再呼叫 `rollWaveCount`/`rollEnemyCount`
  - `CombatService.spawnWave`：wave index 0 時，若 `context.firstWaveArchetypeIndices` 有值就依序取用（不再自己 roll archetype）；wave index >= 1 維持原本「每個敵人位置各自 roll 一次 archetype」的邏輯不變
  - 冒險畫面「遭遇敵人，準備戰鬥」區塊改列出 `currentNodeData.firstWaveEnemies`：每隻敵人顯示名稱、描述、生命值；若 `waveCount > 1`，額外顯示一行固定提示（例如「偵測到後續增援，數量不明」），不揭露第二波內容
  - 取捨：只有第一波的「哪隻怪」RNG 消耗時機提前到節點生成，後續波次維持原邏輯——把 RNG 序列變動範圍降到最小，也符合使用者「後續波次保持神秘」的要求

## Risks / Trade-offs

- [風險] `adventure-stage-progression` 剛實作、還沒 archive 就被大幅改寫（`buildStageProgressionPatch`、`chapterStageCount`/`stageIndexInChapter` 整個移除）→ [緩解] 這是同一個 run 生命週期概念的延續與收斂，不是推翻 Stage/Boss/設施主題核心概念；apply 時會直接在既有程式碼上修改，兩個 change 之間不會有中間態需要相容
- [風險] `score`→`expEarned` 改名牽動 `CombatResult`/`CombatSummary`/`AdventureRun` 多處型別與既有測試 → [緩解] 全部是機械式改名＋語意微調（少了「結算時才折算」這一步），改動面雖廣但每處都是同構替換，可逐一比對既有測試改寫
- [風險] Boss 戰勝利略過 BLESSING_SELECT，若未來想在「結束前最後一戰」保留選祝福的爽感，等於要再改回來 → [接受，非本 change 範圍]：已在 Decisions 說明理由，之後若要調整是局部邏輯回滾，不影響資料結構
- [風險] `nextChapterIndex` 只在 `COMPLETED` 才 +1，玩家若刻意送死重刷同一個簡單設施主題，可能被視為需要防呆的行為 → [接受，非本 change 範圍]：設施主題本身目前只影響顯示名稱與（未來的）敵人風味，沒有難度或獎勵掛鉤，暫不視為需要防呆的漏洞
- [風險] `unspentAttributePointsGained` 硬編「= 等級差 × 1」，若之後 `settleRunRewards` 的每級點數常數改了，這裡會跟著算錯 → [緩解] 直接從 `settleRunRewards` 回傳的 `character.level` 與呼叫前的 `character.level` 差值計算，不重複硬編「每級 1 點」這個假設本身（差值 × 常數只在常數本身找不到動態來源時才用，已於 Decisions 註明）
- [風險] 死亡/斷線時金幣寶石物品全部作廢，可能讓玩家覺得「戰死損失太重」影響體驗 → [接受，非本 change 範圍]：這是使用者明確要求的設計方向，數值/情緒平衡留待之後依實測手感調整
- [風險] 陣容預覽把第一波的 waveCount/enemyCountPerWave/archetype roll 提前到節點生成，若之後想加入「戰鬥開始瞬間隨機加料」等機制會被這個提前決定的第一波陣容卡住 → [接受，非本 change 範圍]：目前戰鬥模型本來就是伺服器一次性全模擬，沒有這種機制；後續波次仍在戰鬥解算當下才決定，保留彈性

## Migration Plan

- `adventureRuns` 目前僅有 `adventure-stage-progression` 上線後產生的少量測試資料（含尚在進行中的 run，欄位包含 `score`/`chapterStageCount`/`stageIndexInChapter`）；決策：**不做資料回填／不相容既有進行中的 run**，這些欄位改動後既有測試帳號的進行中 run 直接視為失效資料，開發階段可接受由使用者自行結束重開（QA 會清空一次 `adventureRuns`／`characters` 測試集合，不在本 change 的程式碼職責內）
- `characters` 集合新增 `nextChapterIndex`：既有角色文件讀取時以 `?? 0` 容錯（沿用 repository 既有的「legacy 欄位補值」慣例），下次呼叫 `settleRunRewards`（`COMPLETED` 結算）時才會真正寫入這個欄位
