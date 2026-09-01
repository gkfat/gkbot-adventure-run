# adventure-run-lifecycle

## Purpose

冒險 Run 的建立、狀態機推進、節點生成、斷線重連、結算，以及首頁的開始/繼續冒險入口與休息節點用藥——玩家所有的資源累積、分數、裝備掉落都發生在這個核心迴圈裡。

## Requirements

### Requirement: 開始新的冒險 Run
系統 SHALL 僅在角色沒有其他進行中（state != ENDED）的 run 時，允許建立新 run（seed、state=INIT、step=0、rngIndex=0）。

#### Scenario: 成功開始
- **WHEN** 角色目前沒有進行中的 run，玩家呼叫 `POST /api/adventure/start`
- **THEN** 系統建立新 run，回傳 runId 與初始 state=INIT

#### Scenario: 已有進行中的 run
- **WHEN** 角色已有一筆 state != ENDED 的 run，玩家再次呼叫 `POST /api/adventure/start`
- **THEN** 系統回傳 409 並附上現有 run 的資訊

### Requirement: 章節與關卡的階層
系統 SHALL 在角色文件上維護「章節（Chapter，＝設施主題）→ 關卡（Level）」的階層：角色文件 SHALL 記錄 `currentLevelIndex`（0-based，目前在本章節的第幾關）與 `chapterTotalLevels`（本章節總關卡數）。角色首次進入一個新章節（`nextChapterIndex` 剛遞增，或角色文件初始建立）時，系統 SHALL 依該章節對應的設施類型，從「設施類型 → 關卡數區間」對照表以決定性 RNG roll 出 `chapterTotalLevels`（含頭尾），並將 `currentLevelIndex` 設為 0；`chapterTotalLevels` 在同一章節內 SHALL 維持不變。一次 run SHALL 對應章節內的一個關卡；同一章節內的所有關卡 SHALL 使用同一個設施主題（顯示名稱、怪物風味皆相同）。

#### Scenario: 進入新章節時決定關卡數
- **WHEN** 角色的 `nextChapterIndex` 剛遞增為新的章節索引（見「章節與關卡的推進」）
- **THEN** 系統依新章節的設施類型，從對照表區間以決定性 RNG roll 出 `chapterTotalLevels`，並將 `currentLevelIndex` 重設為 0

#### Scenario: 角色初始建立時的第一個章節
- **WHEN** 角色文件初始建立（`nextChapterIndex = 0`）
- **THEN** 系統比照「進入新章節」邏輯，依第 0 個設施主題的區間 roll 出初始 `chapterTotalLevels`，`currentLevelIndex = 0`

#### Scenario: 設施類型對應關卡數區間
- **WHEN** 系統查詢某設施主題的關卡數區間
- **THEN** 系統回傳該設施類型在「設施類型 → 關卡數區間」對照表中定案的 `{min, max}`（例如「無主小賣店」對應 3~5、「廢棄研究所」對應 8~12；完整 8 種設施類型的區間值定案於實作端 `STAGE_CONFIG` 常數，本 spec 僅保證每種設施類型皆有明確定案的區間，不允許缺漏）

#### Scenario: 同章節內關卡共用設施主題
- **WHEN** 角色在同一章節內從關卡 1 推進到關卡 2
- **THEN** 新關卡對應的新 run 仍使用同一個設施主題（`chapterIndex` 不變），只有 `currentLevelIndex` 遞增

#### Scenario: 設施主題依序循環
- **WHEN** 角色的 `nextChapterIndex` 超過裂域設施主題清單的長度
- **THEN** 依序循環回清單第一個設施主題繼續使用（例如清單有 8 種主題時，第 9 個索引沿用第 1 個設施主題），並依循環後對應到的設施類型 roll 出該章節的 `chapterTotalLevels`

### Requirement: Stage 結構與 Boss 節點
系統 SHALL 將一次 run 的場景流建構為單一個關卡（Level）的 10~20 個 Stage；run 建立時 SHALL 以決定性 RNG 決定該關卡的 Stage 總數（10~20 之間，含頭尾），且該關卡的最後一個 Stage SHALL 固定為 BOSS combat，打贏即代表這個關卡攻略成功。run 建立時 SHALL 使用角色目前的 `nextChapterIndex` 作為本次遠征的裂域設施主題（依序循環裂域設施主題清單，見 `docs/worldview.md` 第 2 節，清單可持續擴充），僅供顯示與敵人風味使用，run 期間不遞增；設施主題（章節）的推進改由「章節與關卡的推進」於角色文件層級處理，且只有攻略完章節最後一關才會真正推進。

