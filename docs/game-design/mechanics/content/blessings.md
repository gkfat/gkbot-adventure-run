# 祝福（Blessing）／詛咒（Curse）內容目錄

> 本文件是內部設計參考文件，整理 `blessings-and-curses` spec 定案的機制與 `server/constants/blessings.ts` 目前實際存在的祝福/詛咒清單，供後續文案/數值調整時對照使用。**清單目前很短**（Blessing 5 個、Curse 4 個），且 `server/constants/blessings.ts` 檔頭自帶 `ASSUMPTION` 註記：因為 repo 裡沒有 `10_事件祝福與詛咒.md` 這份原始設計文件，這份清單是 `events-and-blessings` change 當時直接發明、並依 `docs/worldview.md` 第 2 節「研究設施」場景調性寫的文案，不是照抄既有設定表。**另有一個尚未銜接的落地缺口**（詳見文末「落地備註」）：目前 Blessing/Curse 選到後只會被「記錄」在 run 上，還沒有真的接進戰鬥數值計算。

## 觸發機制總覽

祝福/詛咒有**兩條互相獨立的觸發途徑**，不是同一套流程：

### 途徑一：戰鬥累積點數 → BLESSING_SELECT 三選一

- 每場戰鬥勝利依敵人 tier 給予固定 `blessingPoints`（`server/constants/combat.ts` `TIER_BLESSING_POINTS`）：

| 敵人 tier | blessingPoints |
|---|---|
| NORMAL | 1 |
| ELITE | 2 |
| STRONG_ELITE | 3 |
| BOSS | 5 |

- 累積達門檻（`NODE_CONFIG.BLESSING_POINTS_THRESHOLD = 3`）時，離開 RESOLUTION 節點會轉為 `BLESSING_SELECT` 狀態，系統以 `BlessingService.generateCandidates()` 生成 **3 個不重複**的 Blessing 候選（只從 `BLESSING_TEMPLATES` 抽，不含 Curse）。
- 玩家呼叫 `POST /api/adventure/blessing/select` 選其中一個，該 Blessing 加入 `run.blessings`，`blessingPoints` 歸零重新累積。
- 選錯不存在的 `blessingId` 回傳 400，不改動 run 狀態。
- **例外**：若這場勝利是 Boss 戰，run 會直接結算（`single-stage-run-settlement`：一個 Stage 只有一個 run），就算 `blessingPoints` 已達門檻也會跳過 BLESSING_SELECT——不會把玩家帶進一個選了也用不到的畫面。

### 途徑二：EVENT 節點 → 自動授予/套用（無三選一）

`EVENT` 是節點類型抽樣時的其中一種（`NODE_CONFIG.WEIGHTED_NODE_WEIGHTS.EVENT = 25`，與 COMBAT 55 / REST 5 / CHOICE 15 並列）。抽中 EVENT 節點後，還會再依權重抽出 5 種事件模板之一（`server/constants/events.ts`），其中 2 種與祝福/詛咒直接相關：

| 事件 id | 類型 | 權重 | 效果 |
|---|---|---|---|
| `research_terminal` | BLESSING | 15 | 呼叫 `generateCandidates()` 取得 3 個候選，但**只自動授予第一個**（`const [granted] = ...`），玩家沒有選擇機會，與途徑一的三選一是不同機制 |
| `malfunctioning_unit` | CURSE | 15 | 從 `CURSE_TEMPLATES`（4 個）等權重隨機抽 1 個直接套用 |
| `sealed_crate`（CHOICE 事件的 RISK 分支） | CHOICE | 20（事件本身）| 選「強行打開」有 `WHEEL_RISK_CURSE_CHANCE = 50%` 機率失敗，失敗時同樣從 `CURSE_TEMPLATES` 隨機抽 1 個套用 |

（另外 2 種事件 `medbay_leak` HEAL 25、`vr_roulette` WHEEL 25 與祝福/詛咒無關，不在此列。）

### 持續時間

依 spec `Requirement: Blessing/Curse 僅限本次 run 有效`：選到的 Blessing/Curse 只記錄在 `AdventureRun.blessings` / `run.curses`（modifierId 字串陣列）上，run 進入 `ENDED` 後不會帶到玩家下一次開始的新 run；不會回寫進 Character 文件，不是永久養成內容。

### 候選稀有度傾向（僅途徑一適用）

途徑一的 3 選 1 候選，Blessing 分 `MINOR`/`MAJOR` 兩個 tier，抽中 MAJOR 的機率隨角色 LUCK 提升（`majorTierChance()`）：

```
majorWeight = min(80, 30 + LUCK × 1)
minorWeight = 100 - majorWeight
MAJOR 機率 = majorWeight / 100
```

LUCK = 0 時 MAJOR 機率 30%，LUCK 越高越傾向 MAJOR，上限鎖在 80%。若某個 tier 的候選池已被抽完（目前 MINOR 只有 2 個），會自動 fallback 到另一個 tier，避免抽不到候選卡死。

