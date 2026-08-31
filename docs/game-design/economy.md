# 經濟系統：貨幣、商店、定價

> 本文件是內部設計參考文件，整理 `gkbot-adventure-run` 的雙貨幣（金幣／寶石）定位、每日商店機制與道具售價曲線。**商店的生成/購買 service 尚未落地** —— 目前 repo 只有 `shared/types/shop.ts`、`shared/schemas/api/shop.schema.ts` 型別與 API schema，以及 `openspec/changes/shop/` 這個尚未實作的 change proposal；`server/repositories/shop.repository.ts`、`server/services/shop.service.ts`、`server/api/shop/*` 目前完全不存在。詳見文末「目前實作缺口」。

## 1. 雙貨幣：金幣（gold）與寶石（gems）

角色（`Character`）身上各自持有兩種貨幣（`shared/types/character.ts`）：

| 貨幣 | 欄位 | 範圍限制 | 定位 |
|---|---|---|---|
| 金幣 gold | `Character.gold` | `0 <= gold < 100000` | 常規貨幣，戰鬥掉落、任務/成就獎勵為主要來源，用於金幣商店購買 N/R/SR 道具 |
| 寶石 gems | `Character.gems` | `0 <= gems < 100000` | 稀有貨幣，用於寶石商店購買 SR/SSR/L 高稀有度道具 |

同樣的上限也定義在 `shared/types/common.ts`（`gold`/`gems` 欄位註解一致），`CharacterSummary`（角色列表 API 回傳）也帶出 `gold`/`gems` 供前端顯示餘額。

### 1.1 取得管道

- **戰鬥掉落**：`CombatResult.goldDropped` / `CombatResult.gemsDropped`（`shared/types/adventure.ts`），戰勝後直接發放。
- **事件節點**：`EventResult.goldGained` / `gemsGained`，例如輪盤事件（`EventType.WHEEL`）明確會產出 gold/gems。
- **任務/成就**：`QuestType.EARN_GOLD`（單次任務：賺取 X 金幣）、`AchievementType.TOTAL_GOLD`（累計成就：總計賺取 X 金幣），對應 `shared/types/quest.ts`。目前搜尋到的任務/成就型別只涵蓋金幣，未見到對應的 gems 任務型別（`EARN_GEMS`/`TOTAL_GEMS` 之類）——寶石的任務/成就出口若有規劃，需另外確認。

寶石目前唯一有意義的花費出口即寶石商店；proposal 文件（`openspec/changes/shop/proposal.md`）也明確寫到「商店是每日任務/成就發放的 gems 唯一有意義的出口，目前完全沒有商店相關的 repository/service/API，玩家賺到的資源無處可花」——換言之，寶石的「賺」與「花」兩端目前都還沒有完整落地的閉環。

## 2. 每日商店機制（型別已定義，service 未實作）

`shared/types/shop.ts` 定義了兩種商店：

| 項目 | 金幣商店 `DailyGoldShop` | 寶石商店 `DailyGemsShop` |
|---|---|---|
| 範圍 | per-account（`accountId` + `date`） | global（全服共用，僅 `date`） |
| 欄位 | `accountId`、`date`、`items`、`generatedAt`、`seed` | `date`、`items`、`generatedAt`、`seed` |
| 格數 | `SHOP_CONFIG.GOLD_SHOP_SLOTS = 6` | `SHOP_CONFIG.GEMS_SHOP_SLOTS = 6` |
| 重置時間 | `SHOP_CONFIG.RESET_HOUR_UTC = 0`（UTC 每日 0 點） | 同左 |
| 生成方式 | 決定性 RNG `seed` 產生（依 proposal 規劃為「日期+accountId」） | 決定性 RNG `seed` 產生（依 proposal 規劃為「日期」） |

`ShopItem` 每一格包含：`slotId`、要販售的 `item: ItemInstance`、`priceGold`/`priceGems`（依商店類型擇一）、`sold`（是否已售出）、`purchasedBy`/`purchasedAt`。