#### Scenario: Run 建立時決定 Stage 總數
- **WHEN** 玩家呼叫 `POST /api/adventure/start` 建立新 run
- **THEN** 系統以決定性 RNG roll 出本次關卡的 Stage 總數（10~20 之間），並將 run 的 `chapterIndex` 設為角色目前的 `nextChapterIndex`

#### Scenario: 關卡最後一個 Stage 固定為 Boss
- **WHEN** 目前關卡內 Stage 序號等於「本關卡 Stage 總數 - 1」
- **THEN** 下一個 Stage 固定為 BOSS combat，不受保底 Rest 或加權隨機影響

### Requirement: 遠征風險分級與敵對陣營決策
系統 SHALL 於 run 建立時（`createRun`），以決定性 RNG 決定該趟遠征的設施風險分級（`severityTier`：`DEEP_WRECK` / `PARTIAL_ACTIVE` / `HIGHLY_ACTIVE`）與敵對陣營（`factionType`：`GKBOT` / `HUMAN`），兩者於整趟 run 內（所有節點）保持不變。`severityTier` 的機率 SHALL 依角色的 `chapterIndex` 動態遞增（越高越容易抽到高分級）但設上限，`factionType = HUMAN` 的機率 SHALL 依 `severityTier` 加權，`severityTier` 越高機率越高。

#### Scenario: run 建立時決定分級與陣營
- **WHEN** 呼叫 `createRun` 建立一筆新的 run 文件
- **THEN** 系統以決定性 RNG roll 出本趟 run 的 `severityTier` 與 `factionType`，兩者在本 run 結束前不再改變

#### Scenario: 角色進度越後面越容易抽到高分級
- **WHEN** 兩個角色分別以較低與較高的 `chapterIndex` 建立新 run
- **THEN** 較高 `chapterIndex` 的角色抽到 `severityTier = HIGHLY_ACTIVE` 的機率不低於較低 `chapterIndex` 的角色，但機率有上限，兩者都仍有機會抽到任一分級

#### Scenario: 高分級提高人類陣營機率
- **WHEN** run 的 `severityTier = HIGHLY_ACTIVE`
- **THEN** 本趟 run `factionType = HUMAN` 的機率高於 `severityTier = DEEP_WRECK`/`PARTIAL_ACTIVE` 時的機率，且 `DEEP_WRECK` 分級下 `HUMAN` 機率仍大於 0

#### Scenario: 缺少歷史欄位時的容錯
- **WHEN** 讀取一個在本 change 上線前建立、沒有 `severityTier`/`factionType` 欄位的既有 run
- **THEN** 系統以 `PARTIAL_ACTIVE`/`GKBOT`（等同不調整的既有行為）作為預設值，不中斷該 run

### Requirement: 節點生成優先序
系統 SHALL 依序決定下一節點：目前節點是本 Stage 最後一個節點時強制為 BOSS（Stage 邊界，優先序最高）；否則距上次 Rest 節點 >= 4 step 時強制為 Rest（保底）；否則 `step % 9 == 0` 為 Strong Elite、`step % 5 == 0` 為 Elite；否則依權重隨機決定 combat/event/rest/choice。多個條件同時觸發時，優先序為：Stage 邊界（Boss） > 保底 Rest > 固定精英節奏 > 加權隨機。

#### Scenario: Stage 邊界優先於保底 Rest
- **WHEN** 目前節點同時是本 Stage 的最後一個節點，且距上次 Rest 已達保底條件
- **THEN** 下一節點為 BOSS（Stage 邊界優先於保底 Rest）

#### Scenario: 保底 Rest 觸發
- **WHEN** 距上次 Rest 已經過 4 個 step，且本次同時符合 `step % 5 == 0`，且本次不是 Stage 最後一個節點
- **THEN** 下一節點為 Rest（保底優先於精英節奏）

#### Scenario: 固定精英節奏
- **WHEN** 未觸發 Stage 邊界與保底，且 `step % 9 == 0`
- **THEN** 下一節點為 Strong Elite combat

#### Scenario: 敵人難度隨 step 提升
- **WHEN** 下一節點為一般 combat，且 `step = 10`
- **THEN** `enemyLevel = 1 + floor(10/2) = 6`，對應的 hp/atk/def 倍率依公式套用

### Requirement: 斷線重連與逾時結束
系統 SHALL 允許在 15 分鐘內（以 `lastActivityAt` 判斷）恢復中斷的 run；超過窗口時 SHALL 以 `endReason = DISCONNECT` 結束該 run。

#### Scenario: 窗口內恢復
- **WHEN** 玩家在最後互動後 10 分鐘內呼叫 `GET /api/adventure/current`
- **THEN** 回傳目前 run 的完整狀態，玩家可繼續

