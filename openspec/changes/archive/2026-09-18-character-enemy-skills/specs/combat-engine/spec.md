## MODIFIED Requirements

### Requirement: 戰鬥結算納入武器熟練度與攻擊型態判定
系統 SHALL 在 `POST /api/adventure/combat/start` 的戰鬥模擬流程中，對玩家的每一次攻擊套用 `weapon-attack-pattern` capability 定義的目標型態判定（單體/AoE/濺射），並在戰鬥結算完成時依 `weapon-proficiency` capability 的規則一次性更新角色的 `weaponProficiency`；這兩項行為 SHALL 是同一次 `resolve()` 呼叫的一部分，與既有的 `recordEncounteredArchetypes`/`recordDefeatedArchetypes` 副作用寫入屬於同一批次。戰鬥結算 SHALL 同時依 `character-skills` capability 的規則，為角色本場戰鬥中每個已佩戴技能的實際觸發次數累加對應的技能 exp，並套用其升級判定，屬於同一次 `resolve()` 呼叫、同一批次寫入。

#### Scenario: 戰鬥結算同時更新遭遇紀錄與武器熟練度
- **WHEN** 一場戰鬥結束（勝利或落敗）
- **THEN** 該次 `resolve()` 呼叫除了既有的敵人遭遇/擊殺紀錄更新，也一併完成角色 `weaponProficiency` 的 exp/level 更新，不需要額外的 API 呼叫

#### Scenario: 戰鬥結算同時更新技能 exp
- **WHEN** 一場戰鬥結束，角色佩戴的某技能於本場戰鬥中觸發 2 次
- **THEN** 該次 `resolve()` 呼叫一併完成該技能 `exp`/`level` 的更新，不需要額外的 API 呼叫

### Requirement: 戰鬥掉落
系統 SHALL 於戰鬥結束後依 LUCK 調整金幣掉落量與物品掉落機率，並依 enemyLevel 分級決定 gems 掉落機率與數量。系統另 SHALL 於戰鬥勝利結算時，依既有 LUCK 調整後的物品掉落機率判定是否額外掉落技能碎片：命中時從角色目前 `archetypeId` 對應的 `CHARACTER_SKILLS` 清單中等機率隨機挑選一個技能，為該角色 `skillFragments[skillId]` 增加固定數量 `SKILL_FRAGMENT_DROP_AMOUNT`（此固定數量不因 LUCK 而變動，LUCK 只影響「是否掉落」的機率）。

#### Scenario: LUCK 提升掉落
- **WHEN** 兩名 LUCK 不同的角色擊敗相同敵人設定，重複多次模擬
- **THEN** 較高 LUCK 的角色平均掉落金幣量與物品掉落率不低於較低 LUCK 的角色

#### Scenario: enemyLevel 超出已定義範圍
- **WHEN** enemyLevel > 30（FR-040 尚未定案的情境）
- **THEN** 系統套用 20~30 級距的既有 gems 掉落規則作為 fallback，並標記此為 fallback 行為（供之後規則確認後調整）

#### Scenario: 戰鬥勝利額外掉落技能碎片
- **WHEN** 角色戰鬥勝利，依 LUCK 調整後的掉落機率判定命中
- **THEN** 系統從該角色職業對應的技能清單中隨機挑選一個技能，其 `skillFragments` 增加 `SKILL_FRAGMENT_DROP_AMOUNT`

#### Scenario: 戰鬥落敗不掉落技能碎片
- **WHEN** 角色戰鬥落敗（`victory = false`）
- **THEN** 系統 SHALL NOT 掉落任何技能碎片

## ADDED Requirements

### Requirement: 技能充能與觸發時機
系統 SHALL 為每個 `CombatUnit` 維護一份與既有攻擊排程（`nextAttackAt`）並行、彼此獨立的技能充能計時器（`chargingSkills`）：玩家單位依 `equippedSkillIds` 中已佩戴且已解鎖的技能建立，敵人單位依其 `EnemyArchetype.skill`（若有）建立；每個計時器於戰鬥開始（或該單位加入戰場，如 Boss 小兵補位）時即開始計時，經過該技能的 `chargeSec` 秒（戰鬥模擬時間）後視為充能完成。`resolve()` 的 discrete-event schedule SHALL 將所有存活單位的 `nextAttackAt` 與其 `chargingSkills[].readyAt` 一併比較，取全域最小值決定下一個事件；技能充能完成時觸發技能效果並寫入一筆 `SKILL` `CombatLogEntry`，觸發後立即重新開始下一輪充能（`readyAt = 觸發時間 + chargeSec * 1000`），不影響該單位自身的 `nextAttackAt` 排程，即技能觸發 SHALL NOT 取代或延後該單位的普通攻擊行動。

