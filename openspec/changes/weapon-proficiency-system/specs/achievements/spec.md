## ADDED Requirements

### Requirement: 任一武器類型達到 Lv.5 的共用里程碑成就
系統 SHALL 提供 `WEAPON_PROFICIENCY_LEVEL` 成就類型（PEAK 模式，`compare: GTE`）：角色任一 `weaponType` 的熟練度等級提升時，以提升後的等級作為本次回報的 peak 值；成就在角色曾經讓**任一**武器類型的等級達到 `targetCount` 時視為達成，不要求同時維持在該等級。`dualWieldProficiency` 的升級 SHALL NOT 回報到這個成就類型（雙持有自己獨立的成就，見下）。系統 SHALL 提供對應成就範本 `weapon_apprentice`（`targetCount = 5`）。

#### Scenario: 任一武器類型達到 Lv.5 即達成「熟能生巧」
- **WHEN** 角色的 `BLADE` 熟練度首次升到 Lv.5
- **THEN** `weapon_apprentice` 成就的進度視為達成，可供玩家領取

#### Scenario: 雙持升級不影響此成就
- **WHEN** 角色的 `dualWieldProficiency` 升到 Lv.5，但 5 個 `weaponType` 皆未達到 Lv.5
- **THEN** `weapon_apprentice` 成就仍未達成

#### Scenario: 不要求同時維持在目標等級
- **WHEN** 角色 `BLADE` 熟練度曾達到 Lv.5（`weapon_apprentice` 已達成過，尚未領取）
- **THEN** 即使之後查詢時角色改裝備其他武器類型，`weapon_apprentice` 的達成狀態不受影響（PEAK 模式一旦達標即永久視為達成，比照 `MAX_SCORE`/`CHARACTER_LEVEL` 既有行為）

### Requirement: 每個武器類型與雙持各自獨立的 Lv.10 精通成就
系統 SHALL 為 5 個 `weaponType` 與 `dualWieldProficiency` 各自提供一個獨立的 `AchievementType`（PEAK 模式，`compare: GTE`，`targetCount = 10`）：`WEAPON_MASTERY_FIST`/`WEAPON_MASTERY_BLADE`/`WEAPON_MASTERY_BLUNT`/`WEAPON_MASTERY_POLEARM`/`WEAPON_MASTERY_RANGED`/`WEAPON_MASTERY_DUAL_WIELD`，每個類型只回報對應維度自己的等級提升，不與其他維度混合計算。系統 SHALL 提供對應成就範本：`fist_mastery`、`blade_mastery`、`blunt_mastery`、`polearm_mastery`、`ranged_mastery`、`dual_wield_mastery`，皆各自獨立達成/領取。

#### Scenario: 各類型獨立達成，互不影響
- **WHEN** 角色 `BLADE` 熟練度達到 Lv.10，但 `FIST`/`BLUNT`/`POLEARM`/`RANGED`/`dualWieldProficiency` 皆未達到 Lv.10
- **THEN** 只有 `blade_mastery` 成就達成，其餘 5 個成就（`fist_mastery`/`blunt_mastery`/`polearm_mastery`/`ranged_mastery`/`dual_wield_mastery`）皆未達成

#### Scenario: 雙持精通是獨立成就，不算在武器類型精通內
- **WHEN** 角色 `dualWieldProficiency` 達到 Lv.10
- **THEN** `dual_wield_mastery` 成就達成，不影響任何 `weaponType` 的精通成就達成狀態

#### Scenario: 六個成就可以分別各自領取
- **WHEN** 角色的 6 個維度（5 個 `weaponType` + 雙持）皆已達到 Lv.10
- **THEN** 玩家可以分別呼叫 6 次領取端點，各自獲得一次 gems 獎勵

### Requirement: 五種武器類型全數精通成就
系統 SHALL 提供 `WEAPON_TYPES_MASTERED` 成就類型（CUMULATIVE 模式）：角色某個 `weaponType`（不含 `dualWieldProficiency`）的熟練度等級**首次**達到 Lv.10（Mastery）時，累計進度 +1（同一類型重複達到或維持 Lv.10 不重複計算，比照 `DISCOVER_FACILITIES` 的去重寫法）；系統 SHALL 提供對應成就範本 `pentagonal_mastery`，`targetCount` 等於 `WeaponType` 的全部種類數（5），不將 `dualWieldProficiency` 計入這個集齊計算。

#### Scenario: 集齊全部武器類型的 Mastery
- **WHEN** 角色的 `FIST`/`BLADE`/`BLUNT`/`POLEARM`/`RANGED` 五個武器類型皆已至少一次達到 Lv.10
- **THEN** `pentagonal_mastery` 成就的進度為 5，視為達成

#### Scenario: 雙持精通不計入集齊進度
- **WHEN** 角色 `dualWieldProficiency` 達到 Lv.10，但只有 3 個 `weaponType` 達到 Lv.10
- **THEN** `pentagonal_mastery` 的進度為 3，不因雙持精通而額外 +1

#### Scenario: 同一類型重複達到 Lv.10 不重複累計
- **WHEN** 角色 `BLADE` 熟練度已經達到過 Lv.10（已計入 `WEAPON_TYPES_MASTERED` 進度），其熟練度資料不會再下降或重置
- **THEN** 不存在「同一類型再次觸發 Lv.10」而重複累計進度的情境
