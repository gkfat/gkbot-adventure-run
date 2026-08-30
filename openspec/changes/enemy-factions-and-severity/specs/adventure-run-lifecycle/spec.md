## ADDED Requirements

### Requirement: 章節風險分級與敵對陣營決策
系統 SHALL 於每個章節開始時（進入新章節的第一個 Stage），以決定性 RNG 決定該章節的設施風險分級（`severityTier`：`DEEP_WRECK` / `PARTIAL_ACTIVE` / `HIGHLY_ACTIVE`）與敵對陣營（`factionType`：`GKBOT` / `HUMAN`），兩者於整個章節內（所有 Stage、所有節點）保持不變；`factionType = HUMAN` 的機率 SHALL 依 `severityTier` 加權，`severityTier` 越高機率越高。

#### Scenario: 章節開始時決定分級與陣營
- **WHEN** 一個新章節開始（前一章節最後一關的 Boss 結算完成，或 run 剛建立的第一個章節）
- **THEN** 系統以決定性 RNG roll 出本章節的 `severityTier` 與 `factionType`，兩者在本章節結束前不再改變

#### Scenario: 高分級提高人類陣營機率
- **WHEN** 章節的 `severityTier = HIGHLY_ACTIVE`
- **THEN** 本章節 `factionType = HUMAN` 的機率高於 `severityTier = DEEP_WRECK`/`PARTIAL_ACTIVE` 時的機率

#### Scenario: 缺少歷史欄位時的容錯
- **WHEN** 讀取一個在本 change 上線前建立、沒有 `chapterSeverityTier`/`chapterFactionType` 欄位的既有 run
- **THEN** 系統以 `PARTIAL_ACTIVE`/`GKBOT`（等同不調整的既有行為）作為預設值，不中斷該 run
