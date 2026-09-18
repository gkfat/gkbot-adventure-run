## Context

`combat-engine`（`server/services/combat.service.ts`）目前是純自動攻防：一場戰鬥用 discrete-event schedule（每個 `CombatUnit.nextAttackAt`）決定行動順序，每次行動只呼叫 `performAttack`（dodge → crit → `computeDamage` → 寫入一筆 `CombatLogEntry`）。`CombatLogEntry.action` 目前只有 `'ATTACK' | 'CRIT' | 'DODGE' | 'DEATH'`。5 個可選職業除了初始 `attributes` 外沒有戰鬥風格差異，`EnemyArchetype`（`server/constants/combat.ts`）也完全沒有技能欄位。

角色既有的養成/資源軌跡：`talentPoints`（`character-talents`）、`weaponProficiency`/`dualWieldProficiency`（`weapon-proficiency`，Lv1~10 exp 門檻表、戰鬥結算時一次性更新）、`gold`/`gems`（`shop`/`equipment-gacha`）。技能系統要新增的「碎片」是一種新的、以 `skillId` 為 key 的資源，語意上更接近「集滿數量觸發一次性解鎖」而非連續數值，因此不比照 `talentPoints`（整數點數）也不比照 `weaponProficiency`（exp 曲線），而是獨立的 `Record<skillId, number>` 計數器。

## Goals / Non-Goals

**Goals:**
- 定義一套角色與敵人共用的技能效果分類（`SkillEffectKind`），5 個可選職業各自 2~3 個呼應敘事的技能，部分敵人 archetype 指派技能。
- 技能碎片的取得（冒險掉落 + 商店購買）、解鎖、等級養成（戰鬥觸發累積 exp + 碎片主動強化）、依角色等級開放的佩戴欄位（最多 3 個）。
- `combat-engine` 加入「充能 → 到時觸發 → 效果結算」的技能行動，與既有普通攻擊排程並存，`combatLog` 新增 `SKILL` 事件。
- 角色頁「技能」tab：比照 `inventory` 既有格狀 UI 呈現已解鎖/未解鎖技能，點擊開 dialog。

**Non-Goals:**
- 不做玩家主動施放技能的操作介面——戰鬥仍是伺服器單次決定性模擬，技能到時自動觸發，玩家不能在戰鬥中手動選擇施放時機。
- 不做技能重置/退還碎片機制（比照 `character-talents`「不支援重置」的既有慣例）。
- 不做技能之間的連動/combo 系統，每個技能效果獨立結算，不互相觸發。
- 不修改既有武器熟練度/天賦的加成計算順序，技能效果在戰鬥模擬中是獨立的行動分支，不併入 stats 計算管線。

## Decisions

### 1. 技能效果分類：11 種 `SkillEffectKind`，共用同一個 `SkillEffect` 資料形狀
在使用者要求的 7 類（造成大量傷害-單體/AOE/濺射算 3 類、凍結行動、短暫增加攻速、恢復生命值、增強防禦、增加爆擊機率、降低敵人防禦）之外，新增 2 類，理由是兩者都是既有戰鬥數值模型（HP/傷害）可直接表達、且能讓「防禦系」「debuff 系」職業（如 `scholar`）有更多手感差異：

