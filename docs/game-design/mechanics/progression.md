# 角色成長與職業系統

> 本文件是內部設計參考文件，彙整 `character-progression`／`character-roster`／`character-talents` 三份 spec，加上 `server/constants/templates/characterArchetypes.ts`、`server/constants/templates/talentTrees.ts`、`server/constants/stats.ts`、`server/services/character.service.ts`、`server/repositories/character.repository.ts` 的實際落地邏輯，說明角色的職業選擇、屬性成長、天賦樹、等級曲線，以及與裝備/戰鬥系統的關聯。全部數值直接取自 code，未在 code 中定義的機制標註「待確認」。
>
> **變更記錄**：`character-talent-tree` change 以「天賦樹」機制取代原本只有敘事文案、沒有任何消費端的 `character-archetype-abilities`（`ArchetypeAbilityTrigger`）；該資料檔與 capability 已隨此變更移除，本文件第 2 節改為天賦樹說明。

## 1. 可選職業（archetype）與初始屬性

系統目前提供 5 個可選職業，建立角色時擇一，四維屬性（STR/AGI/CON/LUCK）總和固定為 10，用來讓職業之間可比較（`server/constants/characterArchetypes.ts`）：

| archetypeId | 職業名稱 | STR | AGI | CON | LUCK | 定位風格簡述 |
|---|---|---|---|---|---|---|
| `fighter` | 戰士 | 4 | 1 | 4 | 1 | STR/CON 並重，偏向近戰輸出＋耐打；世界觀上是「同時最靠近機械化真相」的角色 |
| `adventurer` | 冒險家 | 1 | 5 | 2 | 2 | AGI 最高，偏向行動速度／閃避與探索型玩法 |
| `scholar` | 學者 | 5 | 1 | 1 | 3 | STR 最高（純輸出向），CON 最低、較脆 |
| `tinkerer` | 工匠 | 1 | 3 | 4 | 2 | AGI/CON 均衡偏防禦，敘事上是最靠近「身體已機械化」真相的角色 |
| `gambler` | 投機者 | 1 | 3 | 1 | 5 | LUCK 最高，偏向掉落率／祝福稀有度／輪盤高風險選項 |

> 職業名稱對應的「運動員/健身者、背包客、學生/研究員、工程師/Maker、業務」等末日前身分定位，來自 `docs/worldview.md` 第 5 節，本文件不重複列出敘事文案。

另有 4 個**已停用（retired）**舊職業（`barbarian` 野蠻人、`rogue` 盜賊、`paladin` 聖騎士、`wanderer` 流浪者），無法用於建立新角色，僅供既有舊角色解析 `className`/`spriteUrl`，不具備第 2 節的核心特色機制（`character-archetype-abilities` spec 明定查詢其 `ArchetypeAbility` 會查無資料）。

角色名冊上限：同一帳號最多 3 個角色（`CHARACTER_ROSTER_MAX`，定義於 `server/repositories/character.repository.ts`），各角色的 level/exp/gold/gems/nickname/equipment/unspentAttributePoints 互相獨立。

## 2. 職業天賦樹（Talent Tree）

每個可選職業各定義一棵靜態天賦樹（`server/constants/templates/talentTrees.ts`，`TALENT_TREES`），作為職業差異化真正落地的機制（取代原本只有文案、沒有數值運算的 `ArchetypeAbility`）：

