## Context

現有裝備/戰鬥架構：

- `WeaponWeightClass`（LIGHT/MEDIUM/HEAVY）已存在，套用於**所有** `EQUIPMENT` 類 `ItemTemplate`（6 個槽位皆適用），決定主/副屬性數值走向。本次改為由新欄位 `weight` 的數值區間**推導**，不再是獨立指定的欄位（見 D6）。
- 角色 stats 計算管線為 `calculateBaseStats → applyEquipmentStats → applyTalentStats`（`shared/utils/calculateStats.ts`），三段疊加後才是最終 `Stats`。
- `equipment.service.ts` 已允許 HAND 類道具透過 `requestedSlot` 裝到 `LEFT_HAND`/`RIGHT_HAND` 任一槽，雙武器/雙防具組合皆合法；裝備驗證邏輯只檢查「是否為 HAND 類道具」，不區分兩個槽位的身分（沒有「主手/副手」之分）——本次設計延續這個既有中立性，不新增任何以 `LEFT_HAND`/`RIGHT_HAND` 這個 enum 值本身做特殊判斷的邏輯。
- `combat.service.ts` 的攻擊是「聚合數值」模型：`performAttack()` 對單一 `target`（`alive[0]`）做一次命中/爆擊/傷害判定，沒有 on-hit 效果、狀態、多目標機制。
- `carryCapacity`（`STR+CON+talentBonus.carryCapacity`）已定義在 `Stats`，且已有一個既存用途：`item.service.ts` 的 `getHeavyPenaltyMitigation()` 用 `STR+CON` 折抵 HEAVY 分類裝備的 `actionSpeedMod`/`dodgeChanceMod` 懲罰。本次新增第二個獨立用途：全身裝備總重量預算（見 D6），兩者並存、互不取代。

## Goals / Non-Goals

**Goals:**
- 武器分 5 類型（FIST/BLADE/BLUNT/POLEARM/RANGED），掛載於任一手（`LEFT_HAND`/`RIGHT_HAND`）持有的武器類道具，不限定特定一手。
- 角色對每個武器類型累積熟練度（exp/level），Lv.1～10，數值加成＋被動技能雙軌成長；另外新增一個獨立的「雙持」熟練度維度（`dualWieldProficiency`），與武器類型熟練度並行累積。
- 全身 6 個裝備槽位新增 `weight` 欄位，總重超過角色 `carryCapacity` 時套用固定懲罰（不阻擋裝備動作）。
- `weaponWeightClass`（LIGHT/MEDIUM/HEAVY）改為由 `weight` 數值區間推導。
- 攻擊新增單體/AoE/濺射三種目標型態判定，由武器範本各自的 `aoeChance`/`splashChance` 決定。
- 新增科技槍械類 `RANGED` 武器內容。
- 熟練等級曲線刻意設計得陡峭（見 D4），並新增對應成就（見 D9），讓「練熟一把武器」是值得炫耀的長期里程碑。
- 屬性/戰鬥數值面板搬到角色頁（原背包頁），新增武器熟練度＋被動解鎖狀態顯示；主畫面精簡（見 D10）。
- 戰鬥演出的傷害飄字放大、延長顯示時間，因應 AoE/濺射/被動觸發帶來的短時間多筆傷害事件（見 D11）。

**Non-Goals:**
- 不做提案文件中的「雙手組合 Synergy」。
- 不做距離/範圍走位、控場（POLEARM/RANGED 只作為主題分類與被動風格，不影響戰鬥的「誰是目標」邏輯之外的機制）。
- 不做熟練度重置/轉移端點（比照 `character-talents` 的「不支援重置」慣例）。
- 不做左右手分開出手的戰鬥模型——戰鬥仍是單次聚合攻擊，雙持武器時的處理見 D3/D7。

## Decisions

### D1. 武器類型掛在「武器類道具」本身，不綁定特定手部槽位
`weaponType`（FIST/BLADE/BLUNT/POLEARM/RANGED）與既有 `weaponWeightClass` 是兩條正交軸線：前者決定「玩法風格／熟練度歸屬」，後者決定「數值取捨」。凡是設定了 `weaponType` 的 `ItemTemplate` 即視為「武器」，`equipSlot` 可以是 `LEFT_HAND` 或 `RIGHT_HAND` 兩者之一（由內容端決定預設槽位，玩家仍可用既有 `requestedSlot` 換手）——`weaponType` 的存在與否才是「是不是武器」的判斷依據，取代原本 `item.service.ts` 用 `equipSlot !== RIGHT_HAND` 判斷「是不是防具」的隱性寫法（`isLightArmorTemplate()` 需要同步改為以 `weaponType === undefined` 判斷）。`HEAD`/`BODY`/`SHOES`/`RING` 不設定 `weaponType`。

