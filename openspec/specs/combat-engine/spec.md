# combat-engine

## Purpose

冒險 run 的 COMBAT 節點戰鬥模擬引擎：伺服器單次決定性模擬整場戰鬥（含多 wave/多敵），套用 RunModifier（Blessing/Curse）於攻防與掉落計算，並依 LUCK/enemyLevel 決定掉落，供冒險畫面顯示結果。

## Requirements

### Requirement: 伺服器單次模擬戰鬥
系統 SHALL 於進入 COMBAT 節點時，以決定性 RNG 一次性模擬整場戰鬥（含多 wave/多敵）至某一方全滅為止，回傳完整 `combatLog` 與 `combatSummary`，且不接受戰鬥進行中的任何玩家操作。

#### Scenario: 單敵單波戰鬥
- **WHEN** 一般 combat 節點只有 1 wave、1 隻敵人
- **THEN** `POST /api/adventure/combat/start` 回傳完整 combatLog（含每次攻擊/暴擊/閃避事件）與 combatSummary（勝負/回合數/掉落）

#### Scenario: 多波多敵戰鬥
- **WHEN** combat 節點決定 waveCount=2、enemyCount=3
- **THEN** combatLog 依序記錄兩個 wave 的所有攻擊事件，直到全部敵人被擊敗或玩家死亡

### Requirement: 戰鬥前顯示第一波敵人陣容
系統 SHALL 在決定 COMBAT/ELITE/STRONG_ELITE/BOSS 節點時，一併決定該次遭遇第一波的完整敵人陣容（每個敵人的種類、名稱、描述、依 tier/enemyLevel 計算後的生命值），並存入該節點的 `currentNodeData`，供冒險畫面在玩家觸發戰鬥前顯示；後續波次（若有）SHALL NOT 於此時決定或顯示，維持在戰鬥實際解算時才決定。

#### Scenario: 單波敵人顯示完整陣容
- **WHEN** 系統決定一個 `waveCount = 1` 的 COMBAT 節點
- **THEN** `currentNodeData` 包含該波每個敵人的名稱、描述、生命值，冒險畫面可於玩家點擊「開始戰鬥」前顯示

#### Scenario: 多波敵人只揭露第一波
- **WHEN** 系統決定一個 `waveCount = 2` 的節點
- **THEN** `currentNodeData` 只包含第一波的敵人陣容，不包含第二波的任何敵人資訊

#### Scenario: 陣容預覽與實際戰鬥結果一致
- **WHEN** 玩家觸發戰鬥，系統實際模擬第一波戰鬥
- **THEN** 第一波實際出現的敵人種類與節點生成時預覽的陣容完全一致（同一組 archetype 選擇，不因戰鬥解算而重新決定）

### Requirement: 依陣營選用敵人範本
系統 SHALL 依 run 目前的 `factionType` 選擇敵人範本清單：一般戰鬥（COMBAT/ELITE/STRONG_ELITE）節點，`GKBOT` 使用 `ENEMY_ARCHETYPES`、`HUMAN` 使用 `HUMAN_ARCHETYPES`；BOSS 節點，`GKBOT` 使用 `GKBOT_BOSS_ARCHETYPES`、`HUMAN` 使用 `HUMAN_BOSS_ARCHETYPES`。

#### Scenario: 人類陣營 run 的一般戰鬥
- **WHEN** run `factionType = HUMAN`，節點為一般 COMBAT/ELITE/STRONG_ELITE
- **THEN** 敵人從 `HUMAN_ARCHETYPES` 抽取，不出現 `ENEMY_ARCHETYPES`（GkBot）的範本

#### Scenario: 人類陣營 run 的 Boss
- **WHEN** run `factionType = HUMAN`，節點為 BOSS
- **THEN** 敵人從 `HUMAN_BOSS_ARCHETYPES` 抽取

#### Scenario: 機械陣營 run 的 Boss
- **WHEN** run `factionType = GKBOT`，節點為 BOSS
- **THEN** 敵人從 `GKBOT_BOSS_ARCHETYPES` 抽取

