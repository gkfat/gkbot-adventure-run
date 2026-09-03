# 敵人圖鑑（Enemy Archetypes）

> 本文件是內部設計參考文件，整理 `server/constants/templates/enemies.ts` 的 `ENEMY_ARCHETYPES`／`GKBOT_BOSS_ARCHETYPES`／`HUMAN_ARCHETYPES`／`HUMAN_BOSS_ARCHETYPES` 現況（共 32 種），對照 `docs/worldview.md` 第 2、3 節的設施敘事。**本文件不新增任何數值或敵人種類**——所有數字皆為 code 現況的整理。
>
> **2026-09 更新**：`enemy-factions-and-severity` change 已將原本僅 4 種的 GkBot 小兵擴充為 4 個列表、共 32 種 archetype（GKBOT 小兵/頭目、HUMAN 小兵/頭目各 8 種），本文件第 2 節依此重寫；`enemy-archetype-portraits` change 再為每個 archetype 加上穩定的 `slug`（畫像檔名 key，見第 6 節）。

## 1. Archetype 與 Tier 的關係

四個 archetype 陣列（`ENEMY_ARCHETYPES`／`GKBOT_BOSS_ARCHETYPES`／`HUMAN_ARCHETYPES`／`HUMAN_BOSS_ARCHETYPES`）是敵人的**基礎範本**，決定 name/description 與 `enemyLevel=1` 時的基礎數值（baseAtk/baseDef/baseHp/actionIntervalSec）。

實際戰鬥中出現的敵人，數值是由 `server/constants/difficulty.ts` 的 `getStatMultipliers(enemyLevel, tier)` 對這份基礎值做二次縮放：

- 先依 `enemyLevel`（由 `getEnemyLevel(step)` 決定）套用「每級成長」曲線（`HP_MULT_PER_LEVEL` / `ATK_MULT_PER_LEVEL` / `DEF_MULT_PER_LEVEL`）
- 再依 `tier`（NORMAL / ELITE / STRONG_ELITE / BOSS / BOSS_MINION）疊加一層固定倍率

即：**tier 不是獨立的敵人種類，而是套用在同一個 archetype 之上的難度倍率**。同一個「維修型 GkBot」在 NORMAL 與 ELITE tier 下，是同一個 archetype、不同倍率後的結果。

`*_BOSS_ARCHETYPES`（GKBOT_BOSS_ARCHETYPES／HUMAN_BOSS_ARCHETYPES）例外：作為 BOSS 節點的頭目本體時套用 NORMAL tier（其 baseAtk/baseDef/baseHp 本身已是頭目量級，不再疊加 BOSS 倍率），隨行小兵套用 BOSS_MINION tier（略低於 STRONG_ELITE，避免與頭目共用的基礎值被二次放大）。

## 2. Archetype 圖鑑表（32 種）

### 2.1 ENEMY_ARCHETYPES（GKBOT 小兵 ×8）

| slug | 名稱 | 描述 | baseAtk | baseDef | baseHp | actionIntervalSec | 其他 |
|---|---|---|---|---|---|---|---|
| `gkbot-repair` | 維修型 GkBot | 殘存的維修機具，機械手臂仍徒勞地執行著早已過期的保養指令。 | 8 | 4 | 60 | 2.5 | — |
| `gkbot-security-unit` | 保全機具 | 失控的保全單位，將任何靠近的生物體視為入侵者。 | 6 | 8 | 80 | 3.0 | — |
| `gkbot-runaway-hauler` | 失控搬運機 | 原本負責搬運零件的機具，如今橫衝直撞、不辨敵我。 | 12 | 2 | 50 | 2.2 | — |
| `gkbot-scrap-pile` | 廢棄零件堆 | 拼湊而成的殘骸堆，靠著殘留電力勉強驅動、行動遲緩。 | 4 | 2 | 30 | 3.5 | — |
| `assembly-arm` | 產線機械臂 | 仍固定在生產線上的巨大機械臂，攻擊範圍隨舊有生產流程擺動。 | 11 | 5 | 90 | 2.4 | — |
| `synth-observer` | 合成觀測員 | 負責監控異常的輕型單位，反應敏捷，善於捕捉破綻。 | 7 | 3 | 35 | 2.0 | crit +15%／dodge +18% |
| `phantom-projector` | 幻影投影體 | 殘留的全息投影裝置，影像忽隱忽現，攻擊難以捉摸。 | 7 | 2 | 32 | 2.1 | dodge +23% |
| `dealer-gkbot` | 荷官型 GkBot | 曾在賭場服務的荷官機具，出手精準帶著職業性的狠勁。 | 5 | 5 | 55 | 2.6 | crit +17% |

### 2.2 GKBOT_BOSS_ARCHETYPES（GKBOT 頭目 ×8）