#### Scenario: 技能到時觸發，不影響普通攻擊排程
- **WHEN** 角色佩戴的技能 `chargeSec = 10`，戰鬥開始後第 10 秒（模擬時間）到達，且該角色的 `nextAttackAt` 排在第 12 秒
- **THEN** 第 10 秒觸發一次技能效果並寫入 `SKILL` 事件，該角色的 `nextAttackAt` 仍在第 12 秒觸發普通攻擊，不受技能觸發影響

#### Scenario: 技能觸發後立即重新開始充能
- **WHEN** 某技能於模擬時間第 10 秒觸發，`chargeSec = 10`
- **THEN** 該技能下一次充能完成的時間點為第 20 秒

#### Scenario: 敵人技能與玩家技能使用同一套排程機制
- **WHEN** 某敵人 archetype 帶有 `skill` 欄位，加入戰場後開始充能
- **THEN** 該敵人技能到時觸發的行為與玩家技能一致：寫入 `SKILL` 事件、不取代該敵人的普通攻擊排程

#### Scenario: 未佩戴任何技能的角色不建立充能計時器
- **WHEN** 角色 `equippedSkillIds` 全為 `null`
- **THEN** 該角色的 `chargingSkills` 為空陣列，戰鬥中不會觸發任何 `SKILL` 事件

#### Scenario: 補位小兵的技能從加入戰場時開始計時
- **WHEN** Boss 戰中途補位一隻帶有 `skill` 的小兵
- **THEN** 該小兵的技能充能計時器從其加入戰場的模擬時間點開始計算，而非從戰鬥開始的時間點

### Requirement: 技能傷害類效果結算
系統 SHALL 於 `DAMAGE_SINGLE`/`DAMAGE_AOE`/`DAMAGE_SPLASH`/`DOT` 類技能觸發時，重用既有 `computeDamage`/crit/dodge 判定邏輯計算傷害：`DAMAGE_SINGLE` 對施放者目前普通攻擊目標造成 `ATK × multiplier` 傷害；`DAMAGE_AOE` 對本波所有存活敵人各自造成 `ATK × multiplier` 傷害；`DAMAGE_SPLASH` 對主目標造成 `ATK × multiplier`、其餘存活敵人造成 `ATK × multiplier × splashRatio`；`DOT` 造成初始傷害後，於目標後續 `ticks` 次「即將受到傷害前」或「即將行動前」（取較早者）各結算一次 `tickDamage` 固定傷害。傷害類技能效果 SHALL 可觸發爆擊/被閃避判定，比照既有普通攻擊規則。

#### Scenario: 單體傷害技能套用倍率
- **WHEN** 角色觸發 `DAMAGE_SINGLE` 技能，`multiplier = 1.5`，未被閃避、未爆擊
- **THEN** 造成的傷害為 `ATK × 1.5`（再套用既有的傷害下限/免傷規則）

#### Scenario: AOE 技能對全部存活敵人造成傷害
- **WHEN** 角色觸發 `DAMAGE_AOE` 技能，本波有 3 隻存活敵人
- **THEN** `combatLog` 記錄 3 筆傷害事件，每隻敵人各自承受 `ATK × multiplier` 傷害（各自獨立判定爆擊/閃避）

#### Scenario: 濺射技能主目標與副目標傷害不同
- **WHEN** 角色觸發 `DAMAGE_SPLASH` 技能，`multiplier = 1.2`，`splashRatio = 0.5`，本波有 1 個主目標與 2 個其餘存活敵人
- **THEN** 主目標承受 `ATK × 1.2` 傷害，其餘 2 隻敵人各承受 `ATK × 1.2 × 0.5` 傷害

#### Scenario: DOT 技能造成初始傷害後持續 tick
- **WHEN** 角色觸發 `DOT` 技能，`ticks = 3`，目標存活
- **THEN** 目標先承受一次初始傷害，之後在其後續 3 次「即將受到傷害前或即將行動前」的時間點各承受一次 `tickDamage`

