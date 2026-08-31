# Run 節點與敵人遭遇機率表

> 本文件是內部設計參考文件，整理一次 run（= 一個 Stage，10~20 個節點）中各類節點、敵人 tier、多波次/多敵人遭遇的實際機率與規則，數值全部取自程式碼常數，不做任何臆測外推。權威來源：`shared/types/adventure.ts`（`NODE_CONFIG`、`DIFFICULTY_CONFIG`、`STAGE_CONFIG`）、`server/constants/difficulty.ts`（機率公式 pure functions）、`server/constants/combat.ts`（`ENEMY_ARCHETYPES`、Boss 補位設定）、`server/services/adventure-run.service.ts`（`decideNextNode`/`buildCombatNodeData`/`buildBossNodeData`）、`server/services/combat.service.ts`（補位迴圈）。

## 1. 節點類型生成規則（`decideNextNode`）

一個 Stage 固定 `STAGE_CONFIG.NODE_COUNT_MIN`~`NODE_COUNT_MAX`（10~20，含頭尾）個節點，Stage 建立時以一次決定性 RNG uniform roll 決定總節點數，最後一個節點固定是 BOSS。除了「BOSS」與「保底 Rest」「固定精英節奏」這幾個**決定性**規則外，其餘節點類型才是**加權隨機**。判定優先序如下（符合任何一條就直接採用，不再往下判定）：

| 優先序 | 條件 | 結果 |
|---|---|---|
| 1 | `stageNodeIndex === stageNodeCount - 1`（Stage 最後一個節點） | 固定 `BOSS` |
| 2 | `step - lastRestStep >= NODE_CONFIG.REST_GUARANTEED_INTERVAL`（4） | 固定 `REST`（保底） |
| 3 | `step > 0 && step % NODE_CONFIG.STRONG_ELITE_INTERVAL === 0`（9） | 固定 `STRONG_ELITE` |
| 4 | `step > 0 && step % NODE_CONFIG.ELITE_INTERVAL === 0`（5） | 固定 `ELITE` |
| 5 | 以上皆未觸發 | 依 `NODE_CONFIG.WEIGHTED_NODE_WEIGHTS` 加權隨機 |

第 5 層的加權隨機權重（`WEIGHTED_NODE_TOTAL` = 100）：

| 節點類型 | 權重 | 機率 |
|---|---|---|
| COMBAT | 55 | 55% |
| EVENT | 25 | 25% |
| REST | 5 | 5% |
| CHOICE | 15 | 15% |

備註：
- 第 4 層權重表裡的 `REST` 只佔 5%，因為「至少每 4 step 一次 Rest」已經由第 2 層的保底規則涵蓋，權重表的 REST 是額外的加碼（code 內註記為 ASSUMPTION，可自由調整）。
- `step % 5 == 0` 與 `step % 9 == 0` 在 `step = 45`（5、9 的公倍數）等節點會同時成立，此時優先套用第 3 層（STRONG_ELITE），不會出現「同時是 Elite 又是 Strong Elite」的情況。
- `EVENT` 與 `CHOICE` 在生成邏輯上共用同一條分支（都呼叫 `eventService.selectEvent`），實際細分的事件模板權重不在本文件範圍，見 `openspec/specs/adventure-events/spec.md`（僅定案「依權重表決定性 RNG 選出事件模板」，未列出各模板的權重值——待確認）。

## 2. 敵人 tier 分佈

Tier（`NORMAL`/`ELITE`/`STRONG_ELITE`/`BOSS`）**不是獨立機率抽取**，而是直接對應第 1 節的節點類型判定結果：

| Tier | 觸發條件 | 頻率 |
|---|---|---|
| BOSS | Stage 最後一個節點 | 每個 Stage 必出現 1 次（10~20 節點中的最後一個） |
| STRONG_ELITE | `step % 9 == 0`（且未被保底 Rest 或 Stage 邊界覆蓋） | 約每 9 step 1 次 |
| ELITE | `step % 5 == 0`（且未被保底 Rest、Strong Elite 或 Stage 邊界覆蓋） | 約每 5 step 1 次（扣除 9 的倍數） |
| NORMAL | 加權隨機命中 `COMBAT`（權重 55/100，且未觸發前述任何決定性規則） | 依權重隨機 |

