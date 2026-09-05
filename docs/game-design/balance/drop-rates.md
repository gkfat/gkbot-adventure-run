# 道具掉落機率平衡數值

> 本文件是內部設計參考文件，聚焦「掉落機率」本身（何時掉、掉幾件、稀有度上限如何決定），數值來源以程式碼實際邏輯為準。裝備/藥水各稀有度的屬性區間與售價請見 [`item-stats.md`](./item-stats.md)，本文不重複列出。

## 1. 稀有度權重（`STANDARD_RARITY_WEIGHTS`）

來源：`server/constants/templates.ts`

| 稀有度 | 權重 | 換算機率（未受 `maxRarity` 限制時） |
|---|---|---|
| N | 50 | 50% |
| R | 30 | 30% |
| SR | 15 | 15% |
| SSR | 4 | 4% |
| L | 1 | 1% |

目前所有 `ItemTemplate` 共用同一份 `STANDARD_RARITY_WEIGHTS`，尚未有模板覆寫自己的權重表。

實際換算機率會因 `context.maxRarity` 被截斷（見下節）：`rollRarity()`（`server/services/item.service.ts`）只在「稀有度 ≤ maxRarity」的子集合裡按權重比例重新分配，不是簡單機率歸零，而是把權重加總後重新正規化。例如 `maxRarity = R` 時，實際機率為 N 50/(50+30)=62.5%、R 30/(50+30)=37.5%，SR/SSR/L 機率為 0。

## 2. `maxRarity` 封頂機制

`ItemGenerationContext.maxRarity`（`shared/types/item.ts`）用來限制單次生成可 roll 到的最高稀有度，由呼叫端依情境傳入：

| 觸發情境 | 封頂依據 | 資料來源 |
|---|---|---|
| 戰鬥掉落（DROP） | 依敵人 tier 決定，見下表 `TIER_MAX_DROP_RARITY` | `server/constants/combat.ts` |
| 事件掉落（EVENT，輪盤裝備獎） | 未傳入 `maxRarity`（即不封頂，五個稀有度皆可 roll 到） | `server/services/event.service.ts` `resolveWheel()` |
| 商店（SHOP） | **待確認** —— `shop` change 的 `openspec/changes/shop/specs/shop/spec.md` 僅文字敘述「金幣商店稀有度上限較低；紅寶石商店稀有度上限較高」，未定義具體 `maxRarity` 對應表，且 `server/services/` 目前**沒有** `shop.service.ts`，`generateItemInstance` 搭配 `ItemSource.SHOP` 目前只出現在 `item.service.test.ts` 的單元測試中，尚未有實際 production 呼叫點。此段屬於**規劃中**（`shop` change 尚未 merge 進 `openspec/specs/`） |

### 戰鬥掉落的 tier 封頂表（`TIER_MAX_DROP_RARITY`，`server/constants/combat.ts`）

| Enemy Tier | 對應 NodeType | 稀有度上限 |
|---|---|---|
| NORMAL | COMBAT | SR |
| ELITE | ELITE | SSR |
| STRONG_ELITE | STRONG_ELITE | L |
| BOSS | BOSS | L |

即使打的是最低階的一般戰鬥（NORMAL/COMBAT），掉落也封頂在 SR，SSR/L 不會出現；要打 STRONG_ELITE 或 BOSS 才有機會 roll 到 L。

## 3. 各掉落來源的觸發時機與機率

### 3.1 戰鬥掉落（`ItemSource.DROP`）— `server/services/combat.service.ts` `computeRewards()`

- **不是每場戰鬥必掉、也不是每擊殺一隻必掉一件**：對戰鬥中**每一隻被擊敗的敵人**單獨做一次掉落判定，逐隻結算，一場戰鬥可能掉 0~N 件（N = 該場敵人數）。
- 一般小兵（非 Boss tier 或非 Boss 本體）：掉落機率 = `itemDropChance(luck) * combinedDropRateMultiplier(activeModifiers)`。
  - `itemDropChance(luck) = min(0.40, max(0, 0.15 + luck * 0.005))`（`server/constants/combat.ts`）：基礎 15%，每點 LUCK +0.5%，上限 40%。
  - `combinedDropRateMultiplier`：目前所有 Blessing/Curse modifier 的 `dropRateMultiplier` 相乘，預設為 1（`events-and-blessings` 尚未實際餵入非 1 的 modifier，見 code comment）。
- **Boss 保底掉落**：`context.tier === BOSS && unit.isBoss` 時，掉落機率固定為 1（100% 掉落），不受 LUCK 門檻限制；但 Boss 身旁的小兵（escort minions）仍走一般 LUCK 掉落機率，不保證掉落。
- 掉落的裝備模板：從 `EQUIPMENT_TEMPLATE_IDS`（所有 `type: EQUIPMENT` 的模板）中均勻隨機挑一個（`pickRoll` 均勻分布，非依稀有度加權挑模板——加權只發生在稀有度本身的 roll）。
- 稀有度封頂依上表 `TIER_MAX_DROP_RARITY`。
- 藥水（POTION）目前不會透過戰鬥掉落產生：`EQUIPMENT_TEMPLATE_IDS` 只篩選 `type: EQUIPMENT` 的模板（`DROP_ITEM_TYPE_FILTER = ItemType.EQUIPMENT` 常數也佐證這點）。

另外每隻被擊敗的敵人也會獨立做一次**寶石掉落**判定（與裝備掉落判定分開的獨立 RNG roll）：

