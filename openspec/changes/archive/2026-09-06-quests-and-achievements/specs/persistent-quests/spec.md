## ADDED Requirements

### Requirement: 常駐任務生成
系統 SHALL 為每個角色懶建立一組常駐任務（每個常駐任務模板各一份），不重置、不設有效期限。常駐任務進度為角色獨立（換角色遊玩各自累計，不共用）。

#### Scenario: 首次查詢觸發建立
- **WHEN** 該角色尚未有任一常駐任務文件，玩家呼叫 `GET /api/character/{characterId}/quests/persistent`
- **THEN** 系統為每個常駐任務模板建立一份文件（`currentCount = 0`、`claimed = false`）並回傳

#### Scenario: 重複查詢不重新建立
- **WHEN** 該角色的常駐任務文件已存在
- **AND** 玩家再次查詢
- **THEN** 回傳既有文件與目前進度，不重置進度

#### Scenario: 查詢或領取他人角色的常駐任務被拒
- **WHEN** 玩家對不屬於自己帳號的 `characterId` 呼叫任一常駐任務 API
- **THEN** 系統回傳 404

### Requirement: 常駐任務進度追蹤與終身限領一次
系統 SHALL 以計數器追蹤常駐任務進度，達成目標後需玩家明確呼叫領取才發放獎勵（以 gold 為主，gems 僅高門檻項目少量發放，0~2）給該角色；每個常駐任務該角色終身最多可領取一次。

#### Scenario: 達成後成功領取
- **WHEN** 常駐任務 `currentCount >= targetCount` 且尚未領取，玩家呼叫 `POST /api/character/{characterId}/quests/persistent/claim/{questId}`
- **THEN** 系統將 gold/gems 獎勵發放到該角色，並標記 `claimed = true`

#### Scenario: 尚未達成無法領取
- **WHEN** 常駐任務 `currentCount < targetCount`
- **AND** 玩家呼叫領取
- **THEN** 系統回傳 400，不發放獎勵

#### Scenario: 重複領取被拒
- **WHEN** 常駐任務已 `claimed = true`
- **AND** 玩家再次呼叫領取
- **THEN** 系統回傳 409，且不重複發放獎勵
