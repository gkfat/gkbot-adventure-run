## MODIFIED Requirements

### Requirement: 傷害與命中判定公式
系統 SHALL 以 `damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)` 計算傷害；crit 機率以 `base + AGI * 係數` 計算並 clamp 至上限 35%；dodge 機率以 `base + AGI * 係數 + 裝備 dodgeChanceMod 加總` 計算並 clamp 至區間 [0%, 25%]，其中每件 `HEAVY` 分類裝備的 `dodgeChanceMod` 在加總前先依角色 `STR`+`CON` 套用負重折扣（見 `weapon-weight-class` capability「負重能力抑制 HEAVY 懲罰」）。

#### Scenario: 一般攻擊傷害下限
- **WHEN** 攻擊方 ATK 小於等於防禦方 DEF
- **THEN** 造成的傷害固定為 1（不會是 0 或負數）

#### Scenario: 暴擊傷害加成
- **WHEN** 本次攻擊判定為 crit
- **THEN** 實際傷害為基礎傷害乘上 `critMultiplier`

#### Scenario: 閃避使攻擊落空
- **WHEN** 防禦方判定閃避成功
- **THEN** 該次攻擊造成 0 傷害，combatLog 記錄為 DODGE 事件

#### Scenario: 裝備 dodgeChanceMod 影響閃避機率
- **WHEN** 角色裝備一件 `dodgeChanceMod` 為負值（HEAVY 分類懲罰）的道具
- **THEN** 該角色的 `dodgeChance` 相較未裝備時降低，但仍 clamp 在 [0%, 25%] 範圍內，不會因加總結果為負值而低於 0%

#### Scenario: STR+CON 負重折扣降低 dodgeChanceMod 懲罰
- **WHEN** 角色裝備一件 `HEAVY` 分類道具（`dodgeChanceMod` 為負值），且該角色 `STR`+`CON` 大於 0
- **THEN** 實際套用到 `dodgeChance` 加總的 `dodgeChanceMod` 幅度（絕對值）小於該道具未經負重折扣的原始 `dodgeChanceMod`

#### Scenario: 未裝備 HAND 類道具時行為不變
- **WHEN** 角色未裝備任何帶 `dodgeChanceMod` 的道具
- **THEN** `dodgeChance` 計算結果與現行「僅由 AGI 決定」的行為完全一致
