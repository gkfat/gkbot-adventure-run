## ADDED Requirements

### Requirement: 隨機事件解決
系統 SHALL 於進入 EVENT 節點時，依權重表以決定性 RNG 選出一個事件模板；若事件帶有 choices，系統 SHALL 等待玩家選擇後才依該 choice 的 cost/reward/risk 計算結果，否則直接套用結果。

#### Scenario: 無選項事件直接套用
- **WHEN** 選中的事件模板沒有 choices（例如單純補血事件）
- **THEN** 系統立即計算結果（例如回復 HP）並進入 RESOLUTION

#### Scenario: 帶選項事件等待玩家選擇
- **WHEN** 選中的事件模板有 2 個 choices
- **THEN** `POST /api/adventure/event/resolve` 需要 `choiceIndex` 參數；缺少或不存在的 choiceIndex 回傳 400

### Requirement: 事件轉盤
系統 SHALL 支援轉盤類型的事件結果，可依既定機率發放物品、gems（3% 機率 1~5 顆）或金幣。

#### Scenario: 轉盤命中 gems
- **WHEN** 玩家觸發轉盤，且本次 RNG 判定命中 gems 掉落
- **THEN** 系統依 1~5 的範圍 roll 出 gems 數量並加進 run 的 earnedGems
