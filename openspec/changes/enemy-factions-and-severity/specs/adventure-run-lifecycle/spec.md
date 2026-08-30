## ADDED Requirements

### Requirement: 遠征風險分級與敵對陣營決策
系統 SHALL 於 run 建立時（`createRun`），以決定性 RNG 決定該趟遠征的設施風險分級（`severityTier`：`DEEP_WRECK` / `PARTIAL_ACTIVE` / `HIGHLY_ACTIVE`）與敵對陣營（`factionType`：`GKBOT` / `HUMAN`），兩者於整趟 run 內（所有節點）保持不變。`severityTier` 的機率 SHALL 依角色的 `chapterIndex` 動態遞增（越高越容易抽到高分級）但設上限，`factionType = HUMAN` 的機率 SHALL 依 `severityTier` 加權，`severityTier` 越高機率越高。

#### Scenario: run 建立時決定分級與陣營
- **WHEN** 呼叫 `createRun` 建立一筆新的 run 文件
- **THEN** 系統以決定性 RNG roll 出本趟 run 的 `severityTier` 與 `factionType`，兩者在本 run 結束前不再改變

#### Scenario: 角色進度越後面越容易抽到高分級
- **WHEN** 兩個角色分別以較低與較高的 `chapterIndex` 建立新 run
- **THEN** 較高 `chapterIndex` 的角色抽到 `severityTier = HIGHLY_ACTIVE` 的機率不低於較低 `chapterIndex` 的角色，但機率有上限，兩者都仍有機會抽到任一分級

#### Scenario: 高分級提高人類陣營機率
- **WHEN** run 的 `severityTier = HIGHLY_ACTIVE`
- **THEN** 本趟 run `factionType = HUMAN` 的機率高於 `severityTier = DEEP_WRECK`/`PARTIAL_ACTIVE` 時的機率，且 `DEEP_WRECK` 分級下 `HUMAN` 機率仍大於 0

#### Scenario: 缺少歷史欄位時的容錯
- **WHEN** 讀取一個在本 change 上線前建立、沒有 `severityTier`/`factionType` 欄位的既有 run
- **THEN** 系統以 `PARTIAL_ACTIVE`/`GKBOT`（等同不調整的既有行為）作為預設值，不中斷該 run