### Requirement: 傷害與命中判定公式
系統 SHALL 以 `damage = (DEF >= 2 * ATK) ? 0 : max(1, ATK-DEF) * (crit ? critMultiplier : 1)` 計算傷害；crit 機率以 `base + AGI * 係數` 計算並 clamp 至上限 35%；dodge 機率以 `base + AGI * 係數 + 裝備 dodgeChanceMod 加總` 計算並 clamp 至區間 [0%, 25%]，其中每件 `HEAVY` 分類裝備的 `dodgeChanceMod` 在加總前先依角色 `STR`+`CON` 套用負重折扣（見 `weapon-weight-class` capability「負重能力抑制 HEAVY 懲罰」）。

#### Scenario: 一般攻擊傷害下限
- **WHEN** 攻擊方 ATK 小於等於防禦方 DEF，且防禦方 DEF 小於攻擊方 ATK 的 2 倍
- **THEN** 造成的傷害固定為 1（不會是 0 或負數）

#### Scenario: 防禦壓倒性超過攻擊力時完全免傷
- **WHEN** 防禦方 DEF 大於等於攻擊方 ATK 的 2 倍
- **THEN** 造成的傷害為 0

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

### Requirement: 敵人爆擊/閃避依個別範本的 LUK 覆寫值決定
系統 SHALL 於判定敵人爆擊率/閃避率時，優先使用該敵人範本（`EnemyArchetype`）的 `critChanceOverride`/`dodgeChanceOverride`（若有填寫），否則回退使用全域 `ENEMY_COMBAT_STATS` 的預設值。

#### Scenario: 高 LUK 範本使用覆寫值
- **WHEN** 敵人範本設有 `dodgeChanceOverride`（例如「幻影投影體」）
- **THEN** 該敵人的閃避率判定使用 `dodgeChanceOverride`，而非全域 `ENEMY_COMBAT_STATS.dodgeChance`

#### Scenario: 未覆寫時回退全域預設值
- **WHEN** 敵人範本未設定 `critChanceOverride`/`dodgeChanceOverride`
- **THEN** 該敵人的爆擊率/閃避率判定使用全域 `ENEMY_COMBAT_STATS` 的預設值

### Requirement: RunModifier 影響戰鬥計算
系統 SHALL 在每次傷害/防禦/掉落計算前，套用所有生效中的 Blessing/Curse（RunModifier），且這些效果僅影響計算期的臨時數值，不修改角色永久資料。

#### Scenario: Blessing 提升攻擊力
- **WHEN** run 內有一個生效中的「+ATK」Blessing
- **THEN** 本場戰鬥的傷害計算使用「基礎 ATK + Blessing 加成」，但角色文件的 attributes/stats 不受影響

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

### Requirement: Boss 戰鬥數值與獎勵
系統 SHALL 為 BOSS tier 提供獨立於 NORMAL/ELITE/STRONG_ELITE 的難度倍率與獎勵規則：hp/atk/def 倍率高於 STRONG_ELITE；固定 1 wave，敵人陣容為「1 隻 Boss（BOSS tier 數值）+ 最多 2 隻小兵（沿用 STRONG_ELITE 或既有小兵數值模板）」，小兵數量與是否補位由怪物模板定義（見「Boss 小兵補位」）；擊敗 Boss（該波所有敵人，含小兵，全滅）後保底掉落一件裝備（不受 LUCK 掉落機率門檻限制）。

#### Scenario: Boss 固定單波、Boss 帶小兵
- **WHEN** 節點 tier 為 BOSS
- **THEN** 戰鬥固定 1 wave，敵人陣容為 1 隻 Boss + 最多 2 隻小兵（依怪物模板決定實際小兵數，0~2 之間），不呼叫一般戰鬥的多波/多敵隨機判定

#### Scenario: Boss 數值高於 Strong Elite
- **WHEN** 同一 enemyLevel 分別以 STRONG_ELITE 與 BOSS tier 計算 Boss 本體的 hp/atk/def 倍率
- **THEN** BOSS 本體的三項倍率皆高於 STRONG_ELITE 對應數值