#### Scenario: 超過窗口自動結束
- **WHEN** 玩家在最後互動後 20 分鐘才呼叫 `GET /api/adventure/current`
- **THEN** 系統先將該 run 標記 `endReason = DISCONNECT` 並執行結算，再回傳「run 已結束」

### Requirement: Stage 完成即結束 Run
系統 SHALL 在玩家於 Boss Stage 的戰鬥中獲勝、並從其 RESOLUTION（或因祝福點數達門檻而經過的 BLESSING_SELECT）繼續前進時，立即以 `endReason = COMPLETED` 結算並結束該 run；即使此時 `blessingPoints` 已達到觸發 BLESSING_SELECT 的門檻，也 SHALL 略過祝福選擇，直接結算。結算時系統 SHALL 依角色目前的 `currentLevelIndex` 與 `chapterTotalLevels` 判定推進方式：若 `currentLevelIndex + 1 < chapterTotalLevels`，SHALL 只將 `currentLevelIndex` 加 1（同章節內推進到下一關，設施主題不變、`nextChapterIndex` 不變）；若 `currentLevelIndex + 1 >= chapterTotalLevels`，SHALL 將 `nextChapterIndex` 加 1、`currentLevelIndex` 重設為 0，並依「章節與關卡的階層」重新 roll 新章節的 `chapterTotalLevels`（章節攻略完畢，切換到下一個設施主題）。`DEAD`/`DISCONNECT` 結算 SHALL NOT 異動 `nextChapterIndex` 或 `currentLevelIndex`。

#### Scenario: 章節內關卡推進（尚未到章節最後一關）
- **WHEN** 玩家在 Boss Stage 的戰鬥中獲勝，並從 RESOLUTION 呼叫 `POST /api/adventure/advance` 繼續前進，且此時 `currentLevelIndex + 1 < chapterTotalLevels`
- **THEN** run 進入 `ENDED`、`endReason = COMPLETED`，角色 `currentLevelIndex` 加 1，`nextChapterIndex` 與 `chapterTotalLevels` 維持不變，回應中附上本次結算摘要

#### Scenario: 章節推進（已攻略完章節最後一關）
- **WHEN** 玩家在 Boss Stage 的戰鬥中獲勝，並從 RESOLUTION 呼叫 `POST /api/adventure/advance` 繼續前進，且此時 `currentLevelIndex + 1 >= chapterTotalLevels`
- **THEN** run 進入 `ENDED`、`endReason = COMPLETED`，角色 `nextChapterIndex` 加 1、`currentLevelIndex` 重設為 0，系統重新 roll 新章節的 `chapterTotalLevels`，回應中附上本次結算摘要

#### Scenario: Boss 戰勝利且祝福點數已達門檻
- **WHEN** 玩家在 Boss Stage 的戰鬥中獲勝，且此時 `blessingPoints` 已達到 `BLESSING_POINTS_THRESHOLD`
- **THEN** 系統略過 BLESSING_SELECT，直接以 `endReason = COMPLETED` 結算該 run（並依上述規則判定關卡推進或章節推進）

#### Scenario: 死亡/斷線不切換關卡或設施主題
- **WHEN** run 以 `endReason = DEAD` 或 `DISCONNECT` 結算
- **THEN** 角色的 `nextChapterIndex`、`currentLevelIndex`、`chapterTotalLevels` 皆維持不變，玩家下次開始新 run 時沿用同一個章節、同一個關卡重新挑戰

### Requirement: Run 結算
系統 SHALL 於 run 結束時（`endReason` 為 `COMPLETED`/`DEAD`/`DISCONNECT` 之一）將本次遠征累積的 `expEarned` 計入角色 `exp`（依既有升級公式判斷是否升級、增加 `unspentAttributePoints`），不論結束原因為何皆 SHALL 生效。金幣/寶石/物品獎勵僅在 `endReason = COMPLETED` 時生效：將 `goldEarned`/`gemsEarned` 併入角色資源（並 clamp 於 [0,100000)）、將 run 背包內剩餘的物品（裝備與未使用的藥水）轉入永久背包（受 500 格上限限制）；`endReason` 為 `DEAD`/`DISCONNECT` 時，run 期間累積的金幣/寶石/物品 SHALL NOT 併入角色資源或永久背包（視為作廢），僅保留 `expEarned`。系統 SHALL 於結束時觸發排行榜更新（若破紀錄）與任務/成就的進度更新事件。系統 SHALL 產生本次結算的完整摘要（實際保留的金幣/寶石/物品清單/EXP/是否升級/新等級/新增可分配屬性點/無法轉入的物品清單，失敗時另附作廢的金幣/寶石/物品清單），寫入該 run 文件的 `settlement` 欄位，並在觸發這次結算的 API 回應中一併回傳一次。

