# Run（冒險遠征）結構與流程

> 本文件是內部設計參考文件，說明「一次 Run」從開始到結算的完整生命週期、Stage/Node 階層、各 Node 類型觸發邏輯、Run 內臨時背包規則，以及難度隨 step 成長的公式。對應規格與程式碼：
> - `openspec/specs/adventure-run-lifecycle/spec.md` — Run 生命週期主規格
> - `openspec/specs/adventure-events/spec.md` — EVENT 節點內部邏輯
> - `openspec/specs/deterministic-rng/spec.md` — RNG 機制
> - `server/services/adventure-run.service.ts` — 實際實作
> - `shared/types/adventure.ts` — 型別與常數（`NODE_CONFIG`/`DIFFICULTY_CONFIG`/`STAGE_CONFIG`）
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
- 建立時：`seed` 產生、`state = INIT`、`step = 0`、`rngIndex = 0`，並以決定性 RNG roll 出本次 Stage 的節點總數（`stageNodeCount`，10~20）。
- `chapterIndex` 設為角色目前的 `nextChapterIndex`，決定本次遠征的裂域設施主題（僅供顯示/敵人風味，run 期間不遞增）。

### 1.2 結束與結算

Run 結束原因（`AdventureEndReason`）：`COMPLETED`（Boss 戰勝利）、`DEAD`（HP 歸零）、`DISCONNECT`（超過重連窗口）、`QUIT`/`TIMEOUT`（保留，目前未使用）。

| 結算項目 | COMPLETED | DEAD / DISCONNECT |
|---|---|---|
| `expEarned` → 角色 `exp` | 生效（含升級判定） | 生效（含升級判定） |
| `goldEarned`/`gemsEarned` → 角色資源 | 生效（clamp 於 `[0, 100000)`） | 不生效，計入 `forfeitedGold`/`forfeitedGems` |
| Run 背包物品 → 永久背包 | 生效（受 500 格上限限制） | 不生效，計入 `forfeitedItems`（作廢） |
| `nextChapterIndex` | +1 | 不變 |

- 斷線重連：以 `lastActivityAt` 判斷，15 分鐘內（`NODE_CONFIG.RECONNECT_WINDOW_MS`）呼叫 `GET /api/adventure/current` 可恢復；超過窗口則自動以 `endReason = DISCONNECT` 結算。
- Boss 戰勝利後，即使 `blessingPoints` 已達 `BLESSING_POINTS_THRESHOLD`（3），也 SHALL 略過 `BLESSING_SELECT`，直接結算（single-stage-run-settlement 規則）。
- 永久背包已滿時，未轉入的物品會被明確標記在結算摘要（`untransferredItemIds`），不可靜默遺失、也不可讓背包超過 500 格上限。
- 結算摘要（`SettleSummary`）會寫入 run 文件的 `settlement` 欄位，並在觸發結算的 API 回應中回傳一次，包含：`goldEarned`/`gemsEarned`/`items`/`expGained`/`leveledUp`/`newLevel`/`unspentAttributePointsGained`，以及失敗時的 `forfeitedGold`/`forfeitedGems`/`forfeitedItems`。

## 2. Stage / Node 層級結構

對應：`adventure-run-lifecycle/spec.md`「Stage 結構與 Boss 節點」「節點生成優先序」；`shared/types/adventure.ts` `STAGE_CONFIG`/`NODE_CONFIG`。

目前（已落地）架構：**一次 Run = 一個 Stage**，Stage 內含 10~20 個節點（`STAGE_CONFIG.NODE_COUNT_MIN/MAX`，建立時以決定性 RNG 一次 roll 定，存於 `run.stageNodeCount`）。

- `run.chapterIndex`：裂域設施主題索引，對應 `STAGE_CONFIG.FACILITY_THEMES`（依序循環，目前 8 種：廢棄補給站、廢棄研究所、廢棄維修廠、崩壞VR體驗館、廢棄工廠、荒廢遊樂場、廢棄百貨公司、無主小賣店）。
- `run.stageNodeIndex`：目前 Stage 內的節點序號（0-based）。
- Stage 的最後一個節點（`stageNodeIndex == stageNodeCount - 1`）SHALL 固定為 `BOSS` combat，不受保底 Rest 或加權隨機影響。

### 2.1 節點生成優先序