#### Scenario: 擊敗 Boss 陣容才算勝利
- **WHEN** Boss 本體與其小兵中，仍有任一存活
- **THEN** 該場戰鬥 SHALL NOT 判定為玩家勝利，戰鬥繼續進行

#### Scenario: Boss 保底掉落
- **WHEN** 玩家擊敗 BOSS 節點的整組敵人陣容（Boss + 所有小兵）
- **THEN** 系統保證掉落至少一件裝備，不受一般戰鬥的 LUCK 掉落機率門檻限制

### Requirement: 章節最後一關 Boss 強度加成
系統 SHALL 在判定當前 BOSS 節點所屬的 Level 為其所屬 Chapter 的最後一關（`run.levelIndex + 1 >= run.chapterTotalLevels`）時，對該 boss 本體（不含隨從/minion）依既有 tier/severity 計算所得的 `{hp, atk, def}` 倍率再額外乘上 1.5；此加成 SHALL 同時套用於戰前敵人陣容預覽（`buildBossNodeData` 產出的 `EnemyPreview`）與實際戰鬥解算（`spawnWave`/`buildEnemyUnit` 產出的 `CombatUnit`），兩者對同一場戰鬥 SHALL 得出一致的數值。boss 隨從/minion 的數值 SHALL NOT 受此加成影響。

#### Scenario: 章節最後一關的 boss 數值提升
- **WHEN** 某場戰鬥的 BOSS 節點所屬 Level 為其所屬 Chapter 的最後一關
- **THEN** 該 boss 本體的 `hp`/`atk`/`def` 為「未套用此加成前的原始計算值」乘以 1.5（取整規則與既有計算方式一致）

#### Scenario: 章節內非最後一關的 boss 數值不變
- **WHEN** 某場戰鬥的 BOSS 節點所屬 Level 不是其所屬 Chapter 的最後一關
- **THEN** 該 boss 本體的 `hp`/`atk`/`def` 維持既有計算結果，不套用額外倍率

#### Scenario: 章節最後一關的 boss 隨從數值不受影響
- **WHEN** 某場戰鬥的 BOSS 節點所屬 Level 為其所屬 Chapter 的最後一關，且該 boss 帶有隨從
- **THEN** 隨從單位的 `hp`/`atk`/`def` 維持既有計算結果，不套用額外倍率

#### Scenario: 戰前預覽與實際戰鬥數值一致
- **WHEN** 玩家在章節最後一關的 BOSS 節點於觸發戰鬥前看到敵人陣容預覽，之後觸發實際戰鬥
- **THEN** 預覽中 boss 的 `hp` 與實際戰鬥中 boss 單位的 `hpMax` 數值一致

### Requirement: 頭目數值不疊加 BOSS tier 倍率
系統 SHALL 對頭目清單（`GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES`）抽出的敵人，套用 `getStatMultipliers(enemyLevel, 'NORMAL')` 的縮放曲線，不再套用 `getStatMultipliers` 的 `'BOSS'` tier 倍率；頭目的最終強度差異全部來自其自身的 `baseAtk`/`baseDef`/`baseHp` 基準值。

#### Scenario: Boss 節點不重複疊加倍率
- **WHEN** 一個 BOSS 節點從頭目清單抽出敵人並計算最終數值
- **THEN** 系統呼叫 `getStatMultipliers` 時傳入 `'NORMAL'` tier，而非 `'BOSS'` tier

### Requirement: Boss 小兵補位
系統 SHALL 允許怪物模板將特定 Boss 標記為「具備補位能力」；在 Boss 戰進行中，若該 Boss 具備補位能力、Boss 本身存活，且目前存活小兵數 < 2，系統 SHALL 每滿 3 個戰鬥回合檢查一次，並以 50% 機率補一隻新小兵（沿用開場小兵的模板與 tier 數值），單場 Boss 戰的補位次數 SHALL 累計不超過 2 次；不具備補位能力的 Boss SHALL NOT 觸發此機制，小兵陣亡後不會再補充。