- **結構**：5 層（Tier 1~5），Tier 1/3/5 各 1 個節點，Tier 2/4 各 2 個節點（同層同 `branchGroup`，只能擇一投入，即「岔路」）；每個節點最高 3 級（`maxRank`），附帶一組固定數值的 `TalentEffect`（`stat` + 每級增量 `perRank`）。
- **天賦點**：角色升 1 級額外發放 `talentPoints += 1`（與 `unspentAttributePoints` 同一個 while 迴圈內，見第 3 節、`CharacterRepository.settleRunRewards`），累計投入記錄在 `talents: Record<nodeId, rank>`。
- **開放規則**：某層要開放，上一層必須存在一個已點滿（`rank = maxRank`）的節點；Tier 1 永遠開放。此規則對單節點層與岔路層一視同仁。
- **岔路互斥**：同層同 `branchGroup` 的節點，只要其中一個 `rank > 0`，另一個永久鎖定在 `rank 0`——**不支援重置/轉點**，與屬性點分配的不可逆慣例一致。
- **投點端點**：`POST /api/character/:characterId/talents`（`{ nodeId }`），每次呼叫投 1 級，`CharacterService.allocateTalentPoint` 依序驗證節點存在 → 天賦點足夠 → 未點滿 → 上一層已開放 → 未鎖定於對向分支，任一失敗回傳 400、不修改資料。
- **併入 stats**：投入節點的效果依 rank 加總（`character.service.ts` 的 `getTalentBonus`，邏輯與裝備的 `sumEquipmentStats` 對稱），在 `calculateBaseStats → applyEquipmentStats` 之後、以 `applyTalentStats`（`shared/utils/calculateStats.ts`）套用，回傳 `talentBonus`（結構同 `equipmentBonus`，只列非零項）。`carryCapacity` 是目前唯一「天賦可以加成、但裝備不行」的 stat（天賦與屬性同屬永久成長，裝備是可替換資源）。

5 個職業的天賦樹內容（`perRank` 為每級增量，3 級為滿；Tier 2/4 的 A／B 為岔路二擇一）：

| archetypeId | Tier 1 | Tier 2（A／B 岔路） | Tier 3 | Tier 4（A／B 岔路） | Tier 5（畢業技） |
|---|---|---|---|---|---|
| `fighter` | 體魄鍛鍊：HP_MAX+15、DEF+2、carryCapacity+1 | 剛毅意志 DEF+3／蠻力衝擊 ATK+3 | 沉重打擊：ATK+2、DEF+1 | 銅牆鐵壁 DEF+5、actionIntervalSec+0.05／破陣猛攻 ATK+5 | 不屈之軀：HP_MAX+40、DEF+4 |
| `adventurer` | 輕裝疾行：actionIntervalSec-0.03、dodgeChance+0.01 | 靈巧步伐 dodgeChance+0.02／疾風連擊 actionIntervalSec-0.05 | 隨機應變：carryCapacity+2、dodgeChance+0.01 | 影步 dodgeChance+0.04／迅捷本能 actionIntervalSec-0.08 | 探索者之心：ATK+3、dodgeChance+0.02 |
| `scholar` | 戰術洞察：critChance+0.02、ATK+2 | 精準打擊 critChance+0.03／弱點分析 ATK+4 | 冷靜分析：DEF+2、critChance+0.01 | 致命一擊 critChance+0.05／博學強化 ATK+6 | 大師手筆：ATK+5、critChance+0.03 |
| `tinkerer` | 裝備強化：DEF+2、actionIntervalSec-0.02 | 加固護甲 DEF+4／潤滑機構 actionIntervalSec-0.04 | 隨行工具：carryCapacity+3、HP_MAX+10 | 重裝改造 DEF+6／高速齒輪 actionIntervalSec-0.06 | 巧匠傑作：DEF+5、actionIntervalSec-0.05 |
| `gambler` | 幸運本能：critChance+0.02、dodgeChance+0.01 | 賭徒直覺 critChance+0.03／死裡逃生 dodgeChance+0.03 | 孤注一擲：ATK+3、critChance+0.01 | 全下 critChance+0.05／命運女神 dodgeChance+0.05 | 賭王之運：critChance+0.03、dodgeChance+0.03 |

> **設計備註**：完整點滿一條天賦路徑（Tier1+2+3+4+5 單一分支）僅需 15 點，遠低於 30 級可累積的 87 點上限，多餘天賦點目前無處可花——是否於後續 change 擴充更多層數/節點，或調整每級發放量，留待後續依實際遊戲節奏評估（見 `character-talent-tree` change 的 design.md Open Questions）。

