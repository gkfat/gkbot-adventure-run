# deterministic-rng

## Purpose

seed+rngIndex 的決定性亂數服務，作為冒險 run 內所有隨機性（節點生成、戰鬥、事件）的唯一來源，供 `adventure-run-core` 及未來的 `combat-engine`/`events-and-blessings` 共用。

## Requirements

### Requirement: 決定性 RNG 消耗
系統 SHALL 以 `random(seed, rngIndex)` 作為 run 內所有隨機性的唯一來源；每次消耗後 `rngIndex` SHALL 立即遞增並持久化，不得重複消耗同一 index，且 client SHALL NOT 能取得 seed 或預知未來的 RNG 結果。

#### Scenario: 消耗後 index 遞增
- **WHEN** `RngService.next(runId)` 被呼叫，當前 `rngIndex = 5`
- **THEN** 回傳依 `random(seed, 5)` 算出的值，且 `adventureRuns/{runId}.rngIndex` 更新為 6

#### Scenario: 同一 index 不重複消耗
- **WHEN** 兩次呼叫 `RngService.next(runId)`
- **THEN** 兩次分別對應 `rngIndex = 5` 與 `rngIndex = 6`，不會有兩次呼叫拿到相同的 rngIndex

#### Scenario: seed 不透過 API 回應暴露
- **WHEN** client 呼叫任何冒險相關 API
- **THEN** 回應內容不包含該 run 的 `seed` 欄位

### Requirement: Seed 依角色、章節、關卡三者決定
系統 SHALL 以 `characterId`、`chapterIndex`、`levelIndex` 三者組成 run 的 seed（`${characterId}:${chapterIndex}:${levelIndex}`），使同一角色重複進入同一章節的同一關卡（DEAD/DISCONNECT 重試）時 seed 不變、節點/敵人序列完全相同，而同一章節內不同關卡的 seed 不同，節點數量與序列不會重複。

#### Scenario: 同章節同關卡重試得到相同流程
- **WHEN** 角色在 `chapterIndex=2`、`levelIndex=1` 建立 run 後死亡，接著再次以相同 `chapterIndex`/`levelIndex` 建立新 run
- **THEN** 兩次 run 的 seed 相同，`stageNodeCount`、`severityTier`、`factionType` 及後續節點序列完全一致

#### Scenario: 同章節不同關卡得到不同流程
- **WHEN** 角色在 `chapterIndex=2`、`levelIndex=0` 與 `chapterIndex=2`、`levelIndex=1` 分別建立 run
- **THEN** 兩次 run 的 seed 不同，`stageNodeCount`、`severityTier`、`factionType` 及節點序列不保證相同
