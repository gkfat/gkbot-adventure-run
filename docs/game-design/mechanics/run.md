# Run（冒險遠征）結構與流程

> 本文件是內部設計參考文件，說明 Chapter/Level/Run/Stage 四層階層、「一次 Run」從開始到結算的完整生命週期、Stage（節點）觸發邏輯、Run 內臨時背包規則，以及難度隨 step 成長的公式。對應規格與程式碼：
> - `openspec/specs/adventure-run-lifecycle/spec.md` — Run 生命週期主規格（含章節/關卡階層）
> - `openspec/specs/adventure-events/spec.md` — EVENT 節點內部邏輯
> - `openspec/specs/combat-engine/spec.md` — 戰鬥/Boss 護衛與補位機制（見 `combat.md`）
> - `openspec/specs/deterministic-rng/spec.md` — RNG 機制
> - `server/services/adventure-run.service.ts` — 實際實作
> - `shared/types/adventure.ts` — 型別與常數（`NODE_CONFIG`/`DIFFICULTY_CONFIG`/`STAGE_CONFIG`/`LEVEL_COUNT_RANGE_BY_FACILITY`）
> - `server/constants/difficulty.ts` — 難度曲線公式
> - `shared/types/item.ts` — `RunInventory`/`ItemInstance`

## 1. Run 的整體生命週期

對應：`adventure-run-lifecycle/spec.md`「開始新的冒險 Run」「Stage 完成即結束 Run」「Run 結算」「斷線重連與逾時結束」。

一次 Run 的狀態機（`AdventureStateType`）：

```
INIT → EXPLORING ⇄ (COMBAT / EVENT / REST) → RESOLUTION → (BLESSING_SELECT →) EXPLORING → ... → ENDED
```

| 狀態 | 說明 |
|---|---|
| INIT | Run 剛建立，尚未開始 |
| EXPLORING | 選擇下一個節點 |
| COMBAT | 戰鬥中（含 ELITE/STRONG_ELITE/BOSS） |
| EVENT | 隨機事件（含 CHOICE 節點） |
| REST | 休息節點，可使用藥水 |
| BLESSING_SELECT | 祝福選擇（`blessingPoints` 達門檻時） |
| RESOLUTION | 節點結果確認，玩家需按繼續 |
| ENDED | Run 已結束 |

### 1.1 開始 Run

- 系統 SHALL 僅在角色沒有其他進行中（`state != ENDED`）的 run 時，允許 `POST /api/adventure/start` 建立新 run。
- 已有進行中 run 時再次呼叫會回傳 409。
- 建立時：`seed` 產生、`state = INIT`、`step = 0`、`rngIndex = 0`，並以決定性 RNG roll 出本次 Run（對應一個 Level）的 Stage 總數（`stageNodeCount`，10~20）。
- `chapterIndex` 設為角色目前的 `nextChapterIndex`，決定本次遠征的裂域設施主題（僅供顯示/敵人風味，run 期間不遞增）。
- `currentLevelIndex`/`chapterTotalLevels` 不在 run 建立時決定，而是記在**角色文件**上，只在角色首次進入一個新章節時 roll 一次（見第 2 節）；同一章節內開始新 run 沿用既有值。

### 1.2 結束與結算

Run 結束原因（`AdventureEndReason`）：`COMPLETED`（Boss 戰勝利）、`DEAD`（HP 歸零）、`DISCONNECT`（超過重連窗口）、`QUIT`/`TIMEOUT`（保留，目前未使用）。

| 結算項目 | COMPLETED | DEAD / DISCONNECT |
|---|---|---|
| `expEarned` → 角色 `exp` | 生效（含升級判定） | 生效（含升級判定） |
| `goldEarned`/`gemsEarned` → 角色資源 | 生效（clamp 於 `[0, 100000)`） | 不生效，計入 `forfeitedGold`/`forfeitedGems` |
| Run 背包物品 → 永久背包 | 生效（受 500 格上限限制） | 不生效，計入 `forfeitedItems`（作廢） |
| `currentLevelIndex` | 未攻略完章節最後一關時 +1；已是最後一關時重設為 0 | 不變 |
| `nextChapterIndex` | 只有攻略完章節最後一關才 +1（並重新 roll 新章節的 `chapterTotalLevels`） | 不變 |