#### Scenario: Stage 完成結算
- **WHEN** run 以 `endReason = COMPLETED` 結算（見「Stage 完成即結束 Run」）
- **THEN** 角色 `exp` 增加 `run.expEarned`、gold/gems 增加對應的 earned 數值，run 背包內物品轉入永久背包（未超過上限的部分），`POST /api/adventure/advance` 的回應附上完整結算摘要（含實際取得的物品清單）

#### Scenario: 死亡/斷線結算只保留 EXP
- **WHEN** run 以 `endReason = DEAD` 或 `DISCONNECT` 結算
- **THEN** 角色 `exp` 增加 `run.expEarned`，但角色的 gold/gems SHALL NOT 增加、run 背包內的物品 SHALL NOT 轉入永久背包（直接捨棄）；結算摘要的 `goldEarned`/`gemsEarned` 為 0、`items` 為空陣列，並附上 `forfeitedGold`/`forfeitedGems`/`forfeitedItems`（= 該次 run 實際累積但作廢的數量與物品清單）

#### Scenario: 永久背包已滿時的結算
- **WHEN** run 以 `endReason = COMPLETED` 結算時，永久背包已達 500 格上限，run 背包仍有未轉移的物品
- **THEN** 系統明確標記這些物品為無法轉入（不可靜默遺失也不可讓背包超過 500 格），並在結算摘要中告知玩家

#### Scenario: 升級時的結算摘要
- **WHEN** 本次結算計入 `exp` 後角色等級提升
- **THEN** 結算摘要的 `leveledUp = true`、`newLevel` 為提升後的等級、`unspentAttributePointsGained` 為新增的可分配屬性點數（不論 `endReason` 為何，升級判定皆一致生效）

### Requirement: 首頁開始/繼續冒險入口
系統 SHALL 讓玩家從首頁根據目前是否有進行中的 run，得到對應的操作入口：沒有進行中 run 時可開始新 run，有進行中 run 時可直接恢復；按鈕上方 SHALL 以小字顯示目前設施主題名稱與章節內關卡進度（`currentLevelIndex + 1` / `chapterTotalLevels`），CTA 按鈕本身文案 SHALL NOT 重複設施名稱。

#### Scenario: 首頁顯示「開始冒險」
- **WHEN** 玩家在首頁，且角色目前沒有進行中（state != ENDED）的 run
- **THEN** 按鈕上方小字顯示「{設施名稱} - {currentLevelIndex + 1}/{chapterTotalLevels}」（例如「廢棄維修廠 - 1/7」），CTA 顯示「開始冒險」，點擊呼叫 `POST /api/adventure/start` 並進入冒險畫面

#### Scenario: 首頁顯示「繼續冒險」
- **WHEN** 玩家在首頁，且角色已有一筆進行中的 run
- **THEN** 按鈕上方小字顯示「{設施名稱} - {currentLevelIndex + 1}/{chapterTotalLevels}」，CTA 顯示「繼續冒險」，點擊呼叫 `GET /api/adventure/current` 直接進入冒險畫面，不呼叫 `start`

### Requirement: 於休息節點使用藥水
系統 SHALL 僅允許在 Rest 節點對玩家持有的 POTION 物品實體（永久背包或 run 背包皆可）執行使用動作，依該實體的稀有度 `healPercent` 立即回復生命值（不超過 `playerHpMax`），並消耗（移除）該物品實體；戰鬥中不可使用。

#### Scenario: 使用永久背包內的藥水
- **WHEN** run.state 對應 Rest 節點，玩家指定永久背包內一個 `type=POTION` 的 itemId，呼叫 `POST /api/adventure/rest/heal`
- **THEN** run 的 `playerHp` 依該藥水 `healPercent` 增加（不超過 `playerHpMax`），該物品從永久背包移除

#### Scenario: 使用 run 背包內（本次冒險掉落）的藥水
- **WHEN** 玩家指定的 itemId 存在於 run 背包（本次戰鬥/事件掉落所得）
- **THEN** 系統同樣完成回復並將該物品從 run 背包移除

#### Scenario: 指定的物品不存在或非藥水
- **WHEN** 指定的 itemId 不屬於玩家（永久背包與 run 背包皆找不到），或找到但 `type != POTION`
- **THEN** 系統回傳 400，不異動 HP 或任何背包

#### Scenario: 非休息節點嘗試使用
- **WHEN** run.state 不是 Rest 節點
- **THEN** 系統回傳 400，不消耗物品