## 3. 等級與經驗值成長

- 等級上限：`RESOURCE_LIMITS.LEVEL_MAX = 30`（`shared/types/common.ts`），API 回傳的 `level` 恆落在 1–30。
- 經驗值需求表 `EXP_TABLE`（`shared/types/character.ts`，key 為目前等級、value 為升到下一級所需經驗值，30 級無此欄位視為已封頂）：

| Lv → Lv+1 | 所需 EXP | Lv → Lv+1 | 所需 EXP | Lv → Lv+1 | 所需 EXP |
|---|---|---|---|---|---|
| 1→2 | 359 | 11→12 | 4124 | 21→22 | 8737 |
| 2→3 | 662 | 12→13 | 4558 | 22→23 | 9227 |
| 3→4 | 990 | 13→14 | 4998 | 23→24 | 9721 |
| 4→5 | 1338 | 14→15 | 5446 | 24→25 | 10219 |
| 5→6 | 1702 | 15→16 | 5900 | 25→26 | 10722 |
| 6→7 | 2080 | 16→17 | 6360 | 26→27 | 11229 |
| 7→8 | 2470 | 17→18 | 6824 | 27→28 | 11739 |
| 8→9 | 2869 | 18→19 | 7296 | 28→29 | 12253 |
| 9→10 | 3279 | 19→20 | 7771 | 29→30 | 12771 |
| 10→11 | 3697 | 20→21 | 8251 | — | — |

- 升級來源：`CharacterRepository.settleRunRewards`（`server/repositories/character.repository.ts`）在一趟 run 結算時累加 `expGained`，用 while 迴圈連續扣除 `EXP_TABLE[level]` 並累加等級，直到不足以再升一級或觸頂 30 級；封頂後多餘經驗值歸零。
- 每升 1 級發放 `unspentAttributePoints += 1`（實測 code 行為）。
  - **待確認／落地備註**：`shared/types/character.ts` 對 `unspentAttributePoints` 欄位的註解寫「Gained 3 per level up」，但 `character.repository.ts` 的 `settleRunRewards` 實作與其註解（"ASSUMPTION, undocumented elsewhere: +1 unspentAttributePoint per level"）都是**每級 +1**，兩者不一致，屬於文件與型別註解落後於實作的既有落差，本文件依實際 code 行為（+1）記錄，型別註解的「3」建議由工程端確認並修正。
- 角色等級**不會**直接讓 ATK/DEF/HP/actionIntervalSec 變高——`calculateBaseStats`（見第 4 節）雖接收 `characterLevel` 參數，但目前實作完全未使用它參與計算；等級對戰鬥數值的唯一影響路徑是「升級 → 取得 `unspentAttributePoints` → 玩家手動分配到 STR/AGI/CON/LUCK → 換算成 stats」。

## 4. 屬性 → Stats 換算公式

角色的戰鬥數值（`ATK`/`DEF`/`HP_MAX`/`actionIntervalSec`/`critChance`/`critMultiplier`/`dodgeChance`）由 server 依 `attributes` 即時計算，**不寫入 Firestore**（`calculateBaseStats`，`server/constants/stats.ts`）：

| 屬性 | 影響的 Stats | 公式係數 |
|---|---|---|
| STR | ATK | `ATK = floor(10 + STR × 2.5)` |
| CON | DEF | `DEF = floor(5 + CON × 1.5)` |
| CON | HP_MAX | `HP_MAX = floor(100 + CON × 20)` |
| AGI | actionIntervalSec（越低出手越快） | `interval = clamp(3.0 − AGI × 0.02, 0.5, 5.0)` 秒 |
| AGI | critChance | `min(35%, 5% + AGI × 0.3%)` |
| AGI | dodgeChance | `min(25%, 3% + AGI × 0.2%)` |
| LUCK | 不直接進 Stats，作用於掉落/祝福等其他系統 | 見下方說明 |
| — | critMultiplier | 固定 `1.5`（`COMBAT_CONFIG.CRIT_MULTIPLIER`），不受屬性影響 |

