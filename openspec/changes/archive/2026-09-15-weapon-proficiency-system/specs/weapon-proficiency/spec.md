## ADDED Requirements

### Requirement: 角色依武器類型累積熟練度
系統 SHALL 為每個角色維護 `weaponProficiency: Record<WeaponType, { exp: number; level: number }>`，熟練度歸屬於 `weaponType`（見 `weapon-type` capability），不綁定單一武器實例、不綁定特定手部槽位；同類型的不同武器共享同一份熟練度，換裝同類型武器（無論換到哪一手）不歸零、不受影響。

#### Scenario: 未使用過的武器類型無資料
- **WHEN** 查詢一個從未在戰鬥中使用過某 `weaponType` 攻擊的角色
- **THEN** 該角色的 `weaponProficiency` 不包含該 `weaponType` 的 key，視為 exp=0/level=1

#### Scenario: 換手或換同類型武器熟練度不歸零
- **WHEN** 角色的 `BLADE` 熟練度已累積一定 exp，玩家將 `BLADE` 類型武器從右手換到左手，或換成另一把同為 `BLADE` 類型的武器
- **THEN** 該角色的 `BLADE` 熟練度 exp/level 維持不變

### Requirement: 戰鬥命中累積熟練度，雙持時各自計算
系統 SHALL 在每場戰鬥解算完成時，依該場戰鬥中玩家攻擊的命中結果，一次性累加對應 `weaponType` 的熟練度 exp。玩家雙手（`equipment.LEFT_HAND`/`equipment.RIGHT_HAND`）中每一件帶 `weaponType` 的裝備，皆各自視為「本次攻擊使用的武器」：命中判定通過（未被目標 `dodgeChance` 閃避）且未爆擊，對應類型 `exp += 1`；命中判定通過且爆擊，對應類型 `exp += 5`（兩者互斥，一次攻擊只計其中一種，不疊加）。被閃避的攻擊 SHALL NOT 增加任何熟練度。角色雙手皆無武器類裝備時，該場戰鬥 SHALL NOT 累積任何熟練度。

#### Scenario: 單持武器一般命中 +1
- **WHEN** 玩家只在一手裝備 `weaponType = FIST` 的武器，另一手為防具或空手，本場戰鬥中發生 3 次一般命中（非爆擊、未被閃避）攻擊
- **THEN** 戰鬥結算後角色 `weaponProficiency.FIST.exp` 增加 3

#### Scenario: 雙持不同類型武器，各自累積
- **WHEN** 玩家右手裝備 `weaponType = BLADE`、左手裝備 `weaponType = FIST`，本場戰鬥發生 2 次一般命中攻擊
- **THEN** 戰鬥結算後 `weaponProficiency.BLADE.exp` 與 `weaponProficiency.FIST.exp` 皆增加 2

#### Scenario: 爆擊 +5，不與一般命中疊加
- **WHEN** 玩家某次攻擊判定為爆擊
- **THEN** 該次攻擊只為對應的每個已裝備 `weaponType` 各自增加 5 點 exp，不額外再加 1 點

#### Scenario: 被閃避不計入
- **WHEN** 玩家的一次攻擊被敵人 `dodgeChance` 判定閃避
- **THEN** 該次攻擊不增加任何熟練度

#### Scenario: 雙手皆無武器不累積
- **WHEN** 角色雙手皆未裝備帶 `weaponType` 的道具進入戰鬥
- **THEN** 該場戰鬥結算後，任何 `weaponType` 的熟練度皆不變化

### Requirement: 角色維護獨立的雙持熟練度
系統 SHALL 為每個角色維護 `dualWieldProficiency: { exp: number; level: number }`（單一物件，不是依類型區分的 record），代表角色「雙持武器」這個玩法配置本身的熟練度，與 `weaponProficiency` 中各 `weaponType` 的熟練度是彼此獨立的資料，互不影響、互不折抵。

#### Scenario: 雙持熟練度獨立於武器類型熟練度
- **WHEN** 角色雙持不同類型的武器並累積了 `dualWieldProficiency` 與對應 `weaponType` 的熟練度
- **THEN** 這些數值分別儲存、分別計算等級，改變其中一個不影響另一個

### Requirement: 雙持時額外累積雙持熟練度
系統 SHALL 在玩家雙手皆裝備帶 `weaponType` 的道具時，每次命中（含爆擊，規則同「戰鬥命中累積熟練度」的互斥規則：一般命中 `exp += 1`、爆擊 `exp += 5`，兩者互斥）額外累積 `dualWieldProficiency` 的 exp，此累積與該次攻擊餵給對應 `weaponType`（一個或兩個，視是否同類型而定）的熟練度同時發生、互不折抵。只有一手是武器（單持），或雙手皆非武器時，SHALL NOT 累積 `dualWieldProficiency`。

#### Scenario: 雙持攻擊同時累積武器類型與雙持熟練度
- **WHEN** 角色右手裝備 `weaponType = BLADE`、左手裝備 `weaponType = FIST`，本場戰鬥發生 2 次一般命中攻擊
- **THEN** 戰鬥結算後 `weaponProficiency.BLADE.exp`、`weaponProficiency.FIST.exp`、`dualWieldProficiency.exp` 皆增加 2

