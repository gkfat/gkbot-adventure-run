## ADDED Requirements

### Requirement: 成就進度追蹤與限領一次
系統 SHALL 維護常駐成就集合，每個成就每帳號最多可領取一次，達成後需玩家明確領取，發放 gems 3~5。

#### Scenario: 查詢成就清單
- **WHEN** 玩家呼叫 `GET /api/achievements`
- **THEN** 回傳所有成就模板對應的進度與領取狀態（含尚未達成者）

#### Scenario: 達成後成功領取
- **WHEN** 成就 `currentCount >= targetCount` 且尚未領取，玩家呼叫 `POST /api/achievements/claim/{achievementId}`
- **THEN** 系統發放該成就的 gems 獎勵並標記 `claimed = true`

#### Scenario: 尚未達成無法領取
- **WHEN** 成就尚未達成
- **AND** 玩家呼叫領取
- **THEN** 系統回傳 400

#### Scenario: 重複領取被拒
- **WHEN** 成就已領取過
- **AND** 玩家再次呼叫領取
- **THEN** 系統回傳 409，且不重複發放 gems
