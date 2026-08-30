## ADDED Requirements

### Requirement: 祝福點數累積與選擇
系統 SHALL 依 combat-engine 已實作的規則累積 `blessingPoints`（每場戰鬥勝利依節點 tier 給予固定點數），達 adventure-run-core 已定義的門檻時觸發 BLESSING_SELECT 狀態並提供 3 選 1 候選，候選稀有度/品質受角色 LUCK 影響；選擇後的 Blessing 僅在本次 run 有效。

#### Scenario: 累積達門檻觸發選擇
- **WHEN** run 的 `blessingPoints` 累積達到門檻
- **THEN** run 狀態轉為 BLESSING_SELECT，回傳 3 個候選 Blessing

#### Scenario: 選擇後生效且歸零累積
- **WHEN** 玩家呼叫 `POST /api/adventure/blessing/select` 選擇其中一個候選
- **THEN** 該 Blessing 加入 run 的生效中 RunModifier 清單，`blessingPoints` 歸零重新累積

#### Scenario: 選擇不存在的候選
- **WHEN** 玩家送出的 `blessingId` 不在本次候選清單中
- **THEN** 系統回傳 400，不修改 run 狀態

### Requirement: Blessing/Curse 僅限本次 run 有效
系統 SHALL 確保所有 Blessing 與 Curse 效果在 run 結束（ENDED）時全部失效，不得影響下一次 run。

#### Scenario: Run 結束後 modifier 清空
- **WHEN** 一個 run 進入 ENDED
- **THEN** 該 run 的所有生效中 RunModifier 不會被帶到玩家下一次開始的新 run