依序判斷（優先序高到低）：

1. **Stage 邊界**：目前節點是 Stage 最後一個節點 → 固定 `BOSS`
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

## 3. Node 類型與觸發邏輯

對應：`shared/types/adventure.ts` `NodeType`；`adventure-events/spec.md`；`server/services/adventure-run.service.ts` `advanceFromExploring`。

| NodeType | 觸發方式 | 進入狀態 | 說明 |
|---|---|---|---|
| COMBAT | 加權隨機命中 | COMBAT | 一般戰鬥，敵人等級/波次依難度公式（見第 5 節） |
| ELITE | `step % 5 == 0` | COMBAT | 精英戰鬥，套用 `ELITE_*_MULT` 加成 |
| STRONG_ELITE | `step % 9 == 0` | COMBAT | 強精英戰鬥，套用 `STRONG_ELITE_*_MULT` 加成 |
| BOSS | Stage 最後一個節點 | COMBAT | Boss 戰，套用 BOSS tier 倍率 |
| EVENT | 加權隨機命中 | EVENT | 依權重表以決定性 RNG 選出事件模板（HEAL/BLESSING/CURSE/WHEEL/CHOICE，見 `EventType`） |
| CHOICE | 加權隨機命中 | EVENT | 與 EVENT 節點共用同一套事件解析流程（`eventService.selectEvent`），僅節點類型標籤與加權桶不同 |
| REST | 保底規則命中 | REST | 可使用藥水回血（見第 4 節），不可在其他狀態使用 |

### 3.1 EVENT 節點內部邏輯

- 進入 EVENT 節點時，系統依權重表以決定性 RNG 選出一個事件模板。
- 若事件模板帶有 `choices`：等待玩家呼叫 `POST /api/adventure/event/resolve`（帶 `choiceIndex`），依該 choice 的 cost/reward/risk 計算結果；缺少或不存在的 `choiceIndex` 回傳 400。
- 若事件模板沒有 `choices`（例如單純補血事件）：系統立即計算結果並進入 RESOLUTION。
- **事件轉盤（WHEEL）**：支援依既定機率發放物品、gems（3% 機率 1~5 顆）或金幣。

### 3.2 戰鬥節點的敵人數量/波次

戰鬥節點（COMBAT/ELITE/STRONG_ELITE）建立時即決定 `waveCount` 與 `enemyCountPerWave`（供「遭遇敵人」預覽畫面顯示第一波），後續波次的敵人組成在戰鬥實際結算時才決定（`combat.service.ts`，本文件不涉及戰鬥數值細節，見 `item-drop-and-stats.md` 之外的 combat-engine 相關 spec）。

## 4. Run 臨時背包（RunInventory）與戰利品結算

對應：`shared/types/item.ts` `RunInventory`/`ItemInstance`；`adventure-run-lifecycle/spec.md`「Run 結算」「於休息節點使用藥水」。

- `RunInventory.items: ItemInstance[]`，上限 50 格（`shared/types/item.ts` 註解）。
- Run 期間戰鬥/事件掉落的裝備與藥水暫存於 `run.runInventory`，不直接進永久背包。
- **休息節點用藥**：僅允許在 REST 節點對玩家持有的 `type = POTION` 物品實體執行使用（永久背包或 run 背包皆可指定），依該實體稀有度的 `healPercent` 立即回復 HP（不超過 `playerHpMax`），並消耗（移除）該物品實體；非 REST 狀態或非藥水物品呼叫回傳 400，不異動 HP 或背包。
- **Run 結束轉移規則**：
  - `endReason = COMPLETED`：run 背包內剩餘物品（裝備＋未使用藥水）轉入永久背包，受永久背包 500 格上限限制；超過上限的部分標記為 `untransferredItemIds`，不可靜默遺失。
  - `endReason = DEAD` / `DISCONNECT`：run 背包內物品一律作廢（不轉入永久背包），計入結算摘要的 `forfeitedItems`。

## 5. 難度曲線（隨 step 成長）

對應：`server/constants/difficulty.ts`；`shared/types/adventure.ts` `DIFFICULTY_CONFIG`。

### 5.1 敵人等級

```
enemyLevel = 1 + floor(step / DIFFICULTY_CONFIG.ENEMY_LEVEL_STEP_DIVISOR)
```

