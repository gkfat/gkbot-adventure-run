## ADDED Requirements

### Requirement: 章節/關卡結構與 Boss 節點
系統 SHALL 將 run 的節點流分層為「章節（Chapter，對應一次造訪的裂域設施實例）→ 關卡（Stage，10~20 個節點）→ 節點」。每個章節開始時 SHALL 以決定性 RNG 決定該章節的關卡數量（該設施的複雜度）；每個 Stage 開始時 SHALL 以決定性 RNG 決定該 Stage 的節點總數（10~20 之間，含頭尾）；每個 Stage 的最後一個節點 SHALL 固定為 BOSS combat。當一個章節的最後一個關卡的 Boss 被擊敗後，SHALL 進入下一章節並依序循環裂域設施主題清單（見 `docs/worldview.md` 第 2 節，清單可持續擴充）；否則 SHALL 在同一章節內推進下一關。

#### Scenario: 章節開始時決定關卡數量
- **WHEN** 一個新章節開始（前一章節最後一關的 Boss 結算完成、進入下一個 EXPLORING）
- **THEN** 系統以決定性 RNG roll 出本章節的關卡總數，並將章節內關卡序號歸零

#### Scenario: Stage 開始時決定節點總數
- **WHEN** 一個新 Stage 開始（前一 Stage 的 Boss 結算完成，或章節剛開始的第一個 Stage）
- **THEN** 系統以決定性 RNG roll 出本 Stage 的節點總數（10~20 之間），並將 Stage 內節點序號歸零

#### Scenario: Stage 最後一個節點固定為 Boss
- **WHEN** 目前 Stage 內節點序號等於「本 Stage 節點總數 - 1」
- **THEN** 下一節點固定為 BOSS combat，不受保底 Rest 或加權隨機影響

#### Scenario: Boss 戰勝利後在章節內推進下一關
- **WHEN** 玩家在 Boss 節點的戰鬥中獲勝並從 RESOLUTION 繼續前進，且目前關卡不是本章節的最後一關
- **THEN** 章節內關卡序號加 1，章節序號不變，並依「Stage 開始時決定節點總數」場景重新開始下一關

#### Scenario: Boss 戰勝利後結束章節
- **WHEN** 玩家在 Boss 節點的戰鬥中獲勝並從 RESOLUTION 繼續前進，且目前關卡是本章節的最後一關
- **THEN** 章節序號加 1、切換到下一個設施主題、章節內關卡序號歸零，並依「章節開始時決定關卡數量」與「Stage 開始時決定節點總數」場景重新開始新章節的第一關

#### Scenario: 章節依序循環設施主題
- **WHEN** 章節序號超過裂域設施主題清單的長度
- **THEN** 依序循環回清單第一個設施主題繼續使用（例如清單有 8 種主題時，第 9 個章節沿用第 1 個章節的設施主題）

## MODIFIED Requirements

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

### Requirement: 首頁開始/繼續冒險入口
系統 SHALL 讓玩家從首頁根據目前是否有進行中的 run，得到對應的操作入口：沒有進行中 run 時可開始新 run，有進行中 run 時可直接恢復，且 CTA 文案 SHALL 呈現關卡名稱（設施名稱＋章節內關卡序號）而非原始的 step 計數。

#### Scenario: 首頁顯示「開始冒險」
- **WHEN** 玩家在首頁，且角色目前沒有進行中（state != ENDED）的 run
- **THEN** CTA 顯示「開始冒險」，點擊呼叫 `POST /api/adventure/start` 並進入冒險畫面

#### Scenario: 首頁顯示「繼續冒險」
- **WHEN** 玩家在首頁，且角色已有一筆進行中的 run
- **THEN** CTA 顯示「繼續冒險（{設施名稱}-{章節內關卡序號}）」（例如「繼續冒險（廢棄研究所-3）」），點擊呼叫 `GET /api/adventure/current` 直接進入冒險畫面，不呼叫 `start`
