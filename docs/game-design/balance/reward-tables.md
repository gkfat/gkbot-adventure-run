# 獎勵數值總表（戰鬥 / 任務 / 成就）

> 本文件是內部設計參考文件，彙整目前 code 中實際存在的「獎勵」數值：戰鬥擊殺獎勵（經驗值/金幣/寶石/祝福點數/裝備掉落）、每日任務（Quest）獎勵、成就（Achievement）獎勵。**任務與成就目前只是 3 筆／4 筆佔位範例資料**（`server/constants/templates.ts` 內明確寫著 `TODO: Expand with actual quest/achievement definitions`），不是最終平衡數值，請勿當作定案內容引用。

## 1. 戰鬥獎勵

擊殺獎勵公式定義於 `server/constants/combat.ts`，實際結算邏輯在 `server/services/combat.service.ts` 的 `computeRewards()`（第 325–380 行左右），依「每個被擊殺單位」逐一計算並加總。

### 1.1 經驗值（EXP）

```
expForKill(enemyLevel, tier) = enemyLevel * 10 * TIER_EXP_MULTIPLIER[tier]
```

| Tier | EXP 倍率 |
|---|---|
| NORMAL | ×1 |
| ELITE | ×2 |
| STRONG_ELITE | ×4 |
| BOSS | ×8 |

範例：`enemyLevel = 10` 的 BOSS，單一擊殺 EXP = 10 × 10 × 8 = 800。

### 1.2 金幣（Gold）

```
goldForKill(enemyLevel) = enemyLevel * 2   // 單一擊殺的基礎金幣
applyLuckToGold(goldBase, luck) = round(goldBase * (1 + luck * 0.02))  // 對整場戰鬥的 goldBase 加總後套用一次
```

`goldBase` 是本場戰鬥所有擊殺的 `goldForKill` 加總，`applyLuckToGold` 只在最後套用一次（不是逐擊殺套用）。

### 1.3 裝備掉落機率

```
itemDropChance(luck) = min(0.40, max(0, 0.15 + luck * 0.005))
```

- 每次擊殺各自骰一次是否掉落裝備（受 `combinedDropRateMultiplier(activeModifiers)` 影響，run modifier 加成，詳見 code）。
- **BOSS 節點的 boss 本體**擊殺保底掉落（機率鎖定 100%），其護衛小兵仍走一般 LUCK 機率，不保底。
- 掉落的裝備稀有度上限依 tier 決定：

| Tier | 掉落裝備最高稀有度 |
|---|---|
| NORMAL | SR |
| ELITE | SSR |
| STRONG_ELITE | L |
| BOSS | L |

### 1.4 寶石（Gems）掉落

依 `enemyLevel` 分級（`gemsDropTier()`），每次擊殺各自骰一次：

| enemyLevel 區間 | 掉落機率 | 掉落數量 |
|---|---|---|
| ≤ 10 | 3% | 1 |
| 11–20 | 6% | 1–3 |
| 21–30 | 10% | 3–5 |
| > 30 | 10%（沿用 21–30 級距） | 3–5 |

> `> 30` 明確重用 21–30 的級距，這是 combat-engine spec.md 對「enemyLevel 超出已定義範圍」情境的既定處理方式，不是遺漏。

### 1.5 祝福點數（Blessing Points）

```
blessingPointsForVictory(tier)
```

依整場戰鬥的最高 tier 給予一次（`defeated.length > 0` 才給），非逐擊殺累加：

| Tier | 祝福點數 |
|---|---|
| NORMAL | 1 |
| ELITE | 2 |
| STRONG_ELITE | 3 |
| BOSS | 5 |

### 1.6 小結：戰鬥獎勵彙總欄位

`computeRewards()` 回傳 `{ expGained, goldDropped, gemsDropped, itemsDropped, blessingPointsGained }`，皆為單場戰鬥（可能包含多波次擊殺）的加總值。

---

## 2. 任務（Quest）獎勵表

資料來源：`server/constants/templates.ts` 的 `QUEST_TEMPLATES`。**檔案內註記為 `TODO: Expand with actual quest definitions`，目前僅 3 筆佔位範例**，非最終平衡數值。

