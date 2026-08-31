# 敵人圖鑑（Enemy Archetypes）

> 本文件是內部設計參考文件，整理 `server/constants/combat.ts` 的 `ENEMY_ARCHETYPES` 現況，並對照 `docs/worldview.md` 第 2、3 節的設施敘事，供後續內容擴充（尤其是人類/合成人陣營）時參考。**本文件不新增任何數值或敵人種類**——所有數字皆為 code 現況的整理。

## 1. Archetype 與 Tier 的關係

`ENEMY_ARCHETYPES`（4 種）是敵人的**基礎範本**，決定 name/description 與 `enemyLevel=1` 時的基礎數值（baseAtk/baseDef/baseHp/actionIntervalSec）。

實際戰鬥中出現的敵人，數值是由 `server/constants/difficulty.ts` 的 `getStatMultipliers(enemyLevel, tier)` 對這份基礎值做二次縮放：

- 先依 `enemyLevel`（由 `getEnemyLevel(step)` 決定）套用「每級成長」曲線（`HP_MULT_PER_LEVEL` / `ATK_MULT_PER_LEVEL` / `DEF_MULT_PER_LEVEL`）
- 再依 `tier`（NORMAL / ELITE / STRONG_ELITE / BOSS）疊加一層固定倍率

即：**tier 不是獨立的敵人種類，而是套用在同一個 archetype 之上的難度倍率**。同一隻「維修型 GkBot」在 NORMAL 與 BOSS tier 下，是同一個 archetype、不同倍率後的結果。

BOSS tier 倍率（`difficulty.ts` 內定義，高於 STRONG_ELITE）：

| Tier | HP 倍率 | ATK 倍率 | DEF 倍率 |
|---|---|---|---|
| NORMAL | ×1 | ×1 | ×1 |
| ELITE | `ELITE_HP_MULT` | `ELITE_ATK_MULT` | `ELITE_DEF_MULT` |
| STRONG_ELITE | `STRONG_ELITE_HP_MULT` | `STRONG_ELITE_ATK_MULT` | `STRONG_ELITE_DEF_MULT` |
| BOSS | ×4.0 | ×2.8 | ×2.0 |

> BOSS 倍率為 code 註解標記的 ASSUMPTION（延伸 Elite/Strong Elite 曲線推算），非另有設計文件定案。

## 2. Archetype 圖鑑表

| Archetype | 描述 | baseAtk | baseDef | baseHp | actionIntervalSec | bossMinionCount | canReinforce |
|---|---|---|---|---|---|---|---|
| 維修型 GkBot | 殘存的維修機具，機械手臂仍徒勞地執行著早已過期的保養指令。 | 8 | 4 | 60 | 2.5 | 2 | 是 |
| 保全機具 | 失控的保全單位，將任何靠近的生物體視為入侵者。 | 6 | 8 | 80 | 3.0 | 2 | 否 |
| 失控搬運機 | 原本負責搬運零件的機具，如今橫衝直撞、不辨敵我。 | 12 | 2 | 50 | 2.2 | 1 | 是 |
| 廢棄零件堆 | 拼湊而成的殘骸堆，靠著殘留電力勉強驅動、行動遲緩。 | 4 | 2 | 30 | 3.5 | 0 | 否 |

欄位說明：

- `bossMinionCount`：當此 archetype 作為 BOSS 節點的頭目單位出場時，隨行的 STRONG_ELITE tier 小兵數（0~2）。
- `canReinforce`：頭目是否能在戰鬥中途補充陣亡的小兵（見 `combat.ts` 的 `BOSS_REINFORCE_CONFIG`：每 3 回合檢查一次，50% 機率補充，最多補充 2 次）。

**數值傾向速覽**：

- 「保全機具」DEF/HP 最高、ATK 最低 → 偏坦克型
- 「失控搬運機」ATK 最高、DEF 最低、行動間隔最短 → 偏爆發型
- 「廢棄零件堆」全數值最低、行動間隔最長 → 偏雜兵/墊底型
- 「維修型 GkBot」數值居中，但 `bossMinionCount`/`canReinforce` 最完整 → 目前資料裡「最像正規頭目」的範本

## 3. 敘事定位對照（呼應 worldview.md 第 2、3 節）

`worldview.md` 第 2 節列出多種 GK 設施類型，其中明確點名「維修設施」與「工廠」是怪物節點的主要場景；第 3 節則指出設施的威脅陣營分為「GkBot 殘部」與「人類/合成人（末世盜賊團）」兩條光譜。

| Archetype | 對應設施情境（worldview.md 第 2 節） | 備註 |
|---|---|---|
| 維修型 GkBot | 維修設施——「殘存的維修型 GkBot 與失控機具在此徘徊」 | worldview.md 原文直接點名的怪物類型 |
| 保全機具 | 各類設施的保全/警戒系統（百貨商場、研究設施等常設安防單位失控後的樣貌） | worldview.md 未逐一點名保全單位，屬 code 註解合理延伸 |
| 失控搬運機 | 工廠——「產線仍在空轉，機械臂與半成品 GkBot 在黑暗中持續作業」 | 對應「大量維修型/失控搬運怪物的密集場景」 |
| 廢棄零件堆 | 小賣店、深度荒廢區域——資源稀少、風險較低的入口設施 | 數值最弱，呼應「規模最小、風險相對較低」的場景定位 |

四種 archetype 皆屬 worldview.md 第 3 節所述的 **GkBot 殘部陣營**，也就是「設施越接近仍在運作的狀態，裡面的 GkBot 就越多、越強」這條光譜的機械端。

## 4. 內容缺口：人類/合成人陣營尚未落地

`docs/worldview.md` 第 3 節明確描述了第二條敵對陣營——**人類/合成人（末世盜賊團）**：盤據深度荒廢設施、伏擊/洗劫其他倖存者的加害者陣營，且第 7 節已預留「機械頭目 vs 人類頭目命名不共用同一套語彙」的設計方向（例如「核心維修官／產線總管」對照「百夫長／狂暴幫主」）。

但檢視 `server/constants/combat.ts` 現況：**`ENEMY_ARCHETYPES` 目前只有 4 種，且全部是機械系（GkBot 殘部）**，尚未有任何一個 archetype 對應人類/合成人陣營。

具體缺口：

- 沒有任何 archetype 的 name/description 帶有人類/合成人特徵（掠奪者、私兵、合成人等）
- worldview.md 第 7.1 節列出的 8 個帶技能敵人中，「盜賊團頭目」的 4 個（百夫長、狂暴幫主、影武者、末路狂人）在 code 裡完全沒有對應的 archetype 存在
- `getStatMultipliers`/tier 機制本身與陣營無關，未來新增人類陣營 archetype 可直接沿用同一套 tier 倍率，不需要另開機制

> worldview.md 已註記：陣營對照的完整小兵/頭目命名與數值傾向定案內容留給 `enemy-factions-and-severity` change 的 spec；技能機制（含表中 8 個帶技能敵人）留給 `enemy-boss-skills` change。本文件僅如實反映目前 code 尚未落地的現況，不代為發明新 archetype 或數值。

## 5. 資料來源

- `server/constants/combat.ts`（`ENEMY_ARCHETYPES`、`BOSS_REINFORCE_CONFIG`）
- `server/constants/difficulty.ts`（`getStatMultipliers`、`EnemyTier`）
- `openspec/specs/combat-engine/spec.md`（戰鬥模擬、Boss 數值與獎勵規則）
- `docs/worldview.md` 第 2、3、7、8 節（設施敘事、陣營光譜、技能概念、既有待確認缺口）