#### Scenario: 具備補位能力的 Boss 補充小兵
- **WHEN** 戰鬥進行到第 3 個整數倍回合，Boss 具備補位能力、Boss 存活、目前小兵數為 0，且本場尚未達補位次數上限
- **THEN** 系統依補位機率判定，命中時生成 1 隻新小兵加入戰場，補位次數 +1

#### Scenario: 不具備補位能力的 Boss 不補位
- **WHEN** Boss 不具備補位能力，且小兵在戰鬥中途全滅
- **THEN** 系統 SHALL NOT 生成新小兵，戰鬥繼續以「Boss 單獨迎戰」進行到結束

#### Scenario: 補位次數達上限後不再補位
- **WHEN** 具備補位能力的 Boss 本場已補位 2 次
- **THEN** 即使小兵數再次 < 2，系統也 SHALL NOT 再觸發補位

### Requirement: 一般戰鬥波次與敵人數上限
系統 SHALL 將一般（NORMAL/ELITE/STRONG_ELITE）Stage 的戰鬥波次限制在 1~2 波，每波敵人數限制在 1~3 隻，具體波次/敵人數由既有的加權機率公式（依 step 遞增）決定，但結果 SHALL NOT 超出上述上下限。

#### Scenario: 波次上限
- **WHEN** 系統依加權機率決定戰鬥波次
- **THEN** `waveCount` 的值只會是 1 或 2，不會出現 3 波以上

#### Scenario: 每波敵人數上限
- **WHEN** 系統依加權機率決定某一波的敵人數
- **THEN** 該波 `enemyCount` 的值介於 1~3（含頭尾），不會出現 4 隻以上

### Requirement: 設施風險分級影響敵人數量與強度
系統 SHALL 依 run 目前的 `severityTier` 調整敵人數量機率（wave/enemy count）與 hp/atk/def 倍率：在既有 `getWave2Chance`/`getEnemy2Chance`/`getEnemy3Chance` 結果上乘以 `severityTier` 對應的機率倍率（結果 clamp 於既有上限內），並在既有 `getStatMultipliers` 結果上乘以 `severityTier` 對應的 hp/atk/def 倍率。

#### Scenario: 高分級提升敵人數量與強度
- **WHEN** 兩趟 run 分別為 `severityTier = DEEP_WRECK` 與 `severityTier = HIGHLY_ACTIVE`，其餘條件（step/tier）相同
- **THEN** `HIGHLY_ACTIVE` run 的多波/多敵機率與敵人 hp/atk/def 數值皆不低於 `DEEP_WRECK` run

#### Scenario: 中間分級維持既有曲線
- **WHEN** run `severityTier = PARTIAL_ACTIVE`
- **THEN** 敵人數量機率與 hp/atk/def 倍率與本 change 之前的既有曲線一致（不調整）

### Requirement: 戰鬥擊敗敵人獲得 EXP
系統 SHALL 於戰鬥中每擊敗一名敵人時，依 `enemyLevel` 與該敵人所屬節點的 tier（NORMAL/ELITE/STRONG_ELITE/BOSS）計算獲得的 EXP，並累加進 `CombatResult.expGained`；系統 SHALL NOT 產生或回傳任何「分數（score）」相關欄位。

#### Scenario: 一般敵人的 EXP
- **WHEN** 玩家擊敗一名 tier=NORMAL、enemyLevel=5 的敵人
- **THEN** `CombatResult.expGained` 依 `enemyLevel * 基礎倍率 * tier 倍率` 計算並累加

#### Scenario: 高階 tier 獲得更多 EXP
- **WHEN** 同一 enemyLevel 分別以 NORMAL/ELITE/STRONG_ELITE/BOSS tier 擊敗敵人
- **THEN** 獲得的 EXP 依 tier 遞增（BOSS > STRONG_ELITE > ELITE > NORMAL）

#### Scenario: 戰鬥失敗不獲得 EXP
- **WHEN** 玩家在戰鬥中被擊敗（`victory = false`）
- **THEN** `CombatResult.expGained = 0`