| slug | 名稱 | 描述 | baseAtk | baseDef | baseHp | actionIntervalSec | bossMinionCount | canReinforce |
|---|---|---|---|---|---|---|---|---|
| `guard-hound-gkbot` | 看門犬型 GkBot | 巡邏用重型機犬，對入侵者鎖定後絕不輕易鬆口。 | 10 | 16 | 220 | 2.8 | 2 | 是 |
| `recon-drone` | 偵察無人機 | 高速飛行單位，靠著閃避與偷襲拉扯戰局（dodge +28%）。 | 16 | 6 | 110 | 1.8 | 0 | 否 |
| `core-repair-officer` | 核心維修官 | 核心區域的維修統籌單位，未來技能：自我修復。 | 14 | 10 | 170 | 2.5 | 1 | 是 |
| `assembly-overseer` | 產線總管 | 生產線的最高權限單位，未來技能：過載攻擊。 | 22 | 6 | 150 | 2.2 | 1 | 否 |
| `illusion-mage-unit` | 幻象法師型 | 殘存的娛樂用投影單位，未來技能：幻影分身（dodge +32%）。 | 15 | 5 | 120 | 2.3 | 0 | 否 |
| `dealer-boss` | 荷官頭目 | 賭場核心荷官機具，出手比一般同型更快更狠（crit +18%）。 | 16 | 9 | 160 | 2.4 | 1 | 否 |
| `warehouse-hauler-overlord` | 倉儲搬運霸主 | 巨型倉儲搬運機具，行動遲緩但幾乎打不穿。 | 15 | 18 | 230 | 2.9 | 2 | 否 |
| `mall-security-core` | 商場保全指揮核心 | 商場保全系統的中樞單位，未來技能：警報連動。 | 14 | 17 | 190 | 2.7 | 2 | 是 |

### 2.3 HUMAN_ARCHETYPES（HUMAN 小兵 ×8）

| slug | 名稱 | 描述 | baseAtk | baseDef | baseHp | actionIntervalSec | 其他 |
|---|---|---|---|---|---|---|---|
| `guard-dog` | 看門狗 | 盜賊團豢養的兇猛看門犬，撲咬速度極快。 | 7 | 8 | 70 | 2.6 | — |
| `human-scout` | 偵查者（人類斥候） | 負責摸清地形的斥候，擅長迴避正面交鋒。 | 8 | 3 | 40 | 2.0 | dodge +18% |
| `gang-enforcer` | 幫派打手 | 街頭出身的打手，招式粗暴但殺傷力十足。 | 13 | 3 | 55 | 2.1 | — |
| `rabble-raider` | 烏合掠奪者 | 臨時拼湊的散兵游勇，戰力薄弱但成群結隊。 | 4 | 2 | 28 | 2.8 | — |
| `synth-soldier` | 合成士兵 | 經過改造的合成人士兵，動作精準帶有機械式的冷靜。 | 12 | 6 | 65 | 2.2 | crit +11% |
| `sniper-raider` | 狙擊掠奪者 | 擅長遠距離致命一擊的掠奪者，出手講求一擊必殺。 | 14 | 2 | 38 | 2.0 | crit +22% |
| `private-guard` | 私兵護衛 | 受雇於盜賊團高層的護衛，訓練有素、進退有據。 | 9 | 6 | 60 | 2.4 | — |
| `casino-bouncer` | 賭場保鑣 | 地下賭場的保鑣，出手快狠準，不留活口。 | 9 | 6 | 58 | 2.5 | crit +14% |

### 2.4 HUMAN_BOSS_ARCHETYPES（HUMAN 頭目 ×8）

| slug | 名稱 | 描述 | baseAtk | baseDef | baseHp | actionIntervalSec | bossMinionCount | canReinforce |
|---|---|---|---|---|---|---|---|---|
| `centurion` | 百夫長 | 盜賊團前線指揮官，未來技能：腎上腺素爆發。 | 20 | 11 | 180 | 2.0 | 2 | 是 |
| `vault-keeper` | 財庫守門員 | 死守盜賊團財庫的重裝守衛，防禦滴水不漏。 | 15 | 17 | 210 | 2.6 | 1 | 否 |
| `berserker-boss` | 狂暴幫主 | 盜賊團現任幫主，未來技能：嗜血狂化。 | 24 | 6 | 150 | 2.1 | 0 | 否 |
| `synth-legion-commander` | 合成軍團長 | 統率合成士兵部隊的軍團長，攻防兼備。 | 21 | 12 | 200 | 2.3 | 2 | 否 |
| `shadow-assassin` | 影武者 | 擅長背刺的暗殺者頭目，未來技能：背刺爆擊（crit +22%）。 | 22 | 5 | 100 | 1.8 | 0 | 否 |
| `casino-kingpin` | 賭場莊家王 | 地下賭場的實質掌控者，出手精準毫不留情（crit +17%）。 | 16 | 10 | 160 | 2.4 | 1 | 否 |
| `bandit-strategist` | 盜賊團軍師 | 幕後策劃者，擅長調度手下伺機而動。 | 14 | 9 | 150 | 2.5 | 1 | 是 |
| `last-stand-maniac` | 末路狂人 | 不計後果的亡命之徒，未來技能：自爆終結技。 | 30 | 4 | 90 | 2.2 | 0 | 否 |

欄位說明：