### D2. 熟練度資料掛在 Character，仿照 talents 的常駐成長資料型態
新增 `character.weaponProficiency: Record<WeaponType, { exp: number; level: number }>`，未使用過的類型視為不存在該 key（比照 `character.talents` 的稀疏 record 慣例）。熟練度不綁定單一武器實例，同類型武器共用（換同類型武器不歸零）。

### D2b. 新增獨立的「雙持」熟練度維度，不是 `WeaponType` 的第 6 個值
雙持（同時裝備兩把武器，不論類型是否相同）是一種**玩法/裝備配置**，不是「武器的種類」，所以不塞進 `WeaponType` enum，改成角色身上新增一個獨立欄位：`character.dualWieldProficiency: { exp: number; level: number }`（單一物件，不是 record——只有「有沒有雙持」這一種狀態，沒有多個子類型）。雙持熟練度與 5 個 `weaponType` 熟練度**並行、互不影響**：雙持攻擊命中時，除了照 D3 規則餵給對應的 `weaponType`（一個或兩個），**額外**也餵給 `dualWieldProficiency`；雙持等級的加成套用邏輯獨立於武器類型加成，兩者疊加生效（見 D4/D5 的雙持段落）。

### D3. 熟練度取得規則：命中互斥判定，雙手武器各自累積，雙持額外累積 `dualWieldProficiency`
在 `performAttack()` 對玩家攻擊分支中：
- `actor === player` 且該次攻擊**沒有**被 `target.dodgeChance` 判定閃避時，才計入熟練度。
- 判定為爆擊：對應維度的 `exp += 5`；判定為一般命中：`exp += 1`。兩者互斥（一次攻擊只會是其中一種結果），不疊加。
- 讀取角色**所有**手部槽位（`equipment.LEFT_HAND`/`equipment.RIGHT_HAND`）中，物品帶有 `weaponType` 的項目：
  - 兩手都是武器類道具（雙持）：兩個 `weaponType`（相同則只計一次）**各自**獲得本次攻擊的熟練度，**同時** `dualWieldProficiency` 也獲得本次攻擊的熟練度（三者互不折抵，雙持攻擊一次最多同時餵 3 筆：兩個 `weaponType` + 1 個 `dualWieldProficiency`，雙持同類型武器時是 2 筆）。
  - 只有一手是武器：只有該 `weaponType` 獲得，`dualWieldProficiency` 不獲得。
  - 兩手皆非武器類道具（例如雙防具或空手）：該場戰鬥不累積任何熟練度，含 `dualWieldProficiency`。
- 熟練度是**戰鬥結算的副作用**，比照 `recordEncounteredArchetypes`/`recordDefeatedArchetypes` 的模式，在 `CombatService.resolve()` 內、確定 `victory`／回傳前一次性寫入（避免每次攻擊各自一次 Firestore 寫入）。

> ASSUMPTION（延伸自使用者對「不特別區分 LEFT_HAND/RIGHT_HAND」的指示）：雙持兩把不同類型武器時兩個類型都計熟練度、都套用各自的數值加成（見 D4），這是目前最一致的推論，但尚未經過玩法測試驗證「雙倍熟練度成長」是否需要額外折扣；先如此實作，數值感受不對時回來調整，不影響資料結構。新增的 `dualWieldProficiency` 進一步放大這個效果（雙持一次攻擊最多同時累積 3 份熟練度），是使用者明確要求「新增一種雙持熟練度」的直接結果，不是意外——這代表雙持在「熟練度成長速度」上會明顯快於單手＋防具，屬於刻意的雙持建置獎勵。

### D4. 熟練等級曲線（Lv.1～10）與加成分配——刻意做成長線成長，不追求短期可見
比照提案文件的「數值提升→被動解鎖」交錯節奏，但 exp 門檻刻意拉大到「長期投入才看得到成果」的幅度——熟練度不是一場冒險就能練起來的資源，是角色長期使用同一類型武器的累積痕跡：