- `actionIntervalSec` 硬性夾在 0.5 秒（最快）到 5.0 秒（最慢）之間；`critChance` 封頂 35%、`dodgeChance` 封頂 25%。
- LUCK 目前不進入 `calculateBaseStats` 的任何欄位，而是作用在其他系統：影響掉落機率（`combat.service.ts` 結算戰利品時吃 `character.attributes.LUCK`）、影響祝福稀有度（`blessing.service.ts`／`blessings.ts` 的 `MAJOR_WEIGHT_PER_LUCK`，LUCK 越高越偏向 MAJOR 等級祝福）。這兩處的完整機率曲線屬於掉落/祝福系統本身的數值範圍，不在本文件重複列出。

## 5. 屬性點分配

- `POST /api/character/:characterId/attributes` 允許玩家把 `unspentAttributePoints` 分配到 STR/AGI/CON/LUCK 任意組合，總分配量不可超過剩餘點數，超過則回傳 400 且不修改任何資料。
- 屬性點只會增加、沒有重置/洗點機制（code 中未找到相關端點）。
- 天賦點的投點規則見第 2 節，同樣不支援重置/洗點。

## 6. 角色與裝備/戰鬥系統的關聯

- 裝備加成在 `applyEquipmentStats`（`server/constants/stats.ts`）疊加在屬性算出的 base stats 之上：`ATK`/`DEF`/`HP_MAX` 直接相加，`actionIntervalSec`/`dodgeChance` 相加後再套用夾限；`critChance`/`critMultiplier` 目前的裝備加成邏輯**不修改**（維持 base stats 值，即裝備欄位如 `research_chip_ring`/`servo_greaves` 提供的 `actionSpeedMod` 才會影響出手速度，數值曲線見 `docs/game-design/balance/item-stats.md`）。
- 天賦加成在裝備之後再套用一次（`applyTalentStats`）：`ATK`/`DEF`/`HP_MAX`/`carryCapacity` 直接相加，`actionIntervalSec`/`critChance`/`dodgeChance` 相加後再套用與 base stats 相同的夾限——與裝備不同，**天賦可以加成 `critChance` 與 `carryCapacity`**（見第 2 節）。
- 對應到第 1 節的職業初始屬性分佈，各職業因此天生偏重不同的裝備搭配方向：
  - `fighter`（STR3/CON3）：ATK 與 DEF/HP 並重，適合搭配右手 ATK 裝備或身體/頭部 DEF+HP 裝備補強耐久。
  - `adventurer`（AGI3）：天生出手較快、閃避/爆擊率較高，適合疊加戒指/鞋子的 `actionSpeedMod`（負值）裝備進一步壓縮出手間隔。
  - `scholar`（STR4）：純輸出向但 CON1 最脆，需要靠裝備 DEF/HP 補防禦缺口。
  - `tinkerer`（CON3/AGI2）：均衡防禦向，裝備彈性較高。
  - `gambler`（LUCK4）：不直接吃裝備數值加成，而是放大掉落率與祝福稀有度的期望值，適合走「拼機緣」而非硬吃屬性的路線。

## 7. 尚待確認 / 資料缺口

- `unspentAttributePoints` 每級發放數量：型別註解寫「3」，實際 `settleRunRewards` 邏輯是「+1」，兩者不一致，本文件依實際 code 行為記錄，數值以哪個為準待工程端確認。
- 天賦樹多餘點數（見第 2 節設計備註）：目前無擴充機制，暫記為待確認。
- `calculateBaseStats` 雖接收 `characterLevel` 參數，但目前實作完全未使用它做任何等級相關的數值縮放，等級對戰鬥力的影響僅透過屬性點分配間接發生；是否為刻意設計（例如未來預留等級直接加成的擴充點）待確認。
- 屬性點洗點/重置機制：code 中未找到對應端點，目前判定為不存在此機制。