#### Scenario: 單持不累積雙持熟練度
- **WHEN** 角色只在一手裝備武器類道具，另一手為防具，本場戰鬥發生數次一般命中攻擊
- **THEN** 戰鬥結算後 `dualWieldProficiency.exp` 不變化，只有該武器類型的熟練度增加

### Requirement: 熟練等級曲線與升級
系統 SHALL 依累積 `exp` 決定 `weaponProficiency[weaponType].level` 與 `dualWieldProficiency.level`，兩者共用同一份 Lv.1～10 exp 門檻表（固定遞增，見 design.md D4），等級範圍皆為 1～10，exp 達到對應門檻時 SHALL 自動視為已升級，不需要玩家手動觸發任何端點；等級 10 為上限，超過 Lv.10 門檻的 exp 繼續累積但不再提升等級。

#### Scenario: exp 累積達門檻自動升級
- **WHEN** 角色某 `weaponType` 的 exp 因一場戰鬥結算後跨過 Lv.3 所需門檻
- **THEN** 該次結算後查詢角色資料，`weaponProficiency[weaponType].level` 已更新為 3，不需要額外呼叫任何升級端點

#### Scenario: 雙持熟練度也依同一份門檻表升級
- **WHEN** 角色 `dualWieldProficiency.exp` 因一場戰鬥結算後跨過 Lv.3 所需門檻
- **THEN** 該次結算後 `dualWieldProficiency.level` 已更新為 3

#### Scenario: 等級上限為 10
- **WHEN** 角色某 `weaponType` 的 exp 超過 Lv.10 所需門檻
- **THEN** `level` 維持為 10，exp 持續累積但不影響 level

### Requirement: 熟練等級加成套用於目前裝備的每個武器類型
系統 SHALL 在角色 stats 計算管線中，於天賦加成（`applyTalentStats`）之後，對角色**目前雙手裝備中每一個帶 `weaponType` 的道具**，各自依其熟練等級套用該等級的數值加成（ATK%、critChance）；雙持不同類型時兩者加成疊加，雙持同一類型時該類型加成只計一次（不因裝備兩把同類型武器而翻倍）；雙手皆無武器裝備時不套用任何熟練度加成。

#### Scenario: 熟練等級加成反映在 stats
- **WHEN** 角色一手裝備 `weaponType = BLUNT` 的武器，`BLUNT` 熟練度為 Lv.5，另一手為防具
- **THEN** 該角色回傳的 stats 已疊加 Lv.2～Lv.5 累積的 ATK%/critChance 加成

#### Scenario: 雙持不同類型時加成疊加
- **WHEN** 角色右手裝備 `weaponType = BLADE`（Lv.6）、左手裝備 `weaponType = FIST`（Lv.2）
- **THEN** stats 同時疊加 `BLADE` Lv.6 與 `FIST` Lv.2 各自的加成，不是只取其中一個

#### Scenario: 雙持同類型時加成不翻倍
- **WHEN** 角色雙手皆裝備 `weaponType = BLADE`（該類型熟練度 Lv.6）
- **THEN** stats 只疊加一次 `BLADE` Lv.6 的加成，不因裝備兩把同類型武器而疊加兩次

#### Scenario: 換裝不同類型武器，加成立即改變
- **WHEN** 角色 `BLADE` 熟練度 Lv.6、`FIST` 熟練度 Lv.2，玩家將原本裝備 `BLADE` 的那一手換成 `FIST` 類型武器
- **THEN** 換裝後查詢角色資料，stats 套用的是 `FIST` Lv.2 的加成，不再套用 `BLADE` Lv.6 的加成

#### Scenario: 未裝備任何武器不套用加成
- **WHEN** 角色雙手皆卸下武器（例如雙手都是防具）
- **THEN** stats 計算不套用任何武器熟練度加成

### Requirement: 雙持熟練等級加成只在雙手皆為武器時套用
系統 SHALL 在角色 stats 計算管線中，於武器類型熟練度加成之後，額外套用 `dualWieldProficiency` 當前等級對應的數值加成（型別無關的通用 ATK%/critChance 加成，見 design.md D4）；此加成 SHALL 只在角色**目前雙手皆裝備帶 `weaponType` 的道具**時生效，單持或雙手皆非武器時不套用，即使 `dualWieldProficiency.level` 大於 1。

#### Scenario: 雙持時套用雙持加成
- **WHEN** 角色雙手皆裝備武器類道具，`dualWieldProficiency` 為 Lv.5
- **THEN** stats 在武器類型加成之後，額外疊加 `dualWieldProficiency` Lv.2～Lv.5 的加成

#### Scenario: 換成單持後雙持加成停止套用
- **WHEN** 角色 `dualWieldProficiency` 已是 Lv.5，玩家卸下其中一手的武器改裝防具
- **THEN** 查詢角色資料時 stats 不再套用 `dualWieldProficiency` 的加成，但 `dualWieldProficiency.exp`/`level` 本身不變