| Lv | 需求 exp（累積） | 加成 |
|---|---|---|
| 1 | 0 | 基礎（無加成） |
| 2 | 300 | ATK +2% |
| 3 | 800 | critChance +1% |
| 4 | 1,800 | 解鎖類型被動 A |
| 5 | 3,600 | ATK +2% |
| 6 | 6,500 | 解鎖類型被動 B |
| 7 | 11,000 | critChance +1% |
| 8 | 18,000 | 被動 A 效果加強 |
| 9 | 28,000 | ATK +2% |
| 10 | 42,000 | Mastery：被動 B 效果加強 |

以一般命中 +1／爆擊 +5 的取得速度換算，Lv.10 大致需要數萬次命中量級的長期投入（依角色爆擊率、每場戰鬥攻擊次數而異），刻意做成「幾乎不會在短期內點滿」的長線成長曲線，讓 Lv.4/6/8/10 的被動解鎖/強化成為真正的里程碑，而不是幾場冒險就能兌現的獎勵。

> ASSUMPTION（無設計文件背書，比照 `combat-engine`/`weapon-weight-class` 既有「數值曲線留待 tasks/平衡調整」慣例）：上述 exp 門檻與加成幅度是可調參數，實作時集中放在 `server/constants/` 一處，方便後續平衡；曲線本身刻意設計得陡峭（每級門檻約 1.6～1.8 倍成長），tasks 階段若實測後升級速度仍偏快，優先調整門檻數值而非改變機制。

數值加成（ATK%/critChance）套用時機：在 stats 管線新增一段 `applyProficiencyStats`，接在 `applyTalentStats` 之後；**每一個目前裝備於雙手中、帶有 `weaponType` 的武器**都各自套用其類型當前等級的加成（雙持不同類型時兩者加成疊加；雙持同類型時該類型加成只算一次，不因裝備兩把同類型武器而翻倍）。

`dualWieldProficiency` 沿用**同一份** Lv.1～10 exp 門檻表（不另外設計一條曲線，減少平衡變數），加成內容改為型別無關的通用戰鬥加成，套用時機同樣在 `applyProficiencyStats` 內、`weaponType` 加成之後，且只在角色**目前雙手皆裝備武器類道具**時生效（卸下其中一手變成單持，`dualWieldProficiency` 的加成立即停止套用，但 exp/level 不歸零）：

| Lv | 加成 |
|---|---|
| 2 | ATK +1% |
| 3 | critChance +0.5% |
| 4 | 解鎖雙持被動 A |
| 5 | ATK +1% |
| 6 | 解鎖雙持被動 B |
| 7 | critChance +0.5% |
| 8 | 被動 A 效果加強 |
| 9 | ATK +1% |
| 10 | Mastery：被動 B 效果加強 |

> ASSUMPTION：雙持加成刻意設定得比單一武器類型的加成（D4 上表）更保守（+1% 而非 +2%），因為雙持已經透過「兩個 `weaponType` 加成疊加」拿到額外好處，`dualWieldProficiency` 的加成只是錦上添花，不應該讓雙持在數值上過度碾壓單持＋防具的組合。

### D5. 被動技能＝命中/爆擊時自動觸發的戰鬥效果，只存在單場戰鬗
「被動技能」不是玩家主動操作的技能，而是達到對應熟練等級後，戰鬗中特定條件（命中/爆擊/連續命中）自動觸發的效果，只在該武器類型當前裝備時生效，效果只存在於本場戰鬥（不落地 Firestore，比照 `RunModifier` 的「計算期-only transform」慣例）。

`CombatUnit` 新增：
- `statusEffects: { stat: keyof Stats; magnitude: number; remainingAttacks: number }[]`——可套用在**任一** `CombatUnit`（含敵方單位，供「破防」類被動使用），每次該單位行動前先疊加當前生效效果到其有效 stats，行動後 `remainingAttacks` 遞減、歸零則移除。
- `consecutiveHitCount: number`——玩家單位專用，命中（未被閃避）時 +1，被閃避時歸零，供「連續命中」類被動判斷觸發。

5 個武器類型的具體被動（A：Lv.4 解鎖／Lv.8 強化；B：Lv.6 解鎖／Lv.10 Mastery 強化）：