| enemyLevel 區間 | 機率 | 數量 |
|---|---|---|
| ≤10 | 3% | 1 |
| 11–20 | 6% | 1–3 |
| 21–30 | 10% | 3–5 |
| >30 | 沿用 21–30 區間 | 3–5 |

（`GEMS_DROP_TIERS`，`server/constants/combat.ts`）

### 3.2 事件掉落（`ItemSource.EVENT`）— `server/services/event.service.ts` `resolveWheel()`

- 僅「輪盤（WHEEL）」事件類型可能掉裝備，其餘事件類型（HEAL/BLESSING/CURSE/CHOICE）不會透過 `generateItemInstance` 產生物品。
- 輪盤結果是四選一的機率分岔（先後判定，依序扣除機率區間，定義在 `server/constants/templates/events.ts`）：
  1. `WHEEL_GEMS_CHANCE`（3%）：獲得寶石（數量介於 `WHEEL_GEMS_MIN`–`WHEEL_GEMS_MAX`，即 1–5）
  2. 其次 `WHEEL_GOLD_CHANCE`（67%，累積區間 [0.03, 0.70)）：獲得金幣（`5 + run.step * 2`，隨 run 進度增加，`design.md` 標註為 ASSUMPTION）
  3. 其次 `WHEEL_ITEM_CHANCE`（15%，累積區間 [0.70, 0.85)）：均勻隨機挑一個裝備模板生成一件裝備（`maxRarity` 未設限，五稀有度皆可能 roll 到，含 L）
  4. 剩餘機率（15%，累積區間 [0.85, 1.0)）：無任何獎勵（`EventResult` 不含 goldGained/gemsGained/itemsGained）
- 觸發時機：只有玩家進入 WHEEL 類型節點並呼叫 `resolve()` 時才會判定一次，非每次冒險必經。

### 3.3 商店（`ItemSource.SHOP`）

**待確認** —— 如前節所述，`shop` change 尚未實作 `shop.service.ts`，目前無法從程式碼確認「多少商品」「多久刷新」「稀有度上限對應表」等具體數值；`openspec/changes/shop/specs/shop/spec.md` 僅描述「每日懶生成、固定數量商品、金幣商店 per-account／紅寶石商店全服共享」的機制骨架，未落地明確機率/數量常數。此節內容全部屬於**規劃中**，待 `shop` change 實裝並 merge 進 `openspec/specs/` 後需回頭補完本節。

## 4. 裝備老虎機（gacha）稀有度權重

來源：`server/constants/gacha.ts`

老虎機（`equipment-gacha` capability）花費固定金幣或寶石抽取一件裝備，稀有度 roll 使用 `rollRarity()` 的 `rarityWeightsOverride` 機制（見 `item-generation` capability），**不沿用**本文件第 1 節的 `STANDARD_RARITY_WEIGHTS`，兩份權重表各自獨立：

### 4.1 金幣抽取（`GACHA_GOLD_RARITY_WEIGHTS`）— 100 金幣/次

| 稀有度 | 權重 | 換算機率 |
|---|---|---|
| N | 60 | 60% |
| R | 30 | 30% |
| SR | 10 | 10% |
| SSR | 0（不會出現） | 0% |
| L | 0（不會出現） | 0% |

### 4.2 寶石抽取（`GACHA_GEMS_RARITY_WEIGHTS`）— 5 寶石/次

| 稀有度 | 權重 | 換算機率 |
|---|---|---|
| N | 0（不會出現） | 0% |
| R | 0（不會出現） | 0% |
| SR | 55 | 55% |
| SSR | 35 | 35% |
| L | 10 | 10% |

金幣抽取的最高可能稀有度（SR）與寶石抽取的最低可能稀有度（SR）重疊於同一級距，但金幣抽取永遠無法觸及 SSR/L——體現「金幣抽取品質期望值明顯低於寶石抽取」的設計目標（見 `equipment-gacha` spec）。兩份權重表只套用於裝備模板（`ItemType.EQUIPMENT`），老虎機不會抽出藥水。

## 5. 已知平衡風險／待調整項（僅列程式碼中明確存在的標註）

- `server/services/combat.service.ts` `applyModifiers()` / `combinedDropRateMultiplier()` 的 code comment 明確標註：`events-and-blessings` change 尚未把真正的 Blessing/Curse `RunModifier` 餵進戰鬥流程，呼叫端目前永遠傳入 `[]`，因此 `dropRateMultiplier` 恆為 1——掉落率加成類 Blessing 的實際效果目前無法在戰鬥中生效，是明確的待接線項目。
- `server/constants/combat.ts` 檔頭 comment 標註 `ENEMY_ARCHETYPES`（連帶影響掉落判定發生的敵人陣容/擊殺數）是 ASSUMPTION——`10_戰鬥模型.md` 不存在，數值為本 change 自行假設，非既有設計文件定案，日後如有正式數值表需回頭核對本文件的掉落次數推算是否仍成立。
- `server/services/event.service.ts` `resolveWheel()` 的 `goldGained = 5 + run.step * 2` 也標註為 ASSUMPTION，雖非直接影響裝備掉落率，但會間接影響「玩家寧可透過輪盤拿金幣還是賭裝備」的取捨動機，如需重新平衡三選一機率時應一併檢視。
- 商店掉落稀有度上限（3.3 節）目前完全未落地，屬已知資料缺口，非「風險」而是「尚未有數值可評估風險」。