敵人數值倍率（`getStatMultipliers`，`server/constants/difficulty.ts`）：

| Tier | HP 倍率 | ATK 倍率 | DEF 倍率 |
|---|---|---|---|
| NORMAL | ×1（僅套用等級基礎曲線） | ×1 | ×1 |
| ELITE | ×1.8 | ×1.6 | ×1.3 |
| STRONG_ELITE | ×2.6 | ×2.1 | ×1.6 |
| BOSS | ×4.0 | ×2.8 | ×2.0 |

等級基礎曲線：`enemyLevel = 1 + floor(step / 2)`；`baseHp = 1 + (enemyLevel-1) × 0.08`、`baseAtk = 1 + (enemyLevel-1) × 0.07`、`baseDef = 1 + (enemyLevel-1) × 0.05`，上表倍率疊乘在這條基礎曲線之上（不是疊加在 1 級敵人身上）。

敵人**範本（archetype）**選擇：目前 `ENEMY_ARCHETYPES` 只有 4 隻（維修型 GkBot／保全機具／失控搬運機／廢棄零件堆），一般 COMBAT/ELITE/STRONG_ELITE 節點的每一隻敵人都是獨立 uniform random 抽取（`Math.floor(roll * 4)`），也就是每隻各 **25%** 機率，tier/faction 完全不影響範本抽取權重（沒有依 tier 篩選範本池）。

## 3. 多波次／多敵人機率（一般 COMBAT/ELITE/STRONG_ELITE 節點）

`rollWaveCount`/`rollEnemyCount`（`server/constants/difficulty.ts`）皆採 `clamp(base + perStep×step, 0, cap)` 的線性公式，隨 `step` 動態提高：

| 項目 | 公式 | base | 每 step 增量 | 上限 |
|---|---|---|---|---|
| 第 2 波觸發機率 | `clamp(0.10 + 0.01×step, 0, 0.60)` | 10% | +1%/step | 60% |
| 第 2 隻敵人觸發機率 | `clamp(0.15 + 0.01×step, 0, 0.70)` | 15% | +1%/step | 70% |
| 第 3 隻敵人觸發機率 | `clamp(0.05 + 0.006×step, 0, 0.45)` | 5% | +0.6%/step | 45% |

判定方式：
- 波次：`rngValue < wave2Chance` → 2 波（`DIFFICULTY_CONFIG.WAVE_COUNT_MAX = 2`，目前無 3 波以上機制），否則 1 波。
- 每波敵人數：單次 RNG draw，門檻堆疊判定——`[0, enemy3Chance)` → 3 隻、`[enemy3Chance, enemy3Chance+enemy2Chance)` → 2 隻、其餘 → 1 隻（`DIFFICULTY_CONFIG.ENEMY_COUNT_MAX = 3`）。**注意**：`enemy3Chance` 與 `enemy2Chance` 是分別各自的門檻寬度直接相加，並非「先判定是否 ≥2 隻，再判定是否到 3 隻」的兩層獨立機率，數值解讀時需留意。
- 波次與每波敵人數各自獨立 roll，且第 2 波沿用同一個 `enemyCountPerWave`（同一個 Stage 節點內的 wave 1 也用 `rollEnemyCount` 的結果，wave 2 在 `combat.service.ts` 內於戰鬥實際發生時才另外決定其陣容——僅第一波在節點生成階段就先決定並展示於「遭遇敵人」預覽畫面，見 `EnemyPreview`/`buildCombatNodeData` 註解「後續波次保持神秘」）。

## 4. Boss 節點的敵人組成（不套用第 3 節公式）

Boss 節點固定 **1 波**，敵人陣容固定為「**1 隻 Boss 本體 + 該範本 `bossMinionCount` 隻小兵護衛**」，不經過 `rollWaveCount`/`rollEnemyCount`：

- Boss 範本：從同一份 `ENEMY_ARCHETYPES`（4 隻）uniform random 抽取 1 隻（各 25%），該範本同時決定 Boss 本體與小兵的外觀/描述（目前沒有獨立的 Boss 專屬範本清單）。
- `bossMinionCount`（每個範本固定值，非機率）：

