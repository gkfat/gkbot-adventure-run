## ADDED Requirements

### Requirement: 對話氣泡依觸發類型與主體身份挑選台詞
系統 SHALL 依觸發類型（`ENCOUNTER`/`ATTACK`/`CRIT`/`HIT_TAKEN`/`DODGE`/`DEFEATED`/`VICTORY`/`HEAL`/`BLESSING`/`CURSE`/`WHEEL`/`CHOICE`）與主體身份（玩家的 `CharacterArchetype.archetypeId`，或敵人的 `EnemyArchetype.slug`）挑選對應台詞：若該身份對該觸發類型有專屬台詞，SHALL 從中挑選；若無專屬台詞，SHALL fallback 至該身份所屬陣營（玩家 / 敵人依 `EnemyFaction`）的通用台詞池；若通用池對該觸發類型仍無台詞，SHALL NOT 顯示氣泡。

#### Scenario: 有專屬台詞時優先使用
- **WHEN** 某玩家角色的 `archetypeId` 對 `CRIT` 觸發類型有專屬台詞
- **THEN** 對話氣泡從該專屬台詞清單中挑選顯示，不使用通用池

#### Scenario: 無專屬台詞時 fallback 至通用池
- **WHEN** 某敵人 `EnemyArchetype.slug` 對 `DODGE` 觸發類型沒有專屬台詞，但其陣營通用池對 `DODGE` 有台詞
- **THEN** 對話氣泡從該陣營通用池挑選顯示

#### Scenario: 專屬與通用池皆無台詞則不顯示
- **WHEN** 某觸發類型在該身份的專屬台詞與其陣營通用池中皆無任何台詞
- **THEN** 系統不顯示對話氣泡，不得顯示空氣泡或報錯

### Requirement: 同一台詞清單內隨機挑選且避免連續重複
系統 SHALL 在同一觸發類型對應多句台詞時隨機挑選一句；同一主體同一觸發類型連續兩次觸發時，若清單長度大於 1，SHALL 避免連續兩次挑到同一句。

#### Scenario: 清單僅一句時允許重複
- **WHEN** 某觸發類型對應的台詞清單只有 1 句
- **THEN** 每次觸發皆顯示該句，不視為違反防重複規則

#### Scenario: 清單多句時避免連續重複
- **WHEN** 某觸發類型對應的台詞清單有多句，且上一次該主體同觸發類型顯示的是清單中第 N 句
- **THEN** 本次挑選結果不得為第 N 句

### Requirement: 同一主體同時最多顯示一則氣泡
系統 SHALL 保證同一主體（玩家或某一敵人）任一時刻最多顯示一則對話氣泡；新觸發的氣泡 SHALL 直接取代該主體既有顯示中的氣泡，不排隊、不堆疊顯示。

#### Scenario: 新氣泡取代舊氣泡
- **WHEN** 某敵人正在顯示氣泡尚未淡出，且該敵人被新的觸發類型觸發
- **THEN** 舊氣泡立即被新氣泡取代顯示，不會同時出現兩則氣泡

### Requirement: 氣泡固定時長後自動淡出
系統 SHALL 讓每則對話氣泡在顯示固定時長後自動淡出消失，不需使用者互動關閉。

#### Scenario: 氣泡逾時自動消失
- **WHEN** 一則對話氣泡顯示達到其固定顯示時長，且期間未被新氣泡取代
- **THEN** 該氣泡自動淡出並從畫面移除

### Requirement: 一般攻擊命中的對話氣泡採機率顯示，其餘觸發一律顯示
系統 SHALL 對 `ATTACK` 觸發類型套用顯示機率（非每次命中都顯示對話氣泡），對其餘觸發類型（`ENCOUNTER`/`CRIT`/`HIT_TAKEN`/`DODGE`/`DEFEATED`/`VICTORY`/`HEAL`/`BLESSING`/`CURSE`/`WHEEL`/`CHOICE`）不得套用顯示機率節流，只要有可用台詞即顯示。

#### Scenario: 一般攻擊未中選機率則不顯示氣泡
- **WHEN** 某次 `ATTACK` 觸發的機率判定未命中顯示
- **THEN** 該次攻擊不顯示對話氣泡，但不影響該次攻擊其餘既有演出（傷害飄字等）

#### Scenario: 爆擊一律顯示氣泡
- **WHEN** 某次觸發類型為 `CRIT` 且該主體對此觸發有可用台詞
- **THEN** 對話氣泡必定顯示，不受機率節流影響
