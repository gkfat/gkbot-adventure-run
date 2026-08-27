## ADDED Requirements

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