### Requirement: 戰鬥結果包含敵人狀態資料
系統 SHALL 在 `CombatResult.enemies`（`combatSummary.enemies`）的每筆敵人資料中，額外提供 `hpMax`（該敵人的最大生命值）、`isBoss`（是否為 Boss 本體，區別於小兵）與 `archetypeSlug`（該敵人所屬 `EnemyArchetype` 的穩定識別字串，供頭像等前端展示邏輯查找對應美術資產）欄位，供冒險畫面還原每隻敵人在播放進度當下的即時狀態與外觀。`archetypeSlug` 在 schema 層為 optional——系統 SHALL 為每一筆新產生的戰鬥結果填入其值，optional 僅為相容本 change 上線前既有的歷史 `lastCombatSummary` 資料（無法回填）。

#### Scenario: 一般戰鬥的敵人資料
- **WHEN** 玩家觸發一場非 Boss tier 的戰鬥
- **THEN** `combatSummary.enemies` 每筆資料的 `isBoss` 皆為 `false`，`hpMax` 為該敵人依 tier/enemyLevel 計算後的最大生命值，`archetypeSlug` 為該敵人抽中的 archetype 的 slug

#### Scenario: Boss 戰的敵人資料區分本體與小兵
- **WHEN** 玩家觸發一場 BOSS tier 的戰鬥（含小兵陣容）
- **THEN** Boss 本體那筆資料 `isBoss = true`，其餘小兵（含中途補位的小兵）`isBoss = false`，兩者 `hpMax` 分別依 BOSS/STRONG_ELITE 倍率計算，且各自的 `archetypeSlug` 對應各自抽中的 archetype（Boss 本體與小兵可能是不同 archetype）

#### Scenario: 讀取本 change 上線前的歷史戰鬥結果
- **WHEN** 讀取一筆本 change 上線前就已寫入 Firestore 的 `lastCombatSummary`
- **THEN** 其 `enemies[].archetypeSlug` 可能為 `undefined`，schema 驗證 SHALL NOT 因此失敗

### Requirement: 冒險畫面顯示戰鬥結果
系統 SHALL 讓玩家在 COMBAT 節點的冒險畫面上主動觸發戰鬥；戰鬥完成後，冒險畫面 SHALL 依 `combatLog` 各筆事件的 `timestamp`（相對戰鬥時間，ms）逐筆／逐批播放戰鬥紀錄，而不是一次性全部顯示：相鄰兩批事件之間的等待時間 SHALL 等於兩者 `timestamp` 的差值，同一個 `timestamp` 的多筆事件 SHALL 視為同一批同時顯示；`combatSummary`（勝負、回合數、EXP、金幣、寶石、掉落物）SHALL 在最後一批戰鬥紀錄顯示完畢後才呈現。播放期間，冒險畫面 SHALL 顯示一份敵人狀態面板（依目前已播放的批次即時反映每隻敵人的階級、名稱、目前 HP／最大 HP），並 SHALL 以旋轉動畫（rotate-spinner）視覺化呈現距離下一批戰鬥紀錄顯示的倒數；旋轉一圈的動畫時長 SHALL 等於目前批次到下一批次之間的等待時間。

#### Scenario: 玩家觸發戰鬥
- **WHEN** 玩家在冒險畫面的 COMBAT 節點點擊「開始戰鬥」
- **THEN** 系統呼叫 `POST /api/adventure/combat/start`，取得完整 `combatLog` 與 `combatSummary` 後開始逐批播放

#### Scenario: 依 timestamp 差值逐批播放
- **WHEN** `combatLog` 依序有 timestamp 為 `[0, 2000, 2000, 4500]` 的事件
- **THEN** 冒險畫面立即顯示第 1 筆（timestamp=0），等待 2000ms 後同時顯示第 2、3 筆（同為 timestamp=2000），再等待 2500ms 後顯示第 4 筆（timestamp=4500）