- 斷線重連：以 `lastActivityAt` 判斷，15 分鐘內（`NODE_CONFIG.RECONNECT_WINDOW_MS`）呼叫 `GET /api/adventure/current` 可恢復；超過窗口則自動以 `endReason = DISCONNECT` 結算。
- Boss 戰勝利後，即使 `blessingPoints` 已達 `BLESSING_POINTS_THRESHOLD`（3），也 SHALL 略過 `BLESSING_SELECT`，直接結算（single-stage-run-settlement 規則）。
- 死亡/斷線結算 SHALL NOT 異動 `nextChapterIndex`/`currentLevelIndex`/`chapterTotalLevels`：玩家下次開始新 run 時沿用同一個章節、同一個關卡重新挑戰。
- 永久背包已滿時，未轉入的物品會被明確標記在結算摘要（`untransferredItemIds`），不可靜默遺失、也不可讓背包超過 500 格上限。
- 結算摘要（`SettleSummary`）會寫入 run 文件的 `settlement` 欄位，並在觸發結算的 API 回應中回傳一次，包含：`goldEarned`/`gemsEarned`/`items`/`expGained`/`leveledUp`/`newLevel`/`unspentAttributePointsGained`，以及失敗時的 `forfeitedGold`/`forfeitedGems`/`forfeitedItems`；`chapterAdvanced`（布林）標示這次結算是否清完章節最後一關並切換到下一個設施主題（`true`）或只是同章節內推進到下一關（`false`），`DEAD`/`DISCONNECT` 結算恆為 `false`。

## 2. Chapter → Level → Run → Stage 四層階層

對應：`adventure-run-lifecycle/spec.md`「章節與關卡的階層」「Stage 結構與 Boss 節點」；`shared/types/adventure.ts` `STAGE_CONFIG`/`LEVEL_COUNT_RANGE_BY_FACILITY`；敘事層級的骨架見 `docs/worldview.md` 第 6 節。

| 層級 | 定義 | 對應欄位/型別 |
|---|---|---|
| Chapter（章節） | 一個裂域設施主題，依序循環 `STAGE_CONFIG.FACILITY_THEMES`（8 種） | 角色文件 `nextChapterIndex` |
| Level（關卡） | 章節內第幾趟遠征；章節總關卡數在**角色首次進入該章節時**以決定性 RNG 依設施類型區間 roll 定，同章節內固定不變 | 角色文件 `currentLevelIndex`（0-based）/`chapterTotalLevels` |
| Run（一次遠征） | 現行「一次遠征」概念，對應**章節內的一個關卡**（而非整個設施）；同一章節內的所有 Level 共用同一個設施主題 | `AdventureRun.chapterIndex` |
| Stage（原稱「節點/Node」） | 一次 Run 內固定 10~20 個 Stage，最後一個 Stage 固定為該關卡的 Boss 戰，打贏即代表這個關卡攻略成功 | `AdventureRun.stageNodeIndex`/`stageNodeCount`；程式碼型別/欄位仍沿用 `NodeType`/`currentNodeData` 等既有命名，僅規格文件對外說法改稱 Stage，行為與程式碼識別字皆未變動 |

### 2.1 章節總關卡數（`chapterTotalLevels`）如何決定

- 觸發時機：`nextChapterIndex` 剛遞增（攻略完上一章節）或角色文件初始建立（`nextChapterIndex = 0`）時，系統依新章節對應的設施類型，從「設施類型 → 關卡數區間」對照表（`LEVEL_COUNT_RANGE_BY_FACILITY`）以決定性 RNG roll 出 `chapterTotalLevels`（含頭尾），並將 `currentLevelIndex` 重設為 0。
- `chapterTotalLevels` 在同一章節內固定不變；同一章節內從關卡 1 推進到關卡 2 時，`chapterIndex`（設施主題）不變，只有 `currentLevelIndex` 遞增。
- 完整 8 種設施類型的區間值定案於 `LEVEL_COUNT_RANGE_BY_FACILITY` 常數（例如「無主小賣店」對應 3~5、「廢棄研究所」對應 8~12），每種設施類型皆有明確定案的區間，不允許缺漏。
- 設施主題清單循環到底時（`nextChapterIndex` 超過清單長度），依序循環回第一個設施主題繼續使用，並依循環後對應到的設施類型重新 roll 該章節的 `chapterTotalLevels`。