| 類型 | 被動 A（Lv.4 → Lv.8） | 被動 B（Lv.6 → Lv.10 Mastery） |
|---|---|---|
| FIST | 爆擊後對自身附加 `actionIntervalSec -0.3` 的效果，持續 2 次攻擊 → 持續 3 次攻擊 | `consecutiveHitCount` 達 4 時，對自身附加下一擊必中的 `critChance +15%`（觸發後計數歸零）→ 門檻降到 3、+25% |
| BLADE | 爆擊時傷害計算額外 +20% → +35%（直接在 `computeDamage` 呼叫端疊加，不走 `statusEffects`） | 目標當前 `hp / hpMax >= 0.7` 時，該次傷害 +15% → 門檻降到 0.5、+25% |
| BLUNT | 命中後對**目標**附加「受到傷害 +15%」效果，持續 2 次攻擊 → +25% | 爆擊時 30% 機率對目標的 `nextAttackAt` 額外 `+0.5 * target.actionIntervalSec` → 機率提升到 50% |
| POLEARM | 觸發濺射時，次要目標傷害比例由 50% 提升到 65% → 80% | 觸發 AoE 時，主目標額外 +10% 傷害 → +20%，且自身 `aoeChance`/`splashChance` 額外 +5%（僅裝備該類型時） |
| RANGED | 命中（未被閃避）後對自身附加 `critChance +5%`，持續 1 次攻擊 → 持續 2 次攻擊 | `consecutiveHitCount` 達 5 時，下一擊必定爆擊 → 門檻降到 3 |

> ASSUMPTION：上表數值為初版平衡起點，實作時集中放在 `server/constants/`，比照 D4 留待調整。BLADE 的被動屬於「傷害計算當下疊加」而非「持續 N 次攻擊」的效果，不使用 `statusEffects`，需要在 `computeDamage`/`performAttack` 呼叫端另外處理一個獨立分支——這是刻意的例外，不代表 `statusEffects` 形狀要因此擴大。

`dualWieldProficiency` 額外有自己的一組被動（型別無關，任何雙持組合都適用，A：Lv.4 解鎖／Lv.8 強化；B：Lv.6 解鎖／Lv.10 Mastery 強化）：

| 被動 A（Lv.4 → Lv.8） | 被動 B（Lv.6 → Lv.10 Mastery） |
|---|---|
| 雙持攻擊命中時，5% 機率對主目標額外觸發一次追加攻擊（傷害為本次攻擊的 50%，沿用本次的爆擊結果，不再另外判定 AoE/濺射）→ 機率提升到 10% | 雙持時 `aoeChance`/`splashChance` 額外 +5%（疊加在武器本身數值與 POLEARM 被動之後）→ 額外 +10% |

> ASSUMPTION：追加攻擊固定用「本次攻擊的爆擊結果」而不獨立判定，是為了避免遞迴觸發（追加攻擊本身若又能觸發追加攻擊/AoE/濺射，複雜度會失控）——這是刻意的簡化邊界，tasks 階段不應該繞過這個限制。

### D6. 全身裝備重量制：`weight` 取代 `weaponWeightClass` 成為權威欄位，超重不擋裝備、改為固定懲罰
`ItemTemplate`/`ItemInstance` 新增 `weight: number`，涵蓋全部 6 個裝備槽位（比照既有 `weaponWeightClass` 的適用範圍）。`weaponWeightClass`（LIGHT/MEDIUM/HEAVY）不再是獨立指定的欄位，改為由 `weight` 落在哪個區間自動推導：

| `weight` 區間 | 推導出的 `weaponWeightClass` |
|---|---|
| 1～3 | LIGHT |
| 4～6 | MEDIUM |
| 7 以上 | HEAVY |

> ASSUMPTION：區間門檻為初版建議值，實作時抽成常數，方便配合既有 `weapon-weight-class` capability 的數值曲線一起調整。既有以 `weaponWeightClass` 做數值曲線/生成邏輯判斷的程式碼（`item.service.ts` 的 `rollStats`/`sumEquipmentStats`、`items.ts` 範本產生器）行為不變，只是這個分類值的來源從「範本直接寫死」改成「從 `weight` 算出來」。

裝備動作（`equipItem()`）**不**因總重超過 `carryCapacity` 而拒絕——移除先前版本設計中「雙手重量驗證擋裝備」的規則。改為在角色 stats 計算管線新增 `applyWeightOverloadPenalty`，接在 `applyTalentStats`（`carryCapacity` 已確定最終值）之後：加總角色目前 6 個槽位已裝備道具的 `weight`，若總和超過 `carryCapacity`，依超出量套用固定懲罰表（疊加，非只取最高一級）：

| 超出量 | 額外懲罰 |
|---|---|
| 超出 1 點 | `actionIntervalSec += 0.5` |
| 超出 2 點 | 額外 `dodgeChance -= 0.03` |
| 超出 3 點 | 額外 `critChance -= 0.03` |
| 每多超出 1 點 | 額外 `DEF -= 1`（超出 4 點以上的兜底規則，避免懲罰表要無限列舉） |