#### Scenario: 摘要延後至播放完畢才顯示
- **WHEN** 戰鬥的 `combatLog` 尚未播放完最後一批事件
- **THEN** 冒險畫面 SHALL NOT 顯示 `combatSummary`（回合數/EXP/金幣/寶石/掉落物），僅顯示目前已播放的戰鬥紀錄與敵人狀態面板

#### Scenario: 播放完畢後顯示完整摘要
- **WHEN** `combatLog` 最後一批事件顯示完畢
- **THEN** 冒險畫面顯示完整 `combatSummary`（勝負、回合數、掉落物與簡化版戰鬥紀錄），且倒數用的旋轉動畫 SHALL NOT 再顯示

#### Scenario: 敵人狀態面板隨播放進度更新
- **WHEN** 目前已播放的批次包含某敵人的 `targetHpRemaining` 或 `DEATH` 事件
- **THEN** 敵人狀態面板中該敵人的 HP／存活狀態 SHALL 依最新一筆已播放事件更新，尚未被攻擊到的敵人維持顯示 `hpMax`

#### Scenario: 只有 Boss 戰才顯示階級標籤
- **WHEN** 這場戰鬥的敵人資料中沒有任何一筆 `isBoss = true`
- **THEN** 敵人狀態面板 SHALL NOT 顯示「頭目」/「小兵」階級標籤，僅顯示名稱與 HP

#### Scenario: 倒數旋轉動畫時長對齊下一批間隔
- **WHEN** 目前已顯示到第 N 批戰鬥紀錄，且第 N+1 批的 `timestamp` 與第 N 批相差 2500ms
- **THEN** 旋轉動畫的單圈時長 SHALL 為 2500ms，且在第 N+1 批顯示時重新開始下一輪倒數

### Requirement: 戰鬥結算納入武器熟練度與攻擊型態判定
系統 SHALL 在 `POST /api/adventure/combat/start` 的戰鬥模擬流程中，對玩家的每一次攻擊套用 `weapon-attack-pattern` capability 定義的目標型態判定（單體/AoE/濺射），並在戰鬥結算完成時依 `weapon-proficiency` capability 的規則一次性更新角色的 `weaponProficiency`；這兩項行為 SHALL 是同一次 `resolve()` 呼叫的一部分，與既有的 `recordEncounteredArchetypes`/`recordDefeatedArchetypes` 副作用寫入屬於同一批次。戰鬥結算 SHALL 同時依 `character-skills` capability 的規則，為角色本場戰鬥中每個已佩戴技能的實際觸發次數累加對應的技能 exp，並套用其升級判定，屬於同一次 `resolve()` 呼叫、同一批次寫入。

#### Scenario: 戰鬥結算同時更新遭遇紀錄與武器熟練度
- **WHEN** 一場戰鬥結束（勝利或落敗）
- **THEN** 該次 `resolve()` 呼叫除了既有的敵人遭遇/擊殺紀錄更新，也一併完成角色 `weaponProficiency` 的 exp/level 更新，不需要額外的 API 呼叫

#### Scenario: 戰鬥結算同時更新技能 exp
- **WHEN** 一場戰鬥結束，角色佩戴的某技能於本場戰鬥中觸發 2 次
- **THEN** 該次 `resolve()` 呼叫一併完成該技能 `exp`/`level` 的更新，不需要額外的 API 呼叫

### Requirement: 戰鬥被動效果只存在於單場戰鬥
系統 SHALL 為 `CombatUnit` 提供暫時性狀態效果（供 `weapon-proficiency` capability 的類型被動使用），效果只在該場戰鬥的模擬期間存在，戰鬥結束後 SHALL NOT 寫回任何持久化資料，下一場戰鬥的單位狀態 SHALL 從無效果的初始狀態開始。

#### Scenario: 狀態效果不跨場次
- **WHEN** 玩家在某場戰鬥中觸發了一個類型被動附加的狀態效果
- **THEN** 該效果只影響當前這場戰鬥的後續攻擊，下一場戰鬥開始時玩家單位不帶有該效果

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