### Requirement: 熟練等級解鎖類型被動技能
系統 SHALL 在特定等級（Lv.4/6/8/10）為對應 `weaponType` 解鎖一個該類型專屬的戰鬥被動效果——被動技能是命中/爆擊/連續命中等條件自動觸發的戰鬥效果，不是玩家主動操作的技能；各類型的具體觸發條件與效果見 design.md D5。被動效果只在戰鬥中、且角色至少一手裝備該武器類型時生效；效果不落地 Firestore，不影響下一場戰鬥的初始狀態。

#### Scenario: 達到解鎖等級後被動生效
- **WHEN** 角色 `RANGED` 熟練度達到 Lv.4，至少一手裝備 `RANGED` 類型武器進入戰鬥
- **THEN** 該場戰鬥中 `RANGED` 類型 Lv.4 被動的觸發條件成立時會生效

#### Scenario: 未達等級不解鎖
- **WHEN** 角色 `RANGED` 熟練度為 Lv.3
- **THEN** Lv.4 被動效果不生效

#### Scenario: 被動效果可以作用於敵方目標
- **WHEN** 角色 `BLUNT` 熟練度達到 Lv.4，其被動效果為「命中後對目標施加減益」
- **THEN** 該效果套用在被擊中的敵方 `CombatUnit` 身上，影響其後續受到的傷害，而非套用在玩家自己身上

### Requirement: 熟練等級解鎖雙持專屬被動技能
系統 SHALL 在 `dualWieldProficiency` 達到特定等級（Lv.4/6/8/10）時解鎖一個型別無關的雙持專屬被動效果（觸發條件與效果見 design.md D5「雙持被動」表）；被動效果只在戰鬥中、且角色目前雙手皆裝備武器類道具時生效，與各 `weaponType` 自己的被動效果彼此獨立疊加。

#### Scenario: 雙持被動與武器類型被動同時生效
- **WHEN** 角色右手 `BLADE` 熟練度 Lv.4（已解鎖 BLADE 被動 A）、`dualWieldProficiency` 也達到 Lv.4（已解鎖雙持被動 A），且雙手皆裝備武器類道具
- **THEN** 該場戰鬥中 BLADE 被動 A 與雙持被動 A 的觸發條件各自成立時都會生效，不互相取代

#### Scenario: 換成單持後雙持被動停止生效
- **WHEN** 角色 `dualWieldProficiency` 已解鎖 Lv.4 被動，玩家卸下其中一手武器改成單持
- **THEN** 該場戰鬗中雙持被動不再生效，該武器類型自己的被動不受影響

### Requirement: 不支援熟練度重置
系統 SHALL NOT 提供任何將角色 `weaponProficiency` 中某 `weaponType`，或 `dualWieldProficiency` 的 exp/level 歸零或轉移的端點。

#### Scenario: 無重置端點
- **WHEN** 玩家嘗試尋找可將 `weaponProficiency` 某類型或 `dualWieldProficiency` 歸零的 API
- **THEN** 系統不提供此類端點

### Requirement: 角色頁面顯示武器熟練度與被動解鎖狀態
系統 SHALL 在角色頁面（`inventory` capability「背包頁面呈現」）顯示一個武器熟練度面板：對 5 個 `weaponType` 與 `dualWieldProficiency` 共 6 個維度，各自顯示目前等級（Lv.1～10）與往下一級所需的 exp 進度；對已解鎖等級（Lv.4/6/8/10）的維度，額外顯示其已解鎖的被動技能名稱清單，尚未解鎖的等級 SHALL NOT 提前顯示未來被動的內容。角色從未使用過的 `weaponType`（`weaponProficiency` 無對應 key）SHALL 顯示為「尚未使用」的空狀態，不顯示成長曲線細節。

#### Scenario: 顯示已使用武器類型的等級與進度
- **WHEN** 角色 `BLADE` 熟練度為 Lv.6，exp 介於 Lv.6 與 Lv.7 門檻之間
- **THEN** 面板顯示 `BLADE` 為 Lv.6，並顯示往 Lv.7 的進度條

#### Scenario: 未使用過的類型顯示空狀態
- **WHEN** 角色從未在戰鬥中使用過 `POLEARM` 類型武器
- **THEN** 面板將 `POLEARM` 顯示為「尚未使用」，不顯示等級或進度條數值

#### Scenario: 已解鎖等級顯示對應被動名稱
- **WHEN** 角色 `FIST` 熟練度為 Lv.6（已解鎖被動 A 與被動 B）
- **THEN** 面板列出 `FIST` 已解鎖的被動 A、被動 B 名稱

#### Scenario: 未解鎖等級不預先顯示被動內容
- **WHEN** 角色 `FIST` 熟練度為 Lv.3（尚未解鎖 Lv.4 被動 A）
- **THEN** 面板不顯示被動 A 的名稱或效果描述

#### Scenario: 雙持維度與武器類型並列顯示
- **WHEN** 角色查詢角色頁
- **THEN** 面板顯示 6 條進度：`FIST`/`BLADE`/`BLUNT`/`POLEARM`/`RANGED`/`dualWieldProficiency`，雙持維度的呈現方式與武器類型一致（等級/進度/已解鎖被動）