- `DAMAGE_SINGLE`：對目前普通攻擊目標造成 `ATK × multiplier` 傷害。
- `DAMAGE_AOE`：對本波所有存活敵人各造成 `ATK × multiplier` 傷害。
- `DAMAGE_SPLASH`：主目標 `ATK × multiplier`，其餘存活敵人 `ATK × multiplier × splashRatio`。
- `FREEZE`：目標的下一次行動延後 `durationSec` 秒（`nextAttackAt += durationSec * 1000`），不造成傷害。
- `HASTE_SELF`：自身 `actionIntervalSec` 短暫下降 `percent`%，持續 `durationSec` 秒。
- `HEAL_SELF`：恢復自身 `hpMax × percent`% 的 HP（不超過 `hpMax`）。
- `DEFENSE_UP`：自身 `DEF` 短暫提升 `percent`%，持續 `durationSec` 秒。
- `CRIT_UP`：自身 `critChance` 短暫提升 `flatPercent` 個百分點，持續 `durationSec` 秒。
- `ARMOR_BREAK`：目標 `DEF` 短暫降低 `percent`%，持續 `durationSec` 秒。
- `DOT`（新增建議）：對目標造成 `ATK × multiplier` 的初始傷害，並額外附加「每次目標即將受到傷害前，先結算一次 `tickDamage`，持續 `ticks` 次」的持續傷害效果。
- `SHIELD`（新增建議）：為自身建立 `hpMax × percent`% 的護盾值，護盾耗盡前優先吸收傷害，護盾持續至耗盡或戰鬥結束（不隨時間衰減）。

```ts
// shared/types/adventure.ts（新增）
export type SkillEffectKind =
  | 'DAMAGE_SINGLE' | 'DAMAGE_AOE' | 'DAMAGE_SPLASH'
  | 'FREEZE' | 'HASTE_SELF' | 'HEAL_SELF'
  | 'DEFENSE_UP' | 'CRIT_UP' | 'ARMOR_BREAK'
  | 'DOT' | 'SHIELD';

export type SkillEffect = {
  kind: SkillEffectKind;
  multiplier?: number;      // 傷害類：ATK 倍率
  splashRatio?: number;     // DAMAGE_SPLASH 專用：副目標傷害佔比
  percent?: number;         // HEAL_SELF/DEFENSE_UP/ARMOR_BREAK/SHIELD 的百分比幅度
  flatPercent?: number;     // CRIT_UP 專用：直接加算的百分點
  durationSec?: number;     // FREEZE/HASTE_SELF/DEFENSE_UP/ARMOR_BREAK 的持續秒數
  tickDamage?: number;      // DOT 專用：每次 tick 的固定傷害（依技能等級套用倍率後的定值）
  ticks?: number;           // DOT 專用：tick 次數
};
```

**替代方案考量**：曾考慮做成外掛式 effect plugin（每種 kind 一個 handler 介面），但目前只有 11 種、且都能表達成「對 ATK/DEF/HP/actionIntervalSec/critChance 其中之一做一次性或持續性調整」，比照 `SkillEffect.kind` + 少量 optional 數值欄位（沿用 `talent-tree`/`weapon-proficiency` 的 `TalentEffect` 慣例）足夠，避免過度設計。

### 2. 角色技能與敵人技能分開定義的靜態資料，各自對應各自的擁有者
```ts
// shared/types/adventure.ts（新增）
export type CharacterSkill = {
  skillId: string;          // 全域唯一
  archetypeId: string;      // 對應 characterArchetypes.ts 的可選職業
  name: string;
  description: string;
  icon: string;             // GameCommonPixelIcon 慣例的圖示 key
  effect: SkillEffect;
  chargeSec: number;        // 靜態充能秒數，不隨等級變動
  unlockFragmentCost: number;
  effectByLevel: SkillEffect[]; // index 0 = Lv.1 效果，最多 10 筆（Lv.1~10）
};

export type EnemySkill = {
  skillId: string;
  name: string;
  effect: SkillEffect;      // 敵人技能固定強度，不吃等級成長
  chargeSec: number;
};
```
- `CharacterSkill.effectByLevel` 讓「等級提升效果增強、充能時間不變」直接落實成一份查表資料，而非另立一套倍率公式——與 `character-talents` 的「固定數值 perRank」風格一致，方便美術/數值端直接調整表格，不需要理解額外公式。
- `EnemySkill` 不需要等級成長（敵人本身已有 `getStatMultipliers` 依 enemyLevel 縮放），效果強度固定，只挑選需要技能豐富度的 1~2 個敵人 archetype 掛上，其餘維持無技能、向後相容。
- 資料檔位置：角色技能沿用 `server/constants/templates/characterSkills.ts`（`CHARACTER_SKILLS: Record<archetypeId, CharacterSkill[]>`），敵人技能沿用 `server/constants/combat.ts` 慣例，`EnemyArchetype` 新增可選欄位 `skill?: EnemySkill`。

