# achievements

## Purpose

TBD — 常駐成就集合，每個成就每角色終身最多可領取一次，達成後需玩家明確領取以發放 gems 獎勵；成就進度與領取狀態皆為角色獨立。

## Requirements

### Requirement: 成就進度追蹤與限領一次
系統 SHALL 維護常駐成就集合，每個成就每角色終身最多可領取一次（換角色遊玩各自獨立達成與領取），達成後需玩家明確領取，發放 gems 3~10（依難度分級） 給該角色。

#### Scenario: 查詢成就清單
- **WHEN** 玩家呼叫 `GET /api/character/{characterId}/achievements`
- **THEN** 回傳所有成就模板對應的進度與領取狀態（含尚未達成者）

#### Scenario: 達成後成功領取
- **WHEN** 成就 `currentCount >= targetCount` 且尚未領取，玩家呼叫 `POST /api/character/{characterId}/achievements/claim/{achievementId}`
- **THEN** 系統將 gems 獎勵發放到該角色並標記 `claimed = true`

#### Scenario: 尚未達成無法領取
- **WHEN** 成就尚未達成
- **AND** 玩家呼叫領取
- **THEN** 系統回傳 400

#### Scenario: 重複領取被拒
- **WHEN** 成就已領取過
- **AND** 玩家再次呼叫領取
- **THEN** 系統回傳 409，且不重複發放 gems

#### Scenario: 查詢或領取他人角色的成就被拒
- **WHEN** 玩家對不屬於自己帳號的 `characterId` 呼叫任一成就 API
- **THEN** 系統回傳 404
