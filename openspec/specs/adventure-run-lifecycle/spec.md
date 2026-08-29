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

### Requirement: 節點生成優先序
系統 SHALL 依序決定下一節點：距上次 Rest 節點 >= 4 step 時強制為 Rest（保底）；否則 `step % 9 == 0` 為 Strong Elite、`step % 5 == 0` 為 Elite；否則依權重隨機決定 combat/event/rest/choice。保底與固定節奏同時觸發時，保底 Rest 優先。

#### Scenario: 保底 Rest 觸發
- **WHEN** 距上次 Rest 已經過 4 個 step，且本次同時符合 `step % 5 == 0`
- **THEN** 下一節點為 Rest（保底優先於精英節奏）

#### Scenario: 固定精英節奏
- **WHEN** 未觸發保底，且 `step % 9 == 0`
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

### Requirement: Run 結算
系統 SHALL 於 run 結束時：將 `earnedGold`/`earnedGems` 併入角色資源（並 clamp 於 [0,100000)）、將 run 背包內剩餘的物品（裝備與未使用的藥水）轉入永久背包（受 500 格上限限制）、觸發排行榜更新（若破紀錄）與任務/成就的進度更新事件。

#### Scenario: 死亡結算
- **WHEN** 角色 HP <= 0
- **THEN** run 進入 ENDED、`endReason = DEAD`，角色 gold/gems 增加對應的 earned 數值，run 背包內物品轉入永久背包（未超過上限的部分）

#### Scenario: 永久背包已滿時的結算
- **WHEN** run 結束時，永久背包已達 500 格上限，run 背包仍有未轉移的物品
- **THEN** 系統明確標記這些物品為無法轉入（不可靜默遺失也不可讓背包超過 500 格），並在結算回應中告知玩家

### Requirement: 首頁開始/繼續冒險入口
系統 SHALL 讓玩家從首頁根據目前是否有進行中的 run，得到對應的操作入口：沒有進行中 run 時可開始新 run，有進行中 run 時可直接恢復。

#### Scenario: 首頁顯示「開始冒險」
- **WHEN** 玩家在首頁，且角色目前沒有進行中（state != ENDED）的 run
- **THEN** CTA 顯示「開始冒險」，點擊呼叫 `POST /api/adventure/start` 並進入冒險畫面

#### Scenario: 首頁顯示「繼續冒險」
- **WHEN** 玩家在首頁，且角色已有一筆進行中的 run
- **THEN** CTA 顯示「繼續冒險（第 N 關）」（N 為目前 step），點擊呼叫 `GET /api/adventure/current` 直接進入冒險畫面，不呼叫 `start`

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