> ASSUMPTION：懲罰表數值與級距為初版平衡起點，實作時抽成常數表。此懲罰**獨立於**既有 HEAVY 道具本身的 `actionSpeedMod`/`dodgeChanceMod` 懲罰（及其 STR+CON 折扣）——兩者並存，不互相取代、不互相折抵。

`weight` 數值由內容端逐一設定（不做公式推導），design 只給建議區間讓內容維持手感一致（對應上面的推導表）。

### D7. 攻擊目標型態：AoE／濺射／單體，雙持時取兩手較高機率
`ItemTemplate` 新增 `aoeChance?: number`（預設 0）與 `splashChance?: number`（預設 0），只對帶 `weaponType` 的武器類道具有意義。`performAttack()` 命中判定通過（沒被閃避）後：
1. 決定本次攻擊生效的 `aoeChance`/`splashChance`：取角色雙手中「帶 `weaponType` 的道具」各自數值的**較高者**（雙持時取 max，不相加；只有一手是武器時直接用該手數值）。
2. roll `aoeChance` → 觸發則對當前 wave 全部存活敵人各自計算一次傷害（含各自獨立的爆擊判定），不打折。
3. 否則 roll `splashChance` → 觸發則主目標（原本的 `alive[0]`）全額傷害，另外對最多 2 個次要目標（`alive[1]`、`alive[2]`，不足則略過）造成 50% 傷害，次要目標不獨立判定爆擊（沿用主目標的爆擊結果）。
4. 都沒觸發 → 現行單體行為不變。

`combatLog` 需要能表示「一次攻擊命中多個目標」——沿用現有 `CombatLogEntry` 逐目標各推一筆（`actorId` 相同、`targetId` 各自不同），前端 playback 不需要另外改資料結構即可逐筆重放。

> ASSUMPTION：AoE/濺射目前只對玩家攻擊生效（敵人維持單體攻擊），因為現有敵人 archetype 完全沒有這類欄位、且提案沒有要求敵人也要有這個機制。

### D8. 新增科技槍械類 `RANGED` 武器內容
延續世界觀既有的 cyberpunk/工業風格（量子鑽掘機械臂、神經脈衝拳套、全息偏導護盾等），`RANGED` 類型武器以「科技槍械」為主題（例如電磁手槍、雷射步槍、脈衝弩），不強調現實世界的傳統弓弩美術風格。內容細節留待 tasks 階段逐一設計。

### D9. 新增武器熟練度相關成就，每個類型（含雙持）各自一個 Lv.10 成就
延續 `achievements` capability 的「常駐、終身限領一次、達成後需明確領取」模式（見 `openspec/specs/achievements/spec.md`）。比照現有 `KILL_GKBOT`/`KILL_HUMAN` 各自獨立 `AchievementType` 的慣例（而非用一個欄位篩選子類型——現有 `AchievementTemplate` schema 沒有這種篩選欄位，不新增），為 6 個維度（5 個 `weaponType` ＋ `dualWieldProficiency`）各自新增一個 `AchievementType`：`WEAPON_MASTERY_FIST`/`WEAPON_MASTERY_BLADE`/`WEAPON_MASTERY_BLUNT`/`WEAPON_MASTERY_POLEARM`/`WEAPON_MASTERY_RANGED`/`WEAPON_MASTERY_DUAL_WIELD`（皆為 PEAK 模式、`compare: GTE`，回報該維度每次升級後的等級，達成條件是「曾經讓該維度的等級達到 10」）。另外保留一個共用的 `WEAPON_PROFICIENCY_LEVEL`（PEAK/GTE）供「任一 `weaponType` 達到 Lv.5」的早期里程碑使用（不含 `dualWieldProficiency`——它有自己獨立的 Lv.10 成就，不需要一個額外的 Lv.5 版本），以及 `WEAPON_TYPES_MASTERED`（CUMULATIVE）供「集滿全部 5 個 `weaponType` 的 Lv.10」使用，`targetCount = 5`（不含 `dualWieldProficiency`，維持「5 種基本武器類型」的原意，雙持精通是獨立的第 6 個成就，不併入集齊計算）。

新增 7 個成就範本（`server/constants/templates/achievement.ts`）：