### 2.2 首頁顯示

首頁開始/繼續冒險入口的按鈕上方 SHALL 以小字顯示目前設施主題名稱與章節內關卡進度（`currentLevelIndex + 1` / `chapterTotalLevels`，例如「廢棄維修廠 - 3/7」），CTA 按鈕本身文案（「開始探索」/「繼續冒險」）不重複設施名稱。

## 3. Stage（節點）層級結構

對應：`adventure-run-lifecycle/spec.md`「Stage 結構與 Boss 節點」「節點生成優先序」；`shared/types/adventure.ts` `STAGE_CONFIG`/`NODE_CONFIG`。

一次 Run（對應一個 Level）內含 10~20 個 Stage（`STAGE_CONFIG.NODE_COUNT_MIN/MAX`，建立時以決定性 RNG 一次 roll 定，存於 `run.stageNodeCount`）。

- `run.chapterIndex`：裂域設施主題索引，對應 `STAGE_CONFIG.FACILITY_THEMES`（依序循環，目前 8 種：廢棄補給站、廢棄研究所、廢棄維修廠、崩壞VR體驗館、廢棄工廠、荒廢遊樂場、廢棄百貨公司、無主小賣店）。
- `run.stageNodeIndex`：目前 Run 內的 Stage 序號（0-based）。
- Run 的最後一個 Stage（`stageNodeIndex == stageNodeCount - 1`）SHALL 固定為 `BOSS` combat，不受保底 Rest 或加權隨機影響；打贏即代表這個 Level 攻略成功。

### 3.1 節點生成優先序

依序判斷（優先序高到低）：

1. **Stage 邊界**：目前是本次 Run 最後一個 Stage → 固定 `BOSS`
2. **保底 Rest**：距上次 Rest 節點（`lastRestStep`）已達 `NODE_CONFIG.REST_GUARANTEED_INTERVAL`（4 step）→ 固定 `REST`
3. **固定精英節奏**：`step % NODE_CONFIG.STRONG_ELITE_INTERVAL(9) == 0` → `STRONG_ELITE`；否則 `step % NODE_CONFIG.ELITE_INTERVAL(5) == 0` → `ELITE`
4. **加權隨機**：以上皆未觸發時，依 `NODE_CONFIG.WEIGHTED_NODE_WEIGHTS` 加權隨機

| 節點類型 | 權重 | 機率 |
|---|---|---|
| COMBAT | 55 | 55% |
| EVENT | 25 | 25% |
| CHOICE | 15 | 15% |
| REST | 5 | 5% |

> ASSUMPTION（`NODE_CONFIG` 註解原文）：Rest 權重刻意設低，因為保底 Rest 規則已涵蓋大部分回血需求；此為可調整的平衡數值。

## 4. Node 類型與觸發邏輯

對應：`shared/types/adventure.ts` `NodeType`；`adventure-events/spec.md`；`server/services/adventure-run.service.ts` `advanceFromExploring`。

| NodeType | 觸發方式 | 進入狀態 | 說明 |
|---|---|---|---|
| COMBAT | 加權隨機命中 | COMBAT | 一般戰鬥，敵人等級/波次依難度公式（見第 6 節） |
| ELITE | `step % 5 == 0` | COMBAT | 精英戰鬥，套用 `ELITE_*_MULT` 加成 |
| STRONG_ELITE | `step % 9 == 0` | COMBAT | 強精英戰鬥，套用 `STRONG_ELITE_*_MULT` 加成 |
| BOSS | Run 最後一個 Stage | COMBAT | Boss 戰（含小兵護衛與補位機制，見 `combat.md` 第 6 節），套用 BOSS tier 倍率 |
| EVENT | 加權隨機命中 | EVENT | 依權重表以決定性 RNG 選出事件模板（HEAL/BLESSING/CURSE/WHEEL/CHOICE，見 `EventType`） |
| CHOICE | 加權隨機命中 | EVENT | 與 EVENT 節點共用同一套事件解析流程（`eventService.selectEvent`），僅節點類型標籤與加權桶不同 |
| REST | 保底規則命中 | REST | 進入時自動回復固定 `NODE_CONFIG.REST_AUTO_HEAL_PERCENT`（20%）`playerHpMax`（不超過上限），另可使用藥水回血（見第 5 節），不可在其他狀態使用 |

