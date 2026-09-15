## Why

武器目前只有 `weaponWeightClass`（LIGHT/MEDIUM/HEAVY，數值取捨用）沒有「武器類型」分類，武器之間的差異只有數值高低，玩家沒有理由因為「玩法」選擇某把武器而不是純粹比較 ATK。新增武器類型熟練度系統，讓「使用習慣」成為額外成長來源，並補上全身裝備重量制、單體/AoE/濺射攻擊型態，讓武器類型之間真正產生機制差異，而不只是換皮數值。

## What Changes

- 新增武器類型 `weaponType`（`FIST`/`BLADE`/`BLUNT`/`POLEARM`/`RANGED`）欄位，掛載於帶 `weaponType` 的武器類 `ItemTemplate`/`ItemInstance`；`weaponType` 的有無才是「是否為武器」的判斷依據，不限定裝備在 `LEFT_HAND` 或 `RIGHT_HAND` 特定一手——兩手皆可裝備武器（既有 `equipment` 機制已支援），維持現行「只區分是否為 HAND 類槽位」的中立邏輯，不新增左右手身分差異。
- 新增科技槍械類 `RANGED` 武器內容（電磁手槍、雷射步槍等 cyberpunk 風格，延續現有世界觀）。
- 新增角色武器熟練度資料：每個角色對每個 `weaponType` 各自累積 exp/level（比照 `character-talents` 的 per-character 常駐成長資料型態，非裝備綁定）。
- 熟練度取得規則：戰鬥中，角色雙手中每一件帶 `weaponType` 的裝備，其攻擊「命中」（一般命中 +1 / 爆擊 +5，兩者互斥不疊加）皆各自累積對應類型的熟練度；被閃避的攻擊不計入；雙持不同類型時兩個類型分別累積。
- 新增獨立的「雙持」熟練度維度 `dualWieldProficiency`（不是 `WeaponType` 的第 6 個值，是角色身上另一個獨立的 exp/level 資料）：雙手皆裝備武器類道具時，每次命中/爆擊**額外**累積這個維度的熟練度，與兩個 `weaponType` 的累積並行，互不折抵；只在雙手皆為武器時，其加成才生效於 stats。
- 熟練度等級曲線 Lv.1～10，數值加成（ATK%/`critChance`）與被動技能解鎖（Lv.4/6/8/10，依 `weaponType`/雙持各自設計，觸發條件見 design.md D5）雙軌成長，套用於角色目前雙手裝備的每一個武器類型（雙持時各自加成疊加）＋雙持維度本身的加成。**曲線刻意設計得陡峭**（Lv.10 需要數萬點累積 exp，見 design.md D4），熟練度是長線資源，不是幾場冒險就能練滿的短期成長。
- 新增武器熟練度相關成就：任一武器類型達到 Lv.5 一個共用成就，**5 個 `weaponType` ＋ `dualWieldProficiency` 各自獨立一個 Lv.10（Mastery）成就（共 6 個）**，以及「五種武器類型皆達到 Lv.10」的集齊型成就，比照 `achievements` capability 既有的常駐/終身限領一次模式（見 design.md D9）。
- 新增全身裝備重量制：`ItemTemplate`（全部 6 個裝備槽位）新增獨立 `weight` 欄位，取代原本獨立指定的 `weaponWeightClass`——`weaponWeightClass`（LIGHT/MEDIUM/HEAVY）改為由 `weight` 數值區間自動推導。角色總負重上限沿用既有 `carryCapacity`（`STR+CON+talentBonus.carryCapacity`，會隨屬性/天賦成長）。**裝備動作本身不因超重被拒絕**；超過上限時，系統在 stats 計算套用固定懲罰表（依超出量疊加，例如超 1 點 `actionIntervalSec +0.5s`、超 2 點額外 `dodgeChance -3%`），與既有 HEAVY 道具本身的 `actionSpeedMod`/`dodgeChanceMod` 懲罰（及其 STR+CON 折扣）並存、互不取代。物品詳情畫面需顯示 `weight` 數值。
- 新增攻擊目標型態：`ItemTemplate` 新增 `aoeChance`（觸發後攻擊當前波次全部敵人，各目標傷害不打折）與 `splashChance`（觸發後攻擊主目標＋固定 2 個次要目標，次要目標傷害打折）兩個獨立機率欄位；雙持時取兩手武器數值的較高者。攻擊時依序判定（優先 AoE，其次濺射，否則單體），未設定則預設 0（維持現行單體行為）。
- 新增最小狀態效果機制支撐被動技能（可作用於自身或目標，例如爆擊後短暫攻速提升、命中對目標施加破防），效果只存在於單場戰鬥（`CombatUnit` 暫存），不落地資料庫。
- **UI 改版**：背包頁（`/inventory`）改為「角色」頁——BottomNav 的「背包」入口改回「角色」（沿用更早之前的命名，見 `inventory` capability 既有的更新註記）。主畫面（`characterStage.vue`）移除屬性面板（`attributePanel.vue`）與戰鬥數值面板（`combatStats.vue`），這兩個元件連同屬性點分配互動一併搬移到「角色」頁，主畫面只保留裝備欄位、角色圖像/暱稱/戰力/等級、章節進度與開始冒險 CTA。「角色」頁新增武器熟練度面板（5 個 `weaponType` ＋ `dualWieldProficiency` 共 6 條等級/進度條，含已解鎖被動清單），頂部裝備總覽新增總重量／負重上限顯示與超重警示，物品詳情 dialog 新增 `weight` 與 `weaponType`（武器類）顯示。戰鬥演出（AoE/濺射/被動觸發）沿用既有的逐筆 `combatLog` 播放機制，不需要新的視覺元件，但既有的傷害飄字時長/字級需要調整：傷害數字顯示時長 +800ms（700ms → 1,500ms），爆擊等傷害效果文字（放大樣式＋「暴擊」字樣）在此基礎上再 +500ms（→ 2,000ms）並放大字級（見 design.md D11），閃避文字不在此範疇內維持不變。成就頁沿用既有成就列表樣式，不需要新畫面。