購買流程的輸入型別 `PurchaseItemInput`（`shopType`、`slotId`、`destination: INVENTORY | EQUIP`、`replaceSlot?`）與對應的 API 請求/回應 schema（`GET /api/shop/gold`、`GET /api/shop/gems`、`POST /api/shop/purchase`）已在 `shared/schemas/api/shop.schema.ts` 定義完成，可作為未來實作的契約依據。

`openspec/changes/shop/tasks.md` 描述的規劃（尚未勾選、尚未實作）：

- 每日「懶生成」：查詢商店時若當日尚未生成才觸發生成（而非排程預先產生）
- 金幣商店只上架 N/R/SR 稀有度物品；寶石商店只上架 SR/SSR/L 稀有度物品
- 購買在 Firestore transaction 內完成：檢查未售出 → 檢查資源足夠 → 扣款 → 標記售出 → 依 `destination` 放入永久背包或直接裝備
- 放入永久背包時受 `inventory` capability 的 500 格上限限制（`openspec/specs/inventory/spec.md`：背包已滿時新增操作會被拒絕）

## 3. 道具售價曲線（依稀有度）

售價來自 `server/constants/templates.ts` 的 `EQUIPMENT_PRICE_RANGE`（六個裝備部位共用）與 `POTION_PRICE_RANGE`（藥水專用），對應到 `ItemTemplate.priceRangeByRarity`（`shared/types/item.ts`：`Record<Rarity, { gold?: StatRange; gems?: StatRange }>`）。完整數值表已整理於 [`item-drop-and-stats.md`](./item-drop-and-stats.md)，此處僅摘要曲線走勢：

| 稀有度 | 裝備售價 | 藥水售價 |
|---|---|---|
| N | 金幣 100–200 | 金幣 20–40 |
| R | 金幣 300–500 | 金幣 60–100 |
| SR | 金幣 800–1200 + 寶石 10–20 | 金幣 150–250 + 寶石 5–10 |
| SSR | 寶石 30–50 | 寶石 15–25 |
| L | 寶石 80–120 | 寶石 30–50 |

走勢：N/R 只計金幣；SR 是金幣＋寶石的過渡稀有度；SSR/L 完全改以寶石計價，呼應「寶石對應高稀有度」的定位。此曲線目前是所有裝備部位共用的同一份數值（`EQUIPMENT_PRICE_RANGE` 常數），尚未依部位（頭/身/左手/右手/戒指/鞋）分開定價。

## 4. 目前實作缺口

- **商店生成與購買完全沒有 service 實作**：`server/repositories/`、`server/services/`、`server/api/` 底下都沒有 `shop.repository.ts`、`shop.service.ts`、`server/api/shop/*.ts`；`openspec/changes/shop/tasks.md` 的 4 大項任務（Repository / Service / API / 文件與驗證）全部尚未勾選。目前只有型別定義（`shared/types/shop.ts`）與 API schema（`shared/schemas/api/shop.schema.ts`、`shared/schemas/firestore/shop.schema.ts`），玩家實際上還無法在遊戲內看到或使用商店。
- **寶石的任務/成就出口待確認**：只找到 `EARN_GOLD`/`TOTAL_GOLD`，未找到對應的 gems 任務/成就型別；寶石目前主要靠戰鬥掉落與事件節點（`EventResult.gemsGained`）取得。
- **裝備售價未依部位分曲線**：六個裝備部位共用同一份 `EQUIPMENT_PRICE_RANGE`，若未來要讓不同部位有不同定價，需要擴充 `templates.ts`。
- **商店與 500 格背包上限的互動尚屬規劃階段**：`openspec/changes/shop/tasks.md` 提到購買後放入背包受容量限制，但因商店 service 本身未實作，此互動邏輯也尚未有程式碼可查證。
