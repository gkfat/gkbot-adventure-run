# weapon-attack-pattern

## Purpose

玩家攻擊的目標型態判定（單體/AoE/濺射）：由武器 template 各自定義的 `aoeChance`/`splashChance` 決定，雙持時取兩手武器機率的較高者；只影響玩家攻擊，敵人攻擊維持單體。

## Requirements

### Requirement: 武器範本定義 AoE 與濺射觸發機率
系統 SHALL 允許任一帶 `weaponType` 的 `ItemTemplate`（不限定裝備在 `LEFT_HAND` 或 `RIGHT_HAND`）各自定義 `aoeChance`（0～1，預設 0）與 `splashChance`（0～1，預設 0），兩者獨立設定、互不影響彼此數值；未定義時視為 0（維持現行單體攻擊行為）。這兩個欄位不是武器類型的固定屬性，同一 `weaponType` 底下的不同武器可以有不同的 `aoeChance`/`splashChance`。

#### Scenario: 未設定時預設單體攻擊
- **WHEN** 一個 `RIGHT_HAND` template 未定義 `aoeChance`/`splashChance`
- **THEN** 該武器的攻擊一律視為單體攻擊

#### Scenario: 同類型武器可以有不同機率
- **WHEN** 檢視兩把 `weaponType` 相同的武器 A（`aoeChance` 較高）與 B（`aoeChance` 為 0）
- **THEN** 兩者的 `aoeChance` 各自獨立，A 的攻擊比 B 更常觸發 AoE

### Requirement: 雙持時取兩手武器機率的較高者
系統 SHALL 在角色雙手皆裝備帶 `weaponType` 的武器時，取兩手武器 `aoeChance` 的較高者作為本次攻擊的 AoE 判定機率，`splashChance` 同理各自取較高者；兩者 SHALL NOT 相加。只有一手為武器時，直接使用該手武器的數值。

#### Scenario: 雙持時取較高機率
- **WHEN** 角色右手武器 `aoeChance = 0.1`、左手武器 `aoeChance = 0.3`
- **THEN** 本次攻擊的 AoE 判定機率為 0.3，不是兩者相加的 0.4

### Requirement: 攻擊目標型態依序判定
系統 SHALL 在玩家攻擊命中判定通過（未被閃避）後，依序判定目標型態：先以決定出的 `aoeChance`（見「雙持時取兩手武器機率的較高者」）判定是否觸發 AoE，若未觸發再以 `splashChance` 判定是否觸發濺射，兩者皆未觸發則為單體攻擊；AoE 與濺射 SHALL NOT 同時對同一次攻擊生效。

#### Scenario: AoE 優先於濺射判定
- **WHEN** 一把武器同時設定 `aoeChance` 與 `splashChance` 皆大於 0，且該次攻擊的 AoE 判定觸發
- **THEN** 該次攻擊執行 AoE 規則，不再判定濺射

#### Scenario: 都未觸發時為單體攻擊
- **WHEN** 該次攻擊的 AoE 與濺射判定皆未觸發
- **THEN** 該次攻擊只對原本的單一目標造成傷害，行為與現行機制一致

### Requirement: AoE 攻擊命中當前波次全部敵人
系統 SHALL 在 AoE 判定觸發時，對當前 wave 所有存活敵人各自計算一次傷害（各自使用玩家當前聚合 `atk`/`critChance` 等數值獨立判定爆擊），傷害不打折。

#### Scenario: AoE 命中全部存活敵人
- **WHEN** 當前 wave 有 3 隻存活敵人，玩家攻擊觸發 AoE
- **THEN** 這 3 隻敵人各自受到一次傷害計算，`combatLog` 記錄 3 筆對應的攻擊事件

### Requirement: 濺射攻擊命中主目標與次要目標，次要目標傷害打折
系統 SHALL 在濺射判定觸發時，對主目標（原單體攻擊的目標）造成全額傷害，並額外對最多 2 個次要目標（當前 wave 中主目標以外、依既有敵人順序排列的存活敵人）各造成 50% 傷害；次要目標 SHALL NOT 獨立判定爆擊，沿用主目標該次攻擊的爆擊結果。當前 wave 存活敵人不足 3 隻（主目標＋2 個次要目標）時，濺射只命中實際存在的敵人，不視為錯誤。

#### Scenario: 濺射命中主目標與 2 個次要目標
- **WHEN** 當前 wave 有 3 隻以上存活敵人，玩家攻擊觸發濺射
- **THEN** 主目標受到全額傷害，另外 2 個次要目標各受到 50% 傷害，三者的爆擊結果與主目標一致

#### Scenario: 敵人數量不足時濺射範圍縮小
- **WHEN** 當前 wave 只剩 2 隻存活敵人，玩家攻擊觸發濺射
- **THEN** 主目標受到全額傷害，剩下 1 隻敵人受到 50% 傷害，不因敵人數量不足而報錯或跳過此次攻擊

### Requirement: 敵人攻擊維持單體
系統 SHALL NOT 對敵人的攻擊套用 AoE/濺射邏輯；敵人攻擊玩家的目標判定行為與現行機制一致，維持單體攻擊。

#### Scenario: 敵人攻擊不受影響
- **WHEN** 敵人對玩家發動攻擊
- **THEN** 該次攻擊只計算玩家單一目標的傷害，不套用 AoE/濺射規則