### 3. 技能碎片與角色文件新增欄位
```ts
// Character 文件新增欄位
skillFragments: Record<string, number>;      // skillId -> 目前持有碎片數（含已解鎖後累積的多餘碎片）
unlockedSkills: Record<string, { level: number; exp: number }>; // skillId -> 已解鎖技能的等級/exp
equippedSkillIds: (string | null)[];          // 固定長度 3，未開放/未佩戴的欄位為 null
```
- `equippedSkillIds` 固定長度 3（而非依目前開放欄位數動態變長/縮短），未開放的欄位在回應時由 API 依角色 `level` 算出的 `unlockedSlotCount` 過濾顯示，Firestore 層不需要因為升級而遷移陣列長度。
- 只有 `unlockedSkills` 中存在的 `skillId` 才可被放入 `equippedSkillIds`；解鎖動作消耗 `unlockFragmentCost` 個碎片（`skillFragments[skillId] -= unlockFragmentCost`），超額碎片保留供之後強化使用。

### 4. 技能等級：戰鬥觸發自動累積 exp（比照 `weapon-proficiency`）+ 碎片主動強化
- 新增 `SKILL_EXP_TABLE`（Lv.1~10 固定遞增門檻，獨立於 `weapon-proficiency` 的 `WEAPON_PROFICIENCY_EXP_TABLE`，因為觸發頻率與武器命中頻率量級不同），exp 達門檻時自動升級，上限 Lv.10，超過門檻的 exp 繼續累積但不再升級——與 `weapon-proficiency` 的「熟練等級曲線與升級」規則完全一致的模式。
- 戰鬥結算（`resolve()`）時，依本場戰鬥中該技能實際觸發次數，`exp += EXP_PER_SKILL_TRIGGER × 觸發次數`，與既有 `weaponProficiency`/`recordEncounteredArchetypes` 等副作用同一批次寫入。
- 新增 `POST /api/character/:characterId/skills/strengthen`：消耗玩家指定數量（不超過目前 `skillFragments[skillId]`）的碎片，依固定匯率 `FRAGMENT_TO_EXP_RATE` 轉換為該技能的 exp 並立即套用升級判定；不提供「一次全部投入」以外的限制，玩家可分批強化。

### 5. 技能佩戴欄位：`unlockedSlotCount = min(3, 1 + floor(level / 7))`
- Lv.1~6：1 格；Lv.7~13：2 格；Lv.14+：3 格（角色等級上限 30，多出的等級不再開放更多欄位）。
- `POST /api/character/:characterId/skills/equip`：body `{ skillId: string | null, slotIndex: 0 | 1 | 2 }`，驗證 `slotIndex < unlockedSlotCount`、`skillId` 存在於 `unlockedSkills` 且未出現在其他 slot（放入前若該 `skillId` 已在別的 slot，回傳 400，要求玩家先卸下，不做自動搬移），`skillId = null` 代表卸下。

### 6. `combat-engine` 整合：技能充能是與普通攻擊排程並行的獨立計時器，不取代攻擊行動
`CombatUnit` 新增 `chargingSkills: { skillId; effect: SkillEffect; chargeSec: number; readyAt: number }[]`（角色：依 `equippedSkillIds` 中已佩戴且已解鎖的技能，套用其 `effectByLevel[level-1]`；敵人：依 `EnemyArchetype.skill`，若有）。`resolve()` 既有的 discrete-event schedule 目前以「所有存活單位的 `nextAttackAt` 最小值」決定下一個行動者；本次擴充為「所有存活單位的 `nextAttackAt` 與其 `chargingSkills[].readyAt` 一起比大小」，取全域最小的下一個事件：
- 若下一個事件是某單位的 `nextAttackAt`：行為不變，走既有 `performAttack`。
- 若下一個事件是某個 `chargingSkill.readyAt`：依 `effect.kind` 結算效果（傷害類重用 `computeDamage`/`crit`/`dodge` 判定邏輯，狀態類寫入下方第 7 點的臨時狀態），寫入一筆 `SKILL` `CombatLogEntry`，並將該 `chargingSkill.readyAt = currentTime + chargeSec * 1000`（立即重新開始下一輪充能），不影響該單位自身的 `nextAttackAt`。