## 目前所有 Blessing（`BLESSING_TEMPLATES`，共 5 個）

| modifierId | 名稱 | tier | 效果描述 | 數值 |
|---|---|---|---|---|
| `blessing_atk_boost` | 戰鬥意志 | MINOR | 殘留的作戰輔助程式短暫接管你的反應速度，攻擊力提升。 | ATK +8 |
| `blessing_def_boost` | 強化裝甲 | MINOR | 外殼被臨時噴塗一層實驗性塗層，防禦力提升。 | DEF +6 |
| `blessing_hp_boost` | 緊急修復 | MAJOR | 研究設施的自我修復模組替你補上一層額外的結構冗餘，生命上限提升。 | HP_MAX +40 |
| `blessing_luck_drop` | 幸運符文 | MAJOR | 不明來源的訊號持續在你耳邊低語「這邊，往這邊」，掉落率提升。 | dropRateMultiplier ×1.3 |
| `blessing_speed` | 過載超頻 | MAJOR | 關節伺服機構被強制超頻，攻擊間隔縮短。 | actionIntervalSec -0.3（數值越小攻速越快） |

## 目前所有 Curse（`CURSE_TEMPLATES`，共 4 個，不分 tier）

| modifierId | 名稱 | 效果描述 | 數值 |
|---|---|---|---|
| `curse_signal_noise` | 訊號干擾 | 一陣刺耳的雜訊竄過感測器，攻擊力下降。 | ATK -5 |
| `curse_armor_corrosion` | 裝甲腐蝕 | 不明液體腐蝕了外殼接縫，防禦力下降。 | DEF -4 |
| `curse_overheat` | 過熱降頻 | 核心溫度持續異常升高，攻擊間隔拉長。 | actionIntervalSec +0.3（數值越大攻速越慢） |
| `curse_bad_luck` | 厄運纏身 | 裂域裡的某種東西盯上了你，掉落率下降。 | dropRateMultiplier ×0.7 |

## 與 worldview.md 的文案定位呼應

- `docs/worldview.md` 第 2 節設施對照表明訂「研究設施」是「祝福（Blessing）節點的主要場景」——`research_terminal` 事件的描述「研究設施的終端機還亮著，似乎在提供什麼強化協議」直接對應這個場景設定。
- worldview.md 第 4.2 節「其他可延伸的暗示點」建議 Blessing 效果描述走「身體的變化感（發熱、震動、金屬味）」而非傳統奇幻的光芒/神聖感，呼應玩家角色已局部機械化卻不自知的暗線。目前 5 則 Blessing 文案中，`blessing_hp_boost`（自我修復模組／結構冗餘）、`blessing_atk_boost`（作戰輔助程式接管反應速度）、`blessing_speed`（伺服機構超頻）貼合這個方向；`blessing_luck_drop`（訊號在耳邊低語）語氣偏向懸疑/超自然，與「身體變化感」的既定方向有落差，未來若要修文案可以留意這點。
- Curse 4 則文案（雜訊、腐蝕、過熱、厄運）走的是「設施殘留危害」調性，尚未特別呼應第 4 節的機械化暗線，也不算牴觸，屬中性文案。

## 落地備註

- **最重要的缺口**：`server/services/combat.service.ts` 的 `resolve()` 目前把 `activeModifiers` 寫死為空陣列 `const activeModifiers: RunModifier[] = [];`，並標註 `TODO(events-and-blessings)`：`run.blessings`/`run.curses` 這兩個 modifierId 字串陣列，目前完全沒有查表轉換回 `RunModifier` 物件、再套進戰鬥數值/掉落率的邏輯。也就是說，玩家選到的 Blessing 或觸發到的 Curse，目前**只會被記錄在 run 文件上，實際戰鬥中的 ATK/DEF/HP_MAX/攻速/掉落率完全不受影響**。`applyModifiers()`/`combinedDropRateMultiplier()`（`combat.service.ts`）兩個函式本身邏輯已經寫好、也有測試涵蓋，只是沒有人把 `run.blessings`/`run.curses` 接進去餵給它們。
- 途徑二（EVENT 節點）的 BLESSING 事件是直接授予 `generateCandidates()` 回傳的第一個候選，玩家沒有選擇餘地，跟途徑一的三選一是兩套獨立機制，命名上都叫「Blessing」容易讓人誤會成同一套流程，撰寫玩家可見文案（教學、圖鑑）時要注意分開講清楚，或至少不要暗示「每次遇到祝福都能選」。
- 目前只有 5 個 Blessing／4 個 Curse，MINOR tier 只有 2 個 Blessing（`blessing_atk_boost`、`blessing_def_boost`），途徑一三選一時如果連續抽到 MINOR 傾向，很快就會把候選池抽乾、觸發 fallback 到 MAJOR；長期來看清單量偏薄，是否要擴充屬於獨立的內容擴充需求，不在本文件範圍內。
