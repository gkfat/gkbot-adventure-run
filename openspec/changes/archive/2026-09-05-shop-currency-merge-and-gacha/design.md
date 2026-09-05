## Context

商店目前拆成兩個平行子系統（`shopsGold`/`shopsGems` collection、`getOrGenerateGoldShop`/`getOrGenerateGemsShop`、前端分頁），商品型別 `ShopItem` 用 `priceGold?`/`priceGems?` 兩個 optional 欄位表示「一個商品理論上可以同時有兩種價格」，但實際上從未同時設定過。這次要把介面收斂成單一清單，資料結構也同步收斂成「一個商品只認一種貨幣」。

同時要新增一個與每日商店完全獨立的「老虎機」消耗品：花費固定金幣或寶石抽一次，直接發放一件裝備到永久背包，不像商店商品那樣需要「上架—購買」兩階段、也不需要跨日持久化。

## Goals / Non-Goals

**Goals:**
- 商店查詢合併為一支 API、一份每日文件、一份清單型別，貨幣別收斂成單一欄位。
- 老虎機抽獎：金幣 100/次、寶石 5/次，各自獨立稀有度權重表，一次 API 呼叫內完成扣款＋roll＋發放（強一致，失敗不留半成品）。
- `item-generation` 支援外部覆寫稀有度權重表，供老虎機使用，且不影響既有商店/掉落呼叫（未傳覆寫時權重表行為不變）。

**Non-Goals:**
- 不做老虎機的「保底」（pity）機制、不做抽獎歷史紀錄／連抽（十連抽）— 使用者僅要求單抽，日後如需保底/連抽再另開 change。
- 不遷移既有 Firestore 舊資料（`shopsGold`/`shopsGems` 文件）；這是個人專案且商店文件本來就是每日重生成、TTL 極短，直接改用新 collection 名稱，舊文件放著自然被前一天清理邏輯淘汰或永久成孤兒（可接受，不寫遷移腳本）。
- 不改變商店的每日生成數量（金幣 6 裝備+3 藥水、寶石 6 裝備+3 藥水維持不變，只是合併進同一份清單顯示）。

## Decisions

### 1. 商店資料結構：單一 collection + 單一貨幣欄位

- 新 collection `dailyShops`，文件 id 沿用 `{characterId}_{date}` 慣例，型別 `DailyShop = { characterId, date, items: ShopItem[] }`，取代 `DailyGoldShop`/`DailyGemsShop`。
- `ShopItem` 改為：
  ```ts
  type ShopItem = {
    slotId: string;
    item: ItemInstance;
    currency: 'GOLD' | 'GEMS';
    price: number;
    sold: boolean;
    purchasedAt?: Timestamp;
  };
  ```
  移除 `priceGold?`/`priceGems?`，收斂成 `currency` + `price` 一組必填欄位，型別上直接排除「同時有兩種價格」的不可能狀態。
- 生成邏輯：`generateShopItems()` 維持「金幣池 `maxRarity=SR`、寶石池 `minRarity=SR`」的既有規則各自 roll 完，再合併成一份 `items` 陣列（金幣 slot 在前、寶石 slot 在後，`slotId` 沿用 `slot-{index}` 全域遞增），寫入同一份文件。
- **取代而非新增**：`ShopRepository`/`ShopService` 內 `getOrGenerateGoldShop`/`getOrGenerateGemsShop` 兩支方法合併為 `getOrGenerateShop(characterId)`，回傳 `DailyShop`；`deleteOldGoldShops`/`deleteOldGemsShops` 合併為 `deleteOldShops`。

### 2. API 收斂

- `GET /api/character/{characterId}/shop/gold` + `GET /api/character/{characterId}/shop/gems` → `GET /api/character/{characterId}/shop`，回傳 `{ date, items }`（單一清單）。
- `POST /api/character/{characterId}/shop/purchase` 請求體移除 `shopType`；`ShopService.purchaseItem` 改成直接用 `slotId` 在 `dailyShops` 文件裡找到該 slot，用 slot 上的 `currency`/`price` 決定扣哪個資源欄位，不再需要呼叫端告知貨幣別。
- 前端 `useShop.ts` 移除 `goldItems`/`gemsItems`/`goldLoaded`/`gemsLoaded` 等成對狀態，改成單一 `items`/`loaded`/`error`/`loading`；`shop.vue` 移除分頁 `TAB_OPTIONS`/`activeTab`，`tiers` 改成直接以 `item.type`（EQUIPMENT/POTION）分層，格位上以 `slot.currency` 決定顯示的貨幣圖示。

### 3. 老虎機（gacha）：獨立於商店的即時交易，不落每日文件