**替代方案考量**：曾考慮「技能觸發時取代該單位下一次普通攻擊」（類似舊版 `character-enemy-skills` 提案的資源值模型），但使用者這次明確要求「戰鬥開始時就開始充能」「充能中不受等級影響」，屬於獨立於攻擊節奏的第二條時間軸；若改成取代攻擊，`HEAL_SELF`/`DEFENSE_UP` 這類非攻擊性效果會與「觸發後仍要立即打一拳」的直覺衝突，且會與 `weapon-proficiency` 每次攻擊命中才累積熟練度的既有邏輯耦合（技能觸發若不算一次攻擊，熟練度不增加；若算，需要另外定義技能造成的傷害算不算「命中」）。獨立計時器完全不影響 `performAttack`/`weaponProficiency` 既有路徑，改動面更小、語意更清楚。

### 7. 持續性效果（`FREEZE`/`HASTE_SELF`/`DEFENSE_UP`/`ARMOR_BREAK`/`DOT`/`SHIELD`）比照「戰鬥被動效果只存在於單場戰鬥」的既有原則
`CombatUnit` 新增 `statusEffects: { kind; expiresAt?: number; remainingTicks?: number; magnitude: number }[]`，套用時機在既有的 ATK/DEF/actionIntervalSec/critChance 計算點各自檢查是否有生效中的對應 `statusEffects` 項目並疊加；`DOT` 的 tick 結算掛在「該目標下一次即將受到傷害前」與「該目標下一次輪到自己行動前」两个檢查點的較早者，確保不會遺漏 tick。`statusEffects` 只存在於 `combat.service.ts` 內部的模擬記憶體中，`resolve()` 結束即隨整個 `CombatUnit` 捨棄，不寫回 Firestore，下一場戰鬥重新從空狀態開始——與 `weapon-proficiency`「戰鬥被動效果只存在於單場戰鬥」的既有 Requirement 同一原則，本次不需要新增陳述，直接沿用。

### 8. 技能碎片掉落與商店購買
- **冒險掉落**：戰鬥勝利結算時，依既有「戰鬥掉落」LUCK 調整後的掉落機率判定（重用同一套機率曲線，不另外新增一套獨立機率表），命中時從角色目前 `archetypeId` 對應的 `CHARACTER_SKILLS` 清單中等機率隨機挑一個技能，`skillFragments[skillId] += SKILL_FRAGMENT_DROP_AMOUNT`（固定值，不吃 LUCK 加成數量，只有「是否掉落」吃 LUCK）。
- **商店購買**：`shop` 每日生成邏輯新增一種商品型態 `SKILL_FRAGMENT`（`{ currency, price, skillId, fragmentAmount }`），沿用既有「單一貨幣、一經購買標記 sold」流程，但購買結算 SHALL NOT 走「加入永久背包/裝備槽位」路徑，改為直接 `skillFragments[skillId] += fragmentAmount`——因為碎片不是 `ItemInstance`，不消耗 500 格背包容量。