## Capabilities

### New Capabilities
- `weapon-type`: 武器類型分類（FIST/BLADE/BLUNT/POLEARM/RANGED）定義與資料掛載規則
- `weapon-proficiency`: 熟練度累積規則、Lv.1～10 曲線、數值/被動加成套用
- `weapon-attack-pattern`: 單體/AoE/濺射攻擊型態判定與傷害規則

### Modified Capabilities
- `weapon-weight-class`: `weaponWeightClass` 改為由新增的 `weight` 數值區間推導，並新增全身總重超標的固定懲罰規則
- `combat-engine`: 攻擊流程需支援目標型態判定（AoE/濺射/單體）、熟練度累積與被動觸發
- `character-progression`: 角色資料查詢回傳需新增武器熟練度、超重懲罰反映在 stats
- `achievements`: 新增 `WEAPON_PROFICIENCY_LEVEL`/`WEAPON_TYPES_MASTERED`/6 個 `WEAPON_MASTERY_<TYPE>` 成就類型與對應成就範本
- `inventory`: 背包頁改為角色頁，納入屬性/戰鬥數值/武器熟練度面板，裝備總覽新增負重狀態顯示
- `equipment`: 主畫面不再顯示屬性/戰鬥數值面板，維持精簡（只留裝備欄位/角色圖像/CTA）
- `adventure-run-presentation`: 傷害飄字延長顯示時間並放大爆擊樣式字級

## Impact

- `shared/schemas/firestore/item.schema.ts`、`server/constants/templates/items.ts`：所有武器類 `ItemTemplate`/`ItemInstance` 新增 `weaponType`/`aoeChance`/`splashChance`；全部 `EQUIPMENT` 類新增 `weight`，移除獨立寫死的 `weaponWeightClass`
- `shared/schemas/firestore/character.schema.ts`：新增 `weaponProficiency`、`dualWieldProficiency` 欄位
- `shared/schemas/api/character.schema.ts`：角色查詢回應新增熟練度與其加成
- `server/services/item.service.ts`：`isLightArmorTemplate()` 等以 `equipSlot` 判斷「是否為武器」的邏輯改為以 `weaponType` 判斷；`weaponWeightClass` 判斷改為由 `weight` 推導
- `server/services/combat.service.ts`：新增攻擊目標型態判定、熟練度累積、被動觸發（狀態效果）
- `server/services/character.service.ts`、`shared/utils/calculateStats.ts`：新增熟練度數值加成、超重懲罰併入 stats 計算管線
- `shared/types/quest.ts`、`server/constants/templates/achievement.ts`、`server/services/progress-tracker.service.ts`：新增武器熟練度成就類型/範本/事件對應
- `app/pages/inventory.vue`：新增屬性面板/戰鬥數值面板/武器熟練度面板、裝備總覽負重顯示
- `app/components/game/character-stage/characterStage.vue`：移除 `attributePanel.vue`/`combatStats.vue` 兩個子元件的掛載
- `app/components/game/layouts/bottomNav.vue`：`inventory` 項目 label 改回「角色」
- `app/components/game/common/itemDetailDialog.vue`：新增 `weight`/`weaponType` 顯示
- `app/composables/useCombat.ts`、`app/components/game/adventure/combatResultPanel.vue`：傷害飄字時長拆成一般/爆擊兩個常數並延長，爆擊樣式字級加大
- `openspec/specs/weapon-weight-class`、`combat-engine`、`character-progression`、`achievements`、`inventory`、`equipment`、`adventure-run-presentation`：對應 delta spec