- 不引入「上架商品」概念——老虎機每次呼叫都是「當下 roll、當下發放」，不需要像商店一樣有「今天已生成好等玩家挑」的持久化商品清單。因此新增 `GachaService.pull(accountId, characterId, currency)`，在單一 Firestore transaction 內完成：檢查角色資源足夠 → 扣款 → 用該 currency 對應的權重表 roll 一件裝備 → 寫入 `items/{itemId}` → 加入角色永久背包（`inventories/{characterId}`，沿用 `RESOURCE_LIMITS.INVENTORY_PERMANENT_MAX` 上限與背包已滿檢查）。與 `purchaseItem` 共用「3-aggregate transaction」模式，但沒有 shop 文件這個第 4 個 aggregate。
- 不持久化「抽獎紀錄」——單抽即時結果由 API response 直接回傳給前端播動畫，不需要額外 collection（Non-Goal：連抽/保底才需要紀錄）。
- 新增常數 `GACHA_CONFIG = { GOLD_COST: 100, GEMS_COST: 5 }`（`server/constants/`），沿用 `equipment` 池（`getAllItemTemplates().filter(t => t.type === ItemType.EQUIPMENT)`）—— 老虎機只抽裝備，不含藥水。

### 4. 老虎機稀有度權重表：獨立於商店/掉落，透過覆寫參數注入

- `ItemGenerationContext` 新增可選欄位 `rarityWeightsOverride?: Partial<Record<Rarity, number>>`；`rollRarity()` 在計算 `eligibleRarities`/`totalWeight` 時，若有 override 則以 `rarityWeightsOverride[rarity]` 取代 `template.rarityWeights[rarity]`（未提供 override 時完全維持現有行為，向下相容）。
- 新增兩份獨立權重表（`server/constants/gacha.ts` 或併入既有 `templates.ts` 旁）：
  - `GACHA_GOLD_RARITY_WEIGHTS`：沿用「金幣稀有度上限較低」的既有商店慣例，同時把整體機率往低稀有度壓，體現「100 金幣一次、便宜」。初版建議 N 60 / R 30 / SR 10（SSR/L = 0，等同 `maxRarity=SR` 但用權重表達而非 min/max 過濾，因為 gacha 需要「金幣抽也可能抽到最低檔」而非商店那種固定 6+3 slot 分布）。
  - `GACHA_GEMS_RARITY_WEIGHTS`：對應「寶石抽出的裝備品質較高」，初版建議 SR 55 / SSR 35 / L 10（N/R = 0）。
  - 兩份權重表數值最終由使用者/數值設計定案，proposal 只承諾「有一份獨立權重表、金幣門檻低於寶石」，實際數字寫進 `docs/game-design/balance/drop-rates.md`（比照現有 `STANDARD_RARITY_WEIGHTS` 章節格式新增一節）。
- `GachaService` 呼叫 `generateItemInstance(templateId, { source: ItemSource.SHOP, rarityWeightsOverride: currency === 'GOLD' ? GACHA_GOLD_RARITY_WEIGHTS : GACHA_GEMS_RARITY_WEIGHTS })`（`ItemSource` 沿用既有 `SHOP`，不新增列舉值——老虎機在來源語意上仍是「花錢在商店取得」，不足以構成新的 source 分類）。

## Risks / Trade-offs

- [Risk] 商店資料結構是 **BREAKING** 變更（`priceGold`/`priceGems` → `currency`/`price`，`shopType` 參數移除）→ Mitigation：這是個人專案、單一前端消費者，前後端同一次 change 一起改完，不需要相容期；且舊 `shopsGold`/`shopsGems` 文件本來就是每日汰換，不需資料遷移。
- [Risk] `rarityWeightsOverride` 讓 `rollRarity()` 多一條分支，若日後有第三方呼叫誤用覆寫表導致某稀有度權重全 0 且落在 min/max 範圍外 → Mitigation：沿用現有「權重加總為 0 時無合法稀有度」的既有邊界（目前 code 對這種情況本來就會在 `eligibleRarities` 為空時於 fallback 存取 `undefined` as Rarity；這是既有行為，非本次新增缺陷，設計上不額外處理，維持與商店 `maxRarity`/`minRarity` 一致的既有邊界假設）。
- [Risk] 老虎機沒有商品「上架」，稀有度分布完全靠權重表 → 若權重表設計失衡（例如金幣抽到 SR 機率過高）會破壞金幣/寶石的稀缺性 → Mitigation：數值定案前，`docs/game-design/balance/drop-rates.md` 需明確記錄兩份權重表並由使用者確認，比照現有 `STANDARD_RARITY_WEIGHTS` 文件慣例。

## Migration Plan

- 無需資料遷移腳本；`dailyShops` 為全新 collection，舊 `shopsGold`/`shopsGems` 文件於部署後不再被寫入或讀取，任由既有「刪除角色時 best-effort 清理」邏輯這次一併更新為清理新舊三個 collection 名稱（`dailyShops` + 舊 `shopsGold`/`shopsGems`，避免舊文件孤兒化）。
- 部署順序：後端（新 API + 新資料結構）與前端（改用新 API）需同一次部署，因為 API 是 breaking change，沒有相容層。

## Open Questions

- `GACHA_GOLD_RARITY_WEIGHTS`/`GACHA_GEMS_RARITY_WEIGHTS` 的實際數值（本文件僅給初版建議）由使用者最終定案。
- 老虎機是否需要前端「拉桿/轉動」動畫的具體演出時間軸——設計上不影響後端 API 形狀，留給 UI 實作階段決定。
