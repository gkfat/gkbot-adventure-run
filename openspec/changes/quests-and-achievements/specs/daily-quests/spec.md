## ADDED Requirements

### Requirement: 每日任務生成
系統 SHALL 於每角色每日（UTC+0 為日期邊界）生成恰好 3 個每日任務，且不允許 reroll。每日任務進度為角色獨立（換角色遊玩各自累計，不共用）。

#### Scenario: 當日首次查詢觸發生成
- **WHEN** 今天尚未有該角色的任務文件，玩家呼叫 `GET /api/character/{characterId}/quests/daily`
- **THEN** 系統生成當日 3 個任務並回傳，進度皆為 0

#### Scenario: 同一天重複查詢不重新生成
- **WHEN** 當日任務已存在，玩家再次查詢
- **THEN** 回傳既有任務與目前進度，不重置進度

#### Scenario: 查詢或領取他人角色的任務被拒
- **WHEN** 玩家對不屬於自己帳號的 `characterId` 呼叫任一任務 API
- **THEN** 系統回傳 404

### Requirement: 任務進度追蹤與領取
系統 SHALL 以計數器追蹤任務進度，達成目標後需玩家明確呼叫領取才發放獎勵（gold 10~50，不發放 gems）給該角色，每個任務僅可領取一次。

#### Scenario: 達成後成功領取
- **WHEN** 任務 `currentCount >= targetCount` 且尚未領取，玩家呼叫 `POST /api/character/{characterId}/quests/daily/claim/{questId}`
- **THEN** 系統將 gold/gems 獎勵發放到該角色，並標記 `claimed = true`

#### Scenario: 尚未達成無法領取
- **WHEN** 任務 `currentCount < targetCount`
- **AND** 玩家呼叫領取
- **THEN** 系統回傳 400，不發放獎勵

#### Scenario: 重複領取被拒
- **WHEN** 任務已 `claimed = true`
- **AND** 玩家再次呼叫領取
- **THEN** 系統回傳 409，且不重複發放獎勵