| templateId | type | name | targetCount | mode | rewardGems |
|---|---|---|---|---|---|
| `weapon_apprentice` | `WEAPON_PROFICIENCY_LEVEL` | 熟能生巧 | 5 | PEAK/GTE | 5 |
| `fist_mastery` | `WEAPON_MASTERY_FIST` | 鐵拳宗師 | 10 | PEAK/GTE | 8 |
| `blade_mastery` | `WEAPON_MASTERY_BLADE` | 劍刃宗師 | 10 | PEAK/GTE | 8 |
| `blunt_mastery` | `WEAPON_MASTERY_BLUNT` | 重擊宗師 | 10 | PEAK/GTE | 8 |
| `polearm_mastery` | `WEAPON_MASTERY_POLEARM` | 長柄宗師 | 10 | PEAK/GTE | 8 |
| `ranged_mastery` | `WEAPON_MASTERY_RANGED` | 槍械宗師 | 10 | PEAK/GTE | 8 |
| `dual_wield_mastery` | `WEAPON_MASTERY_DUAL_WIELD` | 雙持宗師 | 10 | PEAK/GTE | 8 |
| `pentagonal_mastery` | `WEAPON_TYPES_MASTERED` | 五絕宗師 | 5 | CUMULATIVE | 10 |

> ASSUMPTION：拿掉了先前版本中「任一類型達到 Lv.10」的單一通用成就（`weapon_master`），改用 6 個各自獨立的 Lv.10 成就——這是使用者明確要求「每種武器都新增...的成就」的直接對應，避免與 6 個獨立成就產生名稱/達成條件上的重複混淆。

`server/services/progress-tracker.service.ts` 的 `ACHIEVEMENT_EVENT_TYPE` 新增事件對應：`WEAPON_LEVEL_REACHED -> WEAPON_PROFICIENCY_LEVEL`（任一 `weaponType` 升級時觸發，供 `weapon_apprentice` 使用）、`WEAPON_LEVEL_REACHED_<TYPE>`（6 個，各自對應到自己的 `WEAPON_MASTERY_<TYPE>`）、`WEAPON_TYPE_MASTERED -> WEAPON_TYPES_MASTERED`。`CombatService.resolve()` 在呼叫 `recordWeaponProficiency()` 後，依回傳的「本場戰鬥各維度升級前後的 level」：
- 每個實際升級的 `weaponType` 觸發一次 `WEAPON_LEVEL_REACHED`（amount=新等級）與一次對應該類型的 `WEAPON_LEVEL_REACHED_<TYPE>`（amount=新等級）。
- 若 `dualWieldProficiency` 本場有升級，觸發一次 `WEAPON_LEVEL_REACHED_DUAL_WIELD`（amount=新等級），不觸發通用的 `WEAPON_LEVEL_REACHED`（`weapon_apprentice` 不計雙持，見上）。
- 每個 `weaponType`（不含雙持）首次跨過 Lv.10 的額外觸發一次 `WEAPON_TYPE_MASTERED`（amount=1）。

### D10. UI 改版：屬性/戰鬥數值面板搬到「角色」頁，主畫面精簡
現況（`app/components/game/character-stage/characterStage.vue`）：主畫面（`/main`）由上至下是 `AttributePanel`（LV/職業/屬性/可分配屬性點）→ `CombatStats`（戰鬥數值，ATK/DEF/… 每格 col-4）→ 裝備欄位（角色圖像左右各 3 格）→ 冒險 CTA。背包頁（`app/pages/inventory.vue`，`/inventory`）目前是頂部裝備總覽 + 篩選 + 格狀背包物品列表；`BottomNav`（`app/components/game/layouts/bottomNav.vue`）的 `inventory` 項目 label 目前是「背包」（`inventory` capability spec 裡記錄這個 label 曾經是「角色」，後來改成「背包」——這次等於改回去，並讓內容名副其實）。