| templateId | 類型 (QuestType) | 名稱 | 描述 | targetCount | rewardGold | rewardGems |
|---|---|---|---|---|---|---|
| `complete_run` | COMPLETE_RUN | Complete Adventure | Complete 1 adventure run | 1 | 50 | 1 |
| `kill_10_enemies` | KILL_ENEMIES | Monster Slayer | Kill 10 enemies | 10 | 30 | 0 |
| `purchase_item` | PURCHASE_SHOP | Shopping Spree | Purchase 1 item from shop | 1 | 20 | 0 |

`shared/types/quest.ts` 中 `QuestTemplate.rewardGold`/`rewardGems` 欄位註解標示合理範圍為 `rewardGold: 10-50`、`rewardGems: 0-1`，與上表三筆現有資料一致，但這只是型別註解上的預期範圍，不代表已有完整數值曲線設計。

`QuestType` 列舉中還定義了 `REACH_STEP`（跑到第 X 步）與 `EARN_GOLD`（賺取 X 金幣），但 `QUEST_TEMPLATES` 目前**沒有**對應的任務模板 —— 待確認。

任務系統整體設定（`shared/types/quest.ts` 的 `QUEST_CONFIG`）：

| 項目 | 數值 |
|---|---|
| 每日任務數量 | 3 個 |
| 重置時間 | UTC 00:00 |

---

## 3. 成就（Achievement）獎勵表

資料來源：`server/constants/templates.ts` 的 `ACHIEVEMENT_TEMPLATES`。**檔案內註記為 `TODO: Expand with actual achievement definitions`，目前僅 4 筆佔位範例**，非最終平衡數值。

| templateId | 類型 (AchievementType) | 名稱 | 描述 | targetCount | rewardGems |
|---|---|---|---|---|---|
| `first_blood` | TOTAL_KILLS | First Blood | Kill your first enemy | 1 | 3 |
| `monster_hunter` | TOTAL_KILLS | Monster Hunter | Kill 100 enemies | 100 | 5 |
| `adventurer` | TOTAL_RUNS | Adventurer | Complete 10 adventure runs | 10 | 5 |
| `high_score` | MAX_SCORE | High Scorer | Reach 10,000 score in a single run | 10000 | 5 |

`shared/types/quest.ts` 中 `AchievementTemplate.rewardGems` 欄位註解標示合理範圍為 `3-5`，與上表一致。

`AchievementType` 列舉中還定義了 `REACH_STEP`、`TOTAL_GOLD`、`EQUIP_LEGENDARY`，但 `ACHIEVEMENT_TEMPLATES` 目前**沒有**對應的成就模板 —— 待確認。成就本身無到期/重置機制（不像 quest 有每日重置），只在 `AchievementProgress.claimed` 後結算一次。

---

## 4. 落地備註 / 資料來源

- 戰鬥獎勵公式（1.1–1.5）：`server/constants/combat.ts`（`expForKill`、`goldForKill`、`applyLuckToGold`、`itemDropChance`、`gemsDropTier`、`blessingPointsForVictory`、`maxDropRarity`），結算邏輯：`server/services/combat.service.ts` `computeRewards()`（約 L325–380）。這部分是**已實作、可直接引用**的正式數值。
- 任務／成就獎勵表（2、3）：`server/constants/templates.ts` `QUEST_TEMPLATES`／`ACHIEVEMENT_TEMPLATES`，型別定義 `shared/types/quest.ts`。**兩份表格皆為佔位範例資料**（code 內明確標註 TODO），實裝完整任務/成就內容前不應視為平衡定案。
- 尚未確認/待補：
  - `QuestType.REACH_STEP`、`QuestType.EARN_GOLD` 尚無對應 quest 模板。
  - `AchievementType.REACH_STEP`、`TOTAL_GOLD`、`EQUIP_LEGENDARY` 尚無對應 achievement 模板。
  - 是否有經驗值升級所需 EXP 曲線（角色 level 1–30 的升級門檻）：`openspec/specs/character-progression/spec.md` 僅定案 `level` 落在 1–30 區間、由 server 端計算 stats，未找到升級所需 EXP 對照表 —— 待確認。
  - 祝福點數（Blessing Points）用途（如何兌換祝福效果）不在本文件範圍內，僅記錄取得數值。
- 若要把任務/成就擴充為正式平衡數值，建議先確認每日任務的目標多樣性（現僅涵蓋 COMPLETE_RUN/KILL_ENEMIES/PURCHASE_SHOP 三種）與成就的長期養成曲線（現僅 4 筆、目標值跨度極大：1 → 10000），再進 `/opsx:propose`。
