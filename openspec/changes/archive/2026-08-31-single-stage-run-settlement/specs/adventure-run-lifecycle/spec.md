## ADDED Requirements

### Requirement: Stage 完成即結束 Run
系統 SHALL 在玩家於 Boss 節點的戰鬥中獲勝、並從其 RESOLUTION（或因祝福點數達門檻而經過的 BLESSING_SELECT）繼續前進時，立即以 `endReason = COMPLETED` 結算並結束該 run，不再推進到下一個 Stage 或 Chapter；即使此時 `blessingPoints` 已達到觸發 BLESSING_SELECT 的門檻，也 SHALL 略過祝福選擇，直接結算。結算時 SHALL 將角色的 `nextChapterIndex` 加 1（決定下次遠征使用的裂域設施主題）；`DEAD`/`DISCONNECT` 結算 SHALL NOT 異動 `nextChapterIndex`。

#### Scenario: Boss 戰勝利後直接結算
- **WHEN** 玩家在 Boss 節點的戰鬥中獲勝，並從 RESOLUTION 呼叫 `POST /api/adventure/advance` 繼續前進
- **THEN** run 進入 `ENDED`、`endReason = COMPLETED`，角色 `nextChapterIndex` 加 1，回應中附上本次結算摘要

#### Scenario: Boss 戰勝利且祝福點數已達門檻
- **WHEN** 玩家在 Boss 節點的戰鬥中獲勝，且此時 `blessingPoints` 已達到 `BLESSING_POINTS_THRESHOLD`
- **THEN** 系統略過 BLESSING_SELECT，直接以 `endReason = COMPLETED` 結算該 run

#### Scenario: 死亡/斷線不切換設施主題
- **WHEN** run 以 `endReason = DEAD` 或 `DISCONNECT` 結算
- **THEN** 角色的 `nextChapterIndex` 維持不變，玩家下次開始新 run 時沿用同一個設施主題

## MODIFIED Requirements

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
系統 SHALL 讓玩家從首頁根據目前是否有進行中的 run，得到對應的操作入口：沒有進行中 run 時可開始新 run，有進行中 run 時可直接恢復，且 CTA 文案 SHALL 呈現目前設施主題名稱（不含章節內關卡序號，因單 Stage 制下該序號恆為 1）。

#### Scenario: 首頁顯示「開始冒險」
- **WHEN** 玩家在首頁，且角色目前沒有進行中（state != ENDED）的 run
- **THEN** CTA 顯示「開始冒險」，點擊呼叫 `POST /api/adventure/start` 並進入冒險畫面

#### Scenario: 首頁顯示「繼續冒險」
- **WHEN** 玩家在首頁，且角色已有一筆進行中的 run
- **THEN** CTA 顯示「繼續冒險（{設施名稱}）」（例如「繼續冒險（廢棄研究所）」），點擊呼叫 `GET /api/adventure/current` 直接進入冒險畫面，不呼叫 `start`