- `bossMinionCount`：當此 archetype 作為 BOSS 節點的頭目單位出場時，隨行的 BOSS_MINION tier 小兵數（0~2）。
- `canReinforce`：頭目是否能在戰鬥中途補充陣亡的小兵（見 `combat.service.ts` 的 `BOSS_REINFORCE_CONFIG`：每 3 回合檢查一次，機率補充，最多補充 2 次）。
- 未列出 crit/dodge 覆寫的 archetype，套用全域預設值（`ENEMY_COMBAT_STATS`）。

## 3. 敘事定位對照（呼應 worldview.md 第 2、3 節）

`worldview.md` 第 2 節列出多種 GK 設施類型，第 3 節指出設施的威脅陣營分為「GkBot 殘部」（GKBOT 陣營）與「人類/合成人（末世盜賊團）」（HUMAN 陣營）兩條光譜，`run.factionType` 決定整場 run 抽哪一組陣營的 archetype 列表。

- GKBOT 陣營（`ENEMY_ARCHETYPES` + `GKBOT_BOSS_ARCHETYPES`）：對應維修設施、工廠等仍有機械殘留運作的場景。
- HUMAN 陣營（`HUMAN_ARCHETYPES` + `HUMAN_BOSS_ARCHETYPES`）：對應深度荒廢設施、盜賊團盤據/伏擊倖存者的場景。

`run.severityTier`（`FacilitySeverity`）另外決定戰鬥的難度基準（波次/敵人數），與陣營選擇是兩個獨立軸線。

## 4. 資料來源

- `server/constants/templates/enemies.ts`（32 個 `EnemyArchetype`，含 `slug`）
- `server/constants/difficulty.ts`（`getStatMultipliers`、`EnemyTier`）
- `server/services/combat.service.ts`（`BOSS_REINFORCE_CONFIG`、tier 套用規則）
- `openspec/specs/combat-engine/spec.md`（戰鬥模擬、Boss 數值與獎勵規則）
- `openspec/specs/enemy-portrait-resolution/spec.md`（archetype slug 與頭像解析規則）
- `docs/worldview.md` 第 2、3、7、8 節（設施敘事、陣營光譜、技能概念）

## 5. 尚未落地事項

`worldview.md` 第 7.1 節列出的帶技能敵人（自我修復、過載攻擊、幻影分身等）目前僅存在於各頭目 archetype 的 description 文字中（「未來技能」字樣），實際戰鬥邏輯尚未實作技能機制，留給後續 `enemy-boss-skills` change 處理。

## 6. Archetype 專屬美術（enemy-portrait-resolution）

每個 archetype 的 `slug` 同時作為頭像檔名 key（`/images/enemies/{slug}.png`）。32 個 archetype **全數**已有專屬美術（見 `app/utils/enemyAvatar.ts` 的白名單常數），`/images/enemies/{faction}-{tier}.png` fallback 僅在讀取本 change 上線前既有的歷史 `lastCombatSummary`（`archetypeSlug` 缺失）時才會用到。

已產出美術清單：

- GKBOT 小兵（8/8，全數完成）：`gkbot-repair`／`gkbot-security-unit`／`gkbot-runaway-hauler`／`gkbot-scrap-pile`／`assembly-arm`／`synth-observer`／`phantom-projector`／`dealer-gkbot`
- GKBOT 頭目（8/8，全數完成）：`guard-hound-gkbot`／`recon-drone`／`core-repair-officer`／`assembly-overseer`／`illusion-mage-unit`／`dealer-boss`／`warehouse-hauler-overlord`／`mall-security-core`
- HUMAN 小兵（8/8，全數完成）：`guard-dog`／`human-scout`／`gang-enforcer`／`rabble-raider`／`synth-soldier`／`sniper-raider`／`private-guard`／`casino-bouncer`
- HUMAN 頭目（8/8，全數完成）：`centurion`／`vault-keeper`／`berserker-boss`／`synth-legion-commander`／`shadow-assassin`／`casino-kingpin`／`bandit-strategist`／`last-stand-maniac`

> 註：`gkbot-repair`／`gkbot-security-unit`／`gkbot-runaway-hauler`／`gkbot-scrap-pile` 這 4 個 slug 直接沿用 `public/images/enemies/` 下既有的圖檔名（`gkbot-` 前綴），因此跟其餘 slug 的「archetype 語意優先、無前綴」命名慣例不同——這是為了配合已產出的美術資產，非命名不一致的疏漏。
>
> HUMAN 陣營 16 張頭像（24x24 網格，比照 `human-normal.png`/`human-elite.png`/`human-boss.png` 的人形半身像風格與暖色調色盤）與建置腳本見 `pixel-art/human-archetypes/build.py`。GKBOT 陣營剩餘 12 張（4 小兵 20x20 網格比照既有 4 張的暖灰色調 + 8 頭目比照 `gkbot-boss.png`/`gkbot-elite.png` 的冷藍灰色調＋紅色危險強調色）與建置腳本見 `pixel-art/gkbot-archetypes-remaining/build.py`。