**改版後**：
- **主畫面**移除 `AttributePanel`／`CombatStats` 兩個子元件的掛載（元件檔本身不刪除，只是不再被 `characterStage.vue` 引用——遷移到角色頁後複用同一份元件）。主畫面只剩：LV/職業/暱稱/戰力 tag、裝備欄位（左右各 3 格）、角色圖像、章節進度、開始冒險 CTA。屬性點分配互動（`allocating`/`pendingAllocation` 那組邏輯）整包搬到角色頁的 script。
- **角色頁**（`/inventory`，`BottomNav` label 改回「角色」）由上至下：`AttributePanel` → `CombatStats` → **新增**武器熟練度面板 → 頂部裝備總覽（含新增的負重狀態）→ 篩選 → 格狀背包物品列表。
- **武器熟練度面板**（新元件，建議命名 `weaponProficiencyPanel.vue`，放在 `app/components/game/inventory-page/` 或現有 inventory 相關目錄下）：6 條進度（5 個 `weaponType` + `dualWieldProficiency`），每條顯示目前等級（Lv.1～10）、往下一級的 exp 進度條、已解鎖的被動技能名稱清單（達到 Lv.4/6/8/10 的類型才顯示對應被動，未解鎖的不列出，不做「灰階顯示鎖定中」的额外設計——熟練度是長線資源，不需要提前劇透未來被動內容）；只列出角色曾經使用過的類型（`weaponProficiency` 有 key 的），從未使用過的類型顯示「尚未使用」的空狀態，不顯示成長曲線細節。
- **裝備總覽負重顯示**：既有的 6 格裝備總覽區塊（`inventory.vue` 頂部）旁新增「目前重量／`carryCapacity`」文字（例如 `18 / 20`），總重超過上限時以警示色（比照既有 `warning` 色）呈現該數字，不需要額外彈窗說明（懲罰內容已經反映在下方 `CombatStats` 的數值上，玩家自己會看到 `actionIntervalSec`/`dodgeChance` 變差）。
- **物品詳情 dialog**（`itemDetailDialog.vue`）：非武器 `EQUIPMENT` 顯示 `weight`；武器類（有 `weaponType`）額外顯示武器類型的圖示/文字標籤（沿用現有稀有度色塊/圖示的呈現風格，不需要新的視覺語言）。
- **戰鬥演出**：AoE/濺射/被動觸發都只是讓單場戰鬥的 `combatLog` 多幾筆 `ATTACK`/`CRIT` 事件（見「目前戰鬥是先算完再演」這一版對話的結論），不新增播放邏輯或元件；但既有的傷害飄字時間軸需要調整，見 D11。
- **成就頁**：新增的 7 個成就範本走既有成就列表渲染邏輯，不需要新畫面/新元件。

> ASSUMPTION：武器熟練度面板的視覺細節（進度條樣式、被動技能文字怎麼措辭呈現）留待實作時比照現有 `combatStats.vue`/`attributePanel.vue` 的像素風格自行設計，design 只定內容範圍與資訊架構，不畫 wireframe。

### D11. 戰鬥演出：傷害飄字放大＋延長顯示時間
現況（`app/composables/useCombat.ts`、`app/components/game/adventure/combatResultPanel.vue`）：命中/爆擊/閃避共用同一個 `damageTextFx`機制與同一個時長常數 `DAMAGE_TEXT_FX_MS = 700`（毫秒），CSS 動畫 `combat-result-panel-damage-text-float` 也是固定 `0.7s`；爆擊只在樣式上放大（`__damage-text--crit` font-size 18px，內含 `__damage-text-crit-label` 10px 的「暴擊」字樣），時長跟一般命中相同。

這次 AoE/濺射/被動觸發會讓同一波動作短時間內出現更多筆傷害事件（見 D7、D5），飄字看一眼就消失更容易漏看，所以：

- **傷害數字（一般命中＋爆擊的數字本身）**：顯示時長從 700ms 延長 800ms，變成 **1,500ms**。
- **爆擊等傷害效果文字**（爆擊的放大樣式＋「暴擊」字樣）：在上面延長後的基礎上，再額外延長 500ms，變成 **2,000ms**；字級同時加大——`__damage-text--crit` 從 18px 提升到 22px，`__damage-text-crit-label` 從 10px 提升到 13px。
- **閃避文字**：不在「傷害」範疇內（沒有傷害數值），維持原本 700ms、原本字級不變。

拆成兩個獨立的時長常數（原本共用一個 `DAMAGE_TEXT_FX_MS`）：

```
DAMAGE_TEXT_FX_MS_NORMAL = 1500  // ATTACK（一般命中）＋ DODGE 沿用原始 700ms，不套用這個新常數
DAMAGE_TEXT_FX_MS_CRIT   = 2000  // CRIT 事件專用
```

`useCombat.ts` 觸發 `damageTextFx` 的 `setTimeout` 需依事件的 `action`（`ATTACK`/`CRIT`/`DODGE`）挑對應時長；`combatResultPanel.vue` 的 CSS 動畫 `combat-result-panel-damage-text-float` 需要拆成一般/爆擊兩個 duration 對應的 keyframe 動畫（或改用 CSS variable 控制 duration），確保 JS 計時器移除 DOM 的時間點跟 CSS 動畫播放完的時間點對齊，不要出現「動畫還在飄但 DOM 已經被拔掉」的閃爍。

