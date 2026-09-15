# deterministic-rng

## Purpose

決定性亂數服務，作為冒險 run 內所有隨機性（節點生成、戰鬥、事件）的唯一來源，供 `adventure-run-core` 及未來的 `combat-engine`/`events-and-blessings` 共用。系統維護兩條獨立的 RNG 串流（見「雙 RNG 串流」需求）：`seed`+`rngIndex`（結構流，同角色同關卡重試不變）與 `runId`+`rewardRngIndex`（獎勵流，每次重進都不同）。

## Requirements

### Requirement: 決定性 RNG 消耗
系統 SHALL 以 `random(seed, rngIndex)` 作為 run 內「結構性」隨機性（節點類型序列、敵人選擇）的唯一來源；每次消耗後 `rngIndex` SHALL 立即遞增並持久化，不得重複消耗同一 index，且 client SHALL NOT 能取得 seed 或預知未來的 RNG 結果。

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

### Requirement: 雙 RNG 串流 — 結構流與獎勵流分離
系統 SHALL 維護第二條獨立的 RNG 串流：以 `random(runId, rewardRngIndex)` 為來源（`RngService.nextReward`/`AdventureRunRepository.consumeRewardRng`），`runId` 為 Firestore 自動產生的文件 ID，每次建立新 run（含同角色重試同關卡）皆不同。此獎勵流 SHALL 是戰鬥掉落（金幣、寶石、裝備掉落）與事件/祝福內容（詛咒、轉盤、選擇事件結果、祝福候選）的唯一隨機來源；節點類型序列（`decideNextNode`）與敵人選擇（archetype/波數/數量）SHALL 繼續僅使用結構流（`seed`+`rngIndex`），不得改用獎勵流 —— 否則會讓玩家能透過反覆重進同一關卡洗出較簡單的節點/敵人序列（見 known-issue.md #8）。

#### Scenario: 同角色重試同關卡，掉落物不同、敵人相同
- **WHEN** 角色在同一 `chapterIndex`/`levelIndex` 死亡後重試，兩次 run 的 `seed` 相同但 `runId` 不同
- **THEN** 兩次 run 的節點序列與同一戰鬥節點的敵人（archetype）完全相同；同一場戰鬥的掉落物（金幣/寶石/裝備）在統計上不保證相同

#### Scenario: 同角色重試同關卡，事件內容不同
- **WHEN** 角色在同一 `chapterIndex`/`levelIndex` 死亡後重試並抵達同一個 EVENT 節點
- **THEN** 該事件節點選中的模板（詛咒/轉盤/選擇/祝福內容）不保證與前次相同

#### Scenario: 獎勵流的消耗與持久化
- **WHEN** `RngService.nextReward(runId)` 被呼叫，當前 `rewardRngIndex = 7`
- **THEN** 回傳依 `random(runId, 7)` 算出的值，且 `adventureRuns/{runId}.rewardRngIndex` 更新為 8；戰鬥内多次掉落 roll SHALL 透過 in-memory cursor（`createCursor(runId, rewardRngIndex)`）批次消耗，並在戰鬥結算的同一次 checkpoint 寫入中持久化最終 index