`ENEMY_LEVEL_STEP_DIVISOR = 2`。例如 `step = 10` → `enemyLevel = 1 + floor(10/2) = 6`。

### 5.2 屬性倍率（依等級 + tier）

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

### 5.3 多波次 / 多敵人機率

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

## 6. RNG 機制

對應：`openspec/specs/deterministic-rng/spec.md`。

- 系統以 `random(seed, rngIndex)` 作為 run 內所有隨機性（節點生成、戰鬥、事件）的唯一來源。
- 每次消耗後 `rngIndex` 立即遞增並持久化，不重複消耗同一 index。
- client 不可取得 `seed` 或預知未來 RNG 結果（API 回應不包含 `seed` 欄位）。

## 7. 規劃中、尚未落地：Chapter → Level → Run → Stage 四層階層

對應：`openspec/changes/chapter-level-structure/proposal.md`（**尚未 merge 進主 spec，以下內容僅為規劃方向，程式碼與主 spec 均未實作**）。

現行結構是扁平的「一次 Run = 一趟完整遠征」，攻略成功即直接切換到下一個設施主題。此 change 提議在 Run 之上插入階層，讓不同設施規模感不同：

| 層級 | 定義（規劃中） |
|---|---|
| Chapter | 設施主題（沿用現行 `nextChapterIndex`，依序循環設施主題清單） |
| Level | 章節內第幾趟遠征；章節總關卡數在**進入章節時**以決定性 RNG 依設施類型區間 roll 定（例如小賣店 3~5、研究設施 8~12） |
| Run | 現行「一次遠征」概念不變，但改為對應「一個關卡」而非「整個設施」 |
| Stage | 現行「節點（Node）」改名（純命名，行為不變），run 內固定 10~20 個 Stage，最後一個 Stage 固定為該關卡的 Boss 戰 |

規劃中的其他變動（尚未落地）：

- **BREAKING**：Boss 戰勝利後的推進規則 — 章節內還有未攻略關卡時只推進到下一關卡（同設施主題，重開一次新 run），不切換設施主題；只有攻略完章節最後一關才真正推進到下一章節並切換設施主題。
- 死亡/斷線後角色停留在同一關卡（進度不回退不前進）。
- Boss 戰從「固定 1 波、1 隻敵人」改為「1 隻 Boss + 最多 2 隻小兵護衛」，部分 Boss 具備補位機制（觸發時機與上限待定案）。
- 一般戰鬥波次上限（1~2 波、每波最多 3 隻）明確寫入 spec（此點與現行 `DIFFICULTY_CONFIG` 的 `WAVE_COUNT_MAX`/`ENEMY_COUNT_MAX` 數值一致，只是把既有機制正式寫進 spec）。

`shared/types/adventure.ts` 中已有部分型別/常數為此 change 預先鋪路但尚未串接主流程，皆標註 ASSUMPTION：`LEVEL_COUNT_RANGE_BY_FACILITY`、`getLevelCountRange`、`rollChapterTotalLevels`、`getStageDisplayName`。這些函式目前存在於程式碼中，但 `adventure-run-lifecycle` 主 spec 與 `adventure-run.service.ts` 的實際流程尚未使用章節/關卡階層 —— 現行邏輯仍是「一次 Run = 一次設施攻略」。

## 落地備註

- 本文件涵蓋的所有數值/公式（第 1~6 節）均已在主 spec（`adventure-run-lifecycle`、`adventure-events`、`deterministic-rng`）與 `server/services/adventure-run.service.ts`、`server/constants/difficulty.ts` 中落地實作。
- 第 7 節（Chapter/Level 階層）為 `openspec/changes/chapter-level-structure/` 進行中 change 的規劃內容，尚未 sync 回主 spec、程式碼亦未串接，實裝前不應視為現行機制。
- CHOICE 節點與 EVENT 節點共用同一套 `eventService.selectEvent` 解析流程，`adventure-events/spec.md` 目前僅以「EVENT 節點」措辭描述，未特別區分 CHOICE；本文件依程式碼實作（`advanceFromExploring` 對 `NodeType.EVENT`/`NodeType.CHOICE` 走同一分支）補充說明。
- 戰鬥節點後續波次的敵人組成細節（archetype 選擇、combat-engine 內部邏輯）不在本文件範圍，屬於 combat-engine 相關 spec。
