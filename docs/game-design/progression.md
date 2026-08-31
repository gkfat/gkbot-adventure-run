# 角色成長與職業系統

> 本文件是內部設計參考文件，彙整 `character-progression`／`character-roster`／`character-archetype-abilities` 三份 spec，加上 `server/constants/characterArchetypes.ts`、`server/constants/archetypeAbilities.ts`、`server/constants/stats.ts`、`server/services/character.service.ts`、`server/repositories/character.repository.ts` 的實際落地邏輯，說明角色的職業選擇、屬性成長、等級曲線，以及與裝備/戰鬥系統的關聯。全部數值直接取自 code，未在 code 中定義的機制標註「待確認」。

## 1. 可選職業（archetype）與初始屬性

系統目前提供 5 個可選職業，建立角色時擇一，四維屬性（STR/AGI/CON/LUCK）總和固定為 8，用來讓職業之間可比較（`server/constants/characterArchetypes.ts`）：

| archetypeId | 職業名稱 | STR | AGI | CON | LUCK | 定位風格簡述 |
|---|---|---|---|---|---|---|
| `fighter` | 戰士 | 3 | 1 | 3 | 1 | STR/CON 並重，偏向近戰輸出＋耐打；世界觀上是「同時最靠近機械化真相」的角色 |
| `adventurer` | 冒險家 | 1 | 3 | 2 | 2 | AGI 最高，偏向行動速度／閃避與探索型玩法 |
| `scholar` | 學者 | 4 | 1 | 1 | 2 | STR 最高（純輸出向），CON 最低、較脆 |
| `tinkerer` | 工匠 | 1 | 2 | 3 | 2 | AGI/CON 均衡偏防禦，敘事上是最靠近「身體已機械化」真相的角色 |
| `gambler` | 投機者 | 1 | 2 | 1 | 4 | LUCK 最高，偏向掉落率／祝福稀有度／輪盤高風險選項 |

> 職業名稱對應的「運動員/健身者、背包客、學生/研究員、工程師/Maker、業務」等末日前身分定位，來自 `docs/worldview.md` 第 5 節，本文件不重複列出敘事文案。

另有 4 個**已停用（retired）**舊職業（`barbarian` 野蠻人、`rogue` 盜賊、`paladin` 聖騎士、`wanderer` 流浪者），無法用於建立新角色，僅供既有舊角色解析 `className`/`spriteUrl`，不具備第 2 節的核心特色機制（`character-archetype-abilities` spec 明定查詢其 `ArchetypeAbility` 會查無資料）。

角色名冊上限：同一帳號最多 3 個角色（`CHARACTER_ROSTER_MAX`，定義於 `server/repositories/character.repository.ts`），各角色的 level/exp/gold/gems/nickname/equipment/unspentAttributePoints 互相獨立。

## 2. 職業核心特色機制（ArchetypeAbility）

每個可選職業恰好定義 1 個核心特色機制，用穩定的 `trigger` enum 供 events/items/adventure-run/combat 等消費端查表分支，本 spec 只定案資料結構與敘事文案，**不定義任何機率/倍率數值**（`server/constants/archetypeAbilities.ts`）：

| archetypeId | abilityId | name | trigger | 效果概念（文案） |
|---|---|---|---|---|
| `fighter` | `physical_adaptation` | Physical Adaptation | `blessing_effect_boost` | 提升身體能力類 Blessing 的效果加成（「身體素質類的祝福，對你的效果總是好一些。」） |
| `adventurer` | `explorer` | Explorer | `non_combat_node_bonus` | 經過非戰鬥節點有機率發現額外內容（「路過非戰鬥的地方時，你總能多發現一點別人沒注意到的東西。」） |
| `scholar` | `study` | Study | `enemy_encounter_record` | 記錄遭遇過的敵人/事件類型，再次遭遇獲得額外效果（「你會記下遇過的對手與狀況，下次再遇到，就沒那麼手忙腳亂了。」） |
| `tinkerer` | `salvage` | Salvage | `salvage_material_drop` | 擊敗機械類敵人或開寶箱有機率獲得可轉化的素材（「打倒機械類的對手、翻找戰利品時，你總能多撿到一些零件——而且莫名其妙就知道怎麼用。」） |
| `gambler` | `risk_and_reward` | Risk & Reward | `risk_reward_choice` | 在輪盤/事件節點提供額外高風險高回報選項（「遇到輪盤或抉擇時，你永遠多一個別人沒有的選項——賭大的。」） |

> **待確認**：以上 5 個 trigger 的實際機率/倍率數值，由各自消費端 change（events-and-blessings／items-and-equipment／adventure-run-core／combat-engine）各自實作，目前 code 尚未找到對應的數值常數。

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

## 6. 角色與裝備/戰鬥系統的關聯

- 裝備加成在 `applyEquipmentStats`（`server/constants/stats.ts`）疊加在屬性算出的 base stats 之上：`ATK`/`DEF`/`HP_MAX` 直接相加，`actionIntervalSec` 相加後再套用同一組 0.5–5.0 秒的夾限；`critChance`/`critMultiplier`/`dodgeChance` 目前的裝備加成邏輯**不修改**（維持 base stats 值，即裝備欄位如 `research_chip_ring`/`servo_greaves` 提供的 `actionSpeedMod` 才會影響出手速度，數值曲線見 `docs/game-design/item-drop-and-stats.md`）。
- 對應到第 1 節的職業初始屬性分佈，各職業因此天生偏重不同的裝備搭配方向：
  - `fighter`（STR3/CON3）：ATK 與 DEF/HP 並重，適合搭配右手 ATK 裝備或身體/頭部 DEF+HP 裝備補強耐久。
  - `adventurer`（AGI3）：天生出手較快、閃避/爆擊率較高，適合疊加戒指/鞋子的 `actionSpeedMod`（負值）裝備進一步壓縮出手間隔。
  - `scholar`（STR4）：純輸出向但 CON1 最脆，需要靠裝備 DEF/HP 補防禦缺口。
  - `tinkerer`（CON3/AGI2）：均衡防禦向，裝備彈性較高。
  - `gambler`（LUCK4）：不直接吃裝備數值加成，而是放大掉落率與祝福稀有度的期望值，適合走「拼機緣」而非硬吃屬性的路線。

## 7. 尚待確認 / 資料缺口

- `unspentAttributePoints` 每級發放數量：型別註解寫「3」，實際 `settleRunRewards` 邏輯是「+1」，兩者不一致，本文件依實際 code 行為記錄，數值以哪個為準待工程端確認。
- `character-archetype-abilities` 定義的 5 個 trigger（`blessing_effect_boost`／`non_combat_node_bonus`／`enemy_encounter_record`／`salvage_material_drop`／`risk_reward_choice`）目前只有敘事文案與 trigger 列舉值，機率/倍率等實際數值散落在對應消費端 change（events-and-blessings／items-and-equipment／adventure-run-core／combat-engine），本文件未找到明確數值常數，暫記為待確認，待各消費端 change 定案後回頭補充。
- `calculateBaseStats` 雖接收 `characterLevel` 參數，但目前實作完全未使用它做任何等級相關的數值縮放，等級對戰鬥力的影響僅透過屬性點分配間接發生；是否為刻意設計（例如未來預留等級直接加成的擴充點）待確認。
- 屬性點洗點/重置機制：code 中未找到對應端點，目前判定為不存在此機制。