| 範本 | bossMinionCount | canReinforce |
|---|---|---|
| 維修型 GkBot | 2 | 是 |
| 保全機具 | 2 | 否 |
| 失控搬運機 | 1 | 是 |
| 廢棄零件堆| 0 | 否 |

- Boss 本體套用 `BOSS` tier 倍率；小兵護衛套用 `STRONG_ELITE` tier 倍率（不是 Boss 倍率）。
- **補位機制**（`BOSS_REINFORCE_CONFIG`，`server/constants/combat.ts`，戰鬥實際進行中才觸發，不在節點生成階段預覽）：僅當抽中的範本 `canReinforce = true` 時才會觸發；每滿 **3 回合**檢查一次，若當前存活小兵數 < 2，則以 **50%** 機率補一隻新小兵（沿用同一範本、`STRONG_ELITE` 倍率），單場戰鬥最多補 **2** 次。

## 5. 機率是否隨 run 進度（step）動態變化

| 機率/規則 | 是否隨 step 變化 | 說明 |
|---|---|---|
| 節點類型（Rest/Elite/Strong Elite/加權隨機） | 觸發**時機**隨 step 變化（週期性），但各觸發條件本身的機率值不隨 step 改變 | 保底 Rest 看「距上次 Rest 的 step 差」，Elite/Strong Elite 看 step 是否為 5/9 倍數 |
| enemyLevel、hp/atk/def 倍率 | 是，隨 step 單調遞增 | `enemyLevel = 1 + floor(step/2)` |
| 第 2 波觸發機率 | 是 | 10% → 60%（每 step +1%，step ≥ 50 觸頂） |
| 第 2/3 隻敵人觸發機率 | 是 | 分別 15%→70%、5%→45%（每 step +1%/+0.6%） |
| Boss `bossMinionCount`、補位機率 | 否 | 純粹取決於抽中的範本與固定機率，不受 step 影響 |
| 敵人範本抽取（4 選 1） | 否 | 全程固定各 25%，不因 step 或 tier 改變權重 |

## 6. 規劃中、尚未落地的機率調整

- `openspec/changes/enemy-factions-and-severity/`（proposal 已提出，`tasks.md` 全數未勾選，程式碼尚未有任何對應實作）：規劃在 `createRun` 時依角色 `chapterIndex` 動態機率決定該趟遠征的**設施風險分級**（`DEEP_WRECK`/`PARTIAL_ACTIVE`/`HIGHLY_ACTIVE`，公式仿照本文件第 3 節 `scaledChance` 手法）與**敵對陣營**（`GKBOT`/`HUMAN`，機率隨分級提高），並將現行 4 隻 `ENEMY_ARCHETYPES` 擴充為機械/人類各 8 小兵 + 8 頭目（共 32 隻）、Boss 改用獨立頭目清單而非「小兵疊 BOSS 倍率」。**這些機率規則目前完全不存在於程式碼**，本文件第 1~5 節描述的都是尚未套用風險分級/陣營的現行行為。
- `openspec/changes/chapter-level-structure/`：`tasks.md` 雖然全數未勾選，但比對程式碼後確認核心邏輯（`LEVEL_COUNT_RANGE_BY_FACILITY`、`SettleSummary.chapterAdvanced`、Boss 小兵陣容、補位機制）**已經落地在現行程式碼中**，本文件第 4 節即依此現況撰寫；`openspec/specs/adventure-run-lifecycle/spec.md` 目前文字仍停留在「單一 Stage、run 完成即切換設施主題」的舊版描述，尚未同步 archive，屬於文件落後於程式碼的已知缺口。

## 落地備註

- 事件（EVENT/CHOICE）節點內部各模板的抽取權重不在本文件範圍內（`adventure-events` spec 只定案「依權重表」，未列出實際權重值）——待確認，需另外查證事件模板定義檔案。
- 第 3 節「每波敵人數」門檻堆疊的相加式判定方式（而非分層機率）是實際 code 行為，設計時間如需分析真實分佈，需按此堆疊方式重新計算，不可直接假設 `enemy2Chance`、`enemy3Chance` 各自獨立。
- 若日後 `enemy-factions-and-severity` 落地，本文件第 2、4、6 節需要整體改寫（tier/範本抽取權重會依風險分級與陣營重新設計），屆時應另開一版或整併更新，並移除第 6 節對應條目。