> ASSUMPTION：延長後的時長是否會讓短時間內連續多筆飄字互相重疊、蓋住後面事件的畫面，需要實作後用 AoE（一次命中多個目標）實測；若視覺上太擠，優先調整「同一單位飄字堆疊時的位移量」而不是縮短時長（延長時長是這次的明確需求）。字級的實際數值（22px/13px）是初版起點，tasks 階段可依實機畫面比例微調，不影響時長邏輯。

## Risks / Trade-offs

- **[戰鬥計算量增加]** AoE 對整個 wave 逐一計算傷害＋狀態效果 tick，`MAX_ROUNDS=500` 的安全上限與現有效能特性需要重新跑一次 `combat.service.test.ts` 的效能相關測試確認沒有明顯劣化 → 若有問題，AoE 傷害計算可以跳過逐目標爆擊判定（濺射已採此簡化）。
- **[全身超重懲罰是 BREAKING 變更]** 玩家現有存檔可能已經裝備了「用未來標準會超重」的組合 → 不阻擋任何裝備動作，超重只反映在下次 stats 計算的懲罰上，玩家可以自行選擇卸下裝備或接受懲罰，不強制遷移。
- **[被動效果系統範圍蔓延風險]** 5 類型 × 2 個被動＝10 種效果，且新增「作用於目標」與「連續命中計數」兩種擴充 → design 明確列出每個效果的具體觸發條件與形狀（D5 表格），tasks 階段如果需要表格以外的觸發條件，回來改 design 而不是繞過限制硬做。
- **[熟練度加成隨換武器切換，可能造成裝備-卸下刷加成疑慮]** 加成只認「目前裝備的武器類型」，不是「歷史最高等級」——這是提案原本的設計意圖（熟練度綁類型不綁武器實例），非 bug。
- **[雙持三倍熟練度成長的平衡疑慮]** D2b/D3——雙持不同類型武器時一次攻擊最多同時餵 3 筆熟練度（兩個 `weaponType` + `dualWieldProficiency`）——這是使用者明確要求的設計，但會讓雙持在「熟練度成長總量」上明顯快於單持＋防具，即使 D4 已刻意把 `dualWieldProficiency` 本身的加成調保守；若之後平衡測試發現雙持成長過快，可以在 D3 的寫入邏輯加一個「雙持時各自 exp 打折」的乘數，不影響資料結構。
- **[曲線過陡可能讓玩家感受不到中期進度]** D4 的門檻刻意拉高，Lv.4（第一個被動解鎖）前的門檻也不算低（1,800 累積），中期玩家可能覺得「練了很久看不到變化」→ 這是刻意的設計取捨（熟練度是長線資源，不是每場冒險都有感的短期成長），D9 的 `weapon_apprentice`（Lv.5）成就用來在真正的第一個階段性里程碑給予明確回饋；若實測後 Lv.2/Lv.3 的早期門檻也讓玩家覺得「完全沒感覺」，可以只調整早期（Lv.2～4）門檻使其相對平緩，Lv.5 之後維持陡峭，不需要整條曲線一起重新設計。

## Migration Plan

- `character.weaponProficiency`、`character.dualWieldProficiency` 新增欄位，`characterSchema` 分別用 `.default({})`／`.default({ exp: 0, level: 1 })` 相容既有文件（不需要一次性遷移腳本，讀取時視為初始值）。
- 既有 `ItemTemplate` 需要一次性人工分類＋填入欄位：所有武器類道具加 `weaponType`/`aoeChance`/`splashChance`，全部 6 槽位的 `EQUIPMENT` 道具加 `weight`（並移除原本獨立寫死的 `weaponWeightClass`，改為程式碼算出）；`ItemInstance` 這些欄位在 `generateItemInstance()` 從 template 複製即可，不需要對已存在的 `items` 文件做欄位回填（舊物品缺 `weight` 時，讀取端以 0 處理，不計入超重懲罰，不影響現有裝備繼續使用）。

## Open Questions

- D3/D7 的雙持規則（熟練度雙倍累積、attack pattern 取 max）是初版合理推論，需要在 tasks 實作後配合實際數值測試手感，必要時回來調整（不影響資料結構）。
- POLEARM/RANGED 目前完全沒有現有武器範本，tasks 階段需要至少各設計 1～2 把新武器；`RANGED` 明確走科技槍械路線（見 D8）。
- D6 超重懲罰表的級距（每 1 點一個新懲罰 vs 每 N 點一個）需要接上實際 `weight`/`carryCapacity` 數值後再校正手感。