### 9. 角色頁「技能」tab UI：比照 `inventory` 既有格狀 + dialog 慣例
- `app/pages/inventory.vue` 的 `TabKey` 新增 `'SKILL'`，`TAB_OPTIONS` 新增「技能」項；技能 tab 呈現固定 3 格「目前佩戴欄位」（依 `unlockedSlotCount` 顯示已開放/未開放）＋下方所有 `CHARACTER_SKILLS[archetypeId]` 的格狀清單（未解鎖格子以碎片進度環／数字遮罩呈現，不顯示效果數值細節）。
- 點擊任一技能格開啟 dialog：已解鎖顯示標題/描述/目前等級效果數值/exp 進度/強化按鈕/佩戴或卸下按鈕；未解鎖顯示標題/描述/碎片進度（`目前/門檻`），不顯示效果數值細節（比照 `enemy-bestiary` 未遇過敵人「不洩漏細節」的既有慣例）。

## Risks / Trade-offs

- **[風險] 技能充能計時器與既有攻擊排程並行，可能大幅增加 `combatLog` 事件數量，拉長逐批播放時間** → `chargeSec` 數值設計上取中高值（依效果強度分級，例如弱效果 8~10s／中效果 14~16s／強效果 20s+），單場戰鬥（通常數回合、數秒~數十秒模擬時間）內每個技能大概觸發 0~2 次，不會讓事件量暴增；具體數值於 tasks 階段參考 `docs/game-design/balance` 現有戰鬥時長曲線微調。
- **[風險] `DOT`/`SHIELD` 需要在既有傷害結算點插入額外檢查，可能與 `weapon-proficiency` 型別被動的既有臨時狀態機制互相干擾** → 兩者共用同一個 `statusEffects` 陣列與套用時機（傷害結算前），型別被動與技能效果都只是各自 push 一筆 `statusEffects` 項目，彼此不知道對方存在，疊加規則等同既有多個 Blessing/Curse 疊加的處理方式（全部加總）。
- **[風險] 敵人技能可能讓既有 `combat.service.test.ts` 假設「純攻防」的既有測試案例意外改變行為** → 只在新增的 1~2 個敵人 archetype 填 `skill` 欄位，其餘既有範本不動，既有測試使用的敵人範本不受影響。
- **[取捨] 技能碎片不走 `ItemInstance`/永久背包，是角色文件上的獨立計數器** → 碎片語意是「集滿即消耗解鎖」，不需要稀有度/裝備欄位/背包格等 `item-generation` 既有概念，獨立欄位更輕量，也避免商店購買碎片需要另外處理「背包已滿」的邊界情境。
- **[取捨] 技能等級上限 10、佩戴欄位固定 3、效果只到 `effectByLevel` 10 筆查表** → 與現有 `weapon-proficiency` Lv.1~10 的量級一致，避免另立一套很長的成長曲線；未來若要拉高上限，屬於後續 change 的擴充點。

## Migration Plan

純新增欄位/新增資料，不需要資料遷移：
- `Character.skillFragments`/`unlockedSkills`/`equippedSkillIds` 為新增欄位，既有角色文件讀取時以 `?? {}`/`?? [null, null, null]` 補預設值（比照既有 `archetypeId` legacy 相容手法）。
- `EnemyArchetype.skill` 為新增可選欄位，既有敵人範本不需要回填。
- `CombatUnit.chargingSkills`/`statusEffects` 為 `combat.service.ts` 內部模擬狀態，每次 `resolve()` 呼叫時從頭建構，不涉及 Firestore 既有 run 文件欄位變動。
- `CombatLogEntry.action` 新增 `SKILL` 列舉值屬於向後相容擴充；讀取本 change 上線前的歷史 `lastCombatSummary`／`combatLog` 不會出現 `SKILL` 事件，前端播放邏輯只需新增一個顯示分支，不影響既有分支。

## Open Questions

- `chargeSec`/`EXP_PER_SKILL_TRIGGER`/`FRAGMENT_TO_EXP_RATE`/`SKILL_FRAGMENT_DROP_AMOUNT` 等平衡數值本設計只定案機制與資料形狀，實際數值待 tasks 階段參考 `docs/game-design/balance` 現有曲線調整。
- 敵人技能要挑選哪 1~2 個既有 archetype 掛上，將於 tasks 階段依現有範本描述（`server/constants/templates/enemies.ts`）挑選語意合適者。