### 4.1 EVENT 節點內部邏輯

- 進入 EVENT 節點時，系統依權重表以決定性 RNG 選出一個事件模板。
- 若事件模板帶有 `choices`：等待玩家呼叫 `POST /api/adventure/event/resolve`（帶 `choiceIndex`），依該 choice 的 cost/reward/risk 計算結果；缺少或不存在的 `choiceIndex` 回傳 400。
- 若事件模板沒有 `choices`（例如單純補血事件）：系統立即計算結果並進入 RESOLUTION。
- **事件轉盤（WHEEL）**：依既定機率發放 gems（3% 機率 1~5 顆）、金幣（67%）、物品（15%），或無任何獎勵（15%）。

### 4.2 戰鬥節點的敵人數量/波次

戰鬥節點（COMBAT/ELITE/STRONG_ELITE）建立時即決定 `waveCount` 與 `enemyCountPerWave`（供「遭遇敵人」預覽畫面顯示第一波），波次上限 1~2、每波敵人數上限 1~3（見 `combat.md` 第 5 節）；後續波次的敵人組成在戰鬥實際結算時才決定（`combat.service.ts`，本文件不涉及戰鬥數值細節）。

## 5. Run 臨時背包（RunInventory）與戰利品結算

對應：`shared/types/item.ts` `RunInventory`/`ItemInstance`；`adventure-run-lifecycle/spec.md`「Run 結算」「於休息節點使用藥水」。

- `RunInventory.items: ItemInstance[]`，上限 50 格（`shared/types/item.ts` 註解）。
- Run 期間戰鬥/事件掉落的裝備與藥水暫存於 `run.runInventory`，不直接進永久背包。
- **休息節點自動回血**：`advanceFromExploring` 判定進入 REST 節點時，直接依 `NODE_CONFIG.REST_AUTO_HEAL_PERCENT`（固定 20%）`playerHpMax` 回復 HP（clamp 至 `playerHpMax`，不需消耗任何物品），回血量記錄於該次 `currentNodeData.autoHealAmount` 供前端顯示。
- **休息節點用藥**：在自動回血之後，仍允許在 REST 節點對玩家持有的 `type = POTION` 物品實體額外執行使用（永久背包或 run 背包皆可指定），依該實體稀有度的 `healPercent` 立即回復 HP（不超過 `playerHpMax`），並消耗（移除）該物品實體；非 REST 狀態或非藥水物品呼叫回傳 400，不異動 HP 或背包。
- **Run 結束轉移規則**：
  - `endReason = COMPLETED`：run 背包內剩餘物品（裝備＋未使用藥水）轉入永久背包，受永久背包 500 格上限限制；超過上限的部分標記為 `untransferredItemIds`，不可靜默遺失。
  - `endReason = DEAD` / `DISCONNECT`：run 背包內物品一律作廢（不轉入永久背包），計入結算摘要的 `forfeitedItems`。

## 6. 難度曲線（隨 step 成長）

對應：`server/constants/difficulty.ts`；`shared/types/adventure.ts` `DIFFICULTY_CONFIG`。

### 6.1 敵人等級

```
enemyLevel = 1 + floor(step / DIFFICULTY_CONFIG.ENEMY_LEVEL_STEP_DIVISOR)
```

`ENEMY_LEVEL_STEP_DIVISOR = 2`。例如 `step = 10` → `enemyLevel = 1 + floor(10/2) = 6`。

### 6.2 屬性倍率（依等級 + tier）

`levelSteps = max(0, enemyLevel - 1)`：

| 屬性 | 每級基礎成長 |
|---|---|
| HP | `1 + levelSteps × 0.08`（`HP_MULT_PER_LEVEL`） |
| ATK | `1 + levelSteps × 0.07`（`ATK_MULT_PER_LEVEL`） |
| DEF | `1 + levelSteps × 0.05`（`DEF_MULT_PER_LEVEL`） |

Tier 倍率疊加在基礎成長曲線之上（非疊加在 1 級敵人上）：