### Requirement: 技能狀態類效果結算
系統 SHALL 於 `FREEZE`/`HASTE_SELF`/`HEAL_SELF`/`DEFENSE_UP`/`CRIT_UP`/`ARMOR_BREAK`/`SHIELD` 類技能觸發時，套用以下效果：`FREEZE` 使目標 `nextAttackAt` 延後 `durationSec` 秒；`HASTE_SELF` 使施放者 `actionIntervalSec` 於 `durationSec` 秒內下降 `percent`%；`HEAL_SELF` 立即恢復施放者 `hpMax × percent`% 的 HP（不超過 `hpMax`）；`DEFENSE_UP` 使施放者 `DEF` 於 `durationSec` 秒內提升 `percent`%；`CRIT_UP` 使施放者 `critChance` 於 `durationSec` 秒內提升 `flatPercent` 個百分點；`ARMOR_BREAK` 使目標 `DEF` 於 `durationSec` 秒內降低 `percent`%；`SHIELD` 為施放者建立 `hpMax × percent`% 的護盾值，優先吸收後續傷害直到耗盡或戰鬥結束。上述持續性效果（`FREEZE` 除外，`FREEZE` 為一次性延後）SHALL 只存在於該場戰鬥的模擬記憶體中，戰鬥結束後 SHALL NOT 寫回任何持久化資料，下一場戰鬥的單位狀態 SHALL 從無效果的初始狀態開始，比照既有「戰鬥被動效果只存在於單場戰鬥」的原則。

#### Scenario: 恢復生命值技能
- **WHEN** 角色觸發 `HEAL_SELF` 技能，`percent = 15`，目前 HP 為 `hpMax` 的 70%
- **THEN** 角色 HP 立即恢復 `hpMax × 15%`，且不超過 `hpMax`

#### Scenario: 降低敵人防禦技能持續時間內生效
- **WHEN** 角色觸發 `ARMOR_BREAK` 技能，`percent = 20`，`durationSec = 8`
- **THEN** 目標 `DEF` 於接下來 8 秒（模擬時間）內的傷害判定降低 20%，超過後恢復原值

#### Scenario: 護盾優先吸收傷害
- **WHEN** 角色已有 `SHIELD` 效果剩餘護盾值 30，受到一筆 50 點傷害
- **THEN** 護盾先吸收 30 點，角色實際承受 HP 傷害為 20，護盾值歸零

#### Scenario: 狀態效果不跨場次
- **WHEN** 玩家在某場戰鬥中觸發了任一狀態類技能效果
- **THEN** 該效果只影響當前這場戰鬥的後續行動，下一場戰鬥開始時單位不帶有該效果

### Requirement: combatLog 記錄技能事件
系統 SHALL 在 `CombatLogEntry.action` 新增 `SKILL` 列舉值，技能觸發時寫入一筆 `action = 'SKILL'` 的事件，包含 `skillId`/`skillName` 與依效果類型使用既有欄位表達結果（傷害類沿用 `damage`/`targetHpRemaining`，`HEAL_SELF` 的 `targetId` 等於 `actorId` 且 `damage` 為負值或改用回復量欄位表達，恢復後的 HP 反映於 `targetHpRemaining`）；冒險畫面既有的逐批播放邏輯（`combat-engine` capability「冒險畫面顯示戰鬥結果」）SHALL 涵蓋 `SKILL` 事件，比照既有 `ATTACK`/`CRIT` 事件依 `timestamp` 差值排入同一播放序列。

#### Scenario: 技能事件包含技能識別資訊
- **WHEN** 戰鬥中某技能觸發
- **THEN** `combatLog` 新增一筆 `action = 'SKILL'` 的事件，包含該技能的 `skillId`/`skillName`

#### Scenario: 技能事件併入既有逐批播放序列
- **WHEN** `combatLog` 依序有 `ATTACK`（timestamp=0）、`SKILL`（timestamp=2000）、`ATTACK`（timestamp=2000）三筆事件
- **THEN** 冒險畫面依既有邏輯先顯示第 1 筆，等待 2000ms 後同時顯示第 2、3 筆（`SKILL` 與 `ATTACK` 同批），不需要額外的排程機制

#### Scenario: 讀取本 change 上線前的歷史戰鬥結果
- **WHEN** 讀取一筆本 change 上線前就已寫入 Firestore 的 `combatLog`
- **THEN** 其中不含任何 `action = 'SKILL'` 的事件，既有播放邏輯不受影響