| Tier | HP 倍率 | ATK 倍率 | DEF 倍率 |
|---|---|---|---|
| NORMAL | 1.0 | 1.0 | 1.0 |
| ELITE | 1.8 | 1.6 | 1.3 |
| STRONG_ELITE | 2.6 | 2.1 | 1.6 |
| BOSS | 4.0 | 2.8 | 2.0 |

> ASSUMPTION（`difficulty.ts` 註解原文）：BOSS 倍率延續 Elite/Strong Elite 的成長曲線，三項屬性皆高於 STRONG_ELITE，屬設計假設值。

最終倍率 = 基礎成長曲線 × tier 倍率，例如 `step = 10`（`enemyLevel = 6`, `levelSteps = 5`）的 STRONG_ELITE：`HP mult = (1 + 5×0.08) × 2.6 = 1.4 × 2.6 = 3.64`。

### 6.3 多波次 / 多敵人機率

依 `step` 線性成長並 clamp 上限，共用公式 `clamp(base + perStep × step, 0, cap)`：

| 機率 | Base | Per-step | Cap |
|---|---|---|---|
| 第 2 波出現機率（`getWave2Chance`） | 0.10 | +0.01 | 0.60 |
| 單波第 2 隻敵人機率（`getEnemy2Chance`） | 0.15 | +0.01 | 0.70 |
| 單波第 3 隻敵人機率（`getEnemy3Chance`） | 0.05 | +0.006 | 0.45 |

- `WAVE_COUNT_MAX = 2`：最多 2 波。
- `ENEMY_COUNT_MAX = 3`：單波最多 3 隻敵人。
- 波次數（`rollWaveCount`）：單次 RNG draw `< getWave2Chance(step)` → 2 波，否則 1 波。
- 單波敵人數（`rollEnemyCount`）：門檻疊加判定，`[0, enemy3Chance)` → 3 隻，`[enemy3Chance, enemy3Chance+enemy2Chance)` → 2 隻，否則 1 隻。
- **BOSS tier 固定 1 wave，不套用以上機率判定**，改為「1 隻 Boss + 最多 2 隻小兵」固定陣容，詳見 `combat.md` 第 6 節（BOSS 護衛與增援機制）。

## 7. RNG 機制

對應：`openspec/specs/deterministic-rng/spec.md`。

- 系統以 `random(seed, rngIndex)` 作為 run 內所有隨機性（節點生成、戰鬥、事件）的唯一來源。
- 每次消耗後 `rngIndex` 立即遞增並持久化，不重複消耗同一 index。
- client 不可取得 `seed` 或預知未來 RNG 結果（API 回應不包含 `seed` 欄位）。

## 落地備註

- 本文件涵蓋的所有數值/公式（第 1、3~7 節）均已在主 spec（`adventure-run-lifecycle`、`adventure-events`、`deterministic-rng`）與 `server/services/adventure-run.service.ts`、`server/constants/difficulty.ts` 中落地實作。
- 第 2 節（Chapter/Level/Run/Stage 四層階層）原屬 `openspec/changes/chapter-level-structure/` 的規劃內容，已於 2026-09-01 sync 回主 spec（`adventure-run-lifecycle/spec.md`）並 archive，程式碼（`shared/types/adventure.ts` 的 `LEVEL_COUNT_RANGE_BY_FACILITY`/`rollChapterTotalLevels`/`getStageDisplayName` 等）與 `adventure-run.service.ts` 已串接主流程，現為現行機制。
- 「Stage」一詞僅為規格文件對「節點/Node」的對外說法調整（純命名，行為不變），程式碼型別/欄位（`NodeType`、`currentNodeData`、`stageNodeIndex`/`stageNodeCount`）維持既有命名未變動。
- CHOICE 節點與 EVENT 節點共用同一套 `eventService.selectEvent` 解析流程，`adventure-events/spec.md` 目前僅以「EVENT 節點」措辭描述，未特別區分 CHOICE；本文件依程式碼實作（`advanceFromExploring` 對 `NodeType.EVENT`/`NodeType.CHOICE` 走同一分支）補充說明。
- 戰鬥節點後續波次的敵人組成細節（archetype 選擇、Boss 護衛/補位、戰鬥紀錄逐批播放）不在本文件範圍，見 `combat.md`。
