## 1. item-generation：稀有度權重覆寫

- [ ] 1.1 `shared/types/item.ts`：`ItemGenerationContext` 新增可選欄位 `rarityWeightsOverride?: Partial<Record<Rarity, number>>`
- [ ] 1.2 `server/services/item.service.ts`：`rollRarity()` 在計算 `eligibleRarities`/`totalWeight` 時，若 `context.rarityWeightsOverride` 存在則改用其取值（否則沿用 `template.rarityWeights`），維持 `maxRarity`/`minRarity` 篩選邏輯不變
- [ ] 1.3 補上/調整 `server/services/item.service.test.ts` 對應測試：有/無 override 兩種情境

## 2. 商店資料結構合併

- [ ] 2.1 `shared/types/shop.ts`：`ShopItem` 改為 `currency: 'GOLD' | 'GEMS'` + `price: number`（移除 `priceGold?`/`priceGems?`）；新增 `DailyShop` 型別取代 `DailyGoldShop`/`DailyGemsShop`
- [ ] 2.2 `shared/schemas/firestore/shop.schema.ts`：同步調整 `shopItemSchema`/新增 `dailyShopSchema`
- [ ] 2.3 `shared/schemas/api/shop.schema.ts`：`getGoldShopResponseSchema`/`getGemsShopResponseSchema` 合併為單一 `getShopResponseSchema`；`purchaseItemRequestSchema` 移除 `shopType` 欄位
- [ ] 2.4 `server/repositories/shop.repository.ts`：合併 `getGoldShop`/`getGemsShop` → `getShop`，`createGoldShop`/`createGemsShop` → `createShop`，`deleteOldGoldShops`/`deleteOldGemsShops` → `deleteOldShops`，collection 改為 `dailyShops`
- [ ] 2.5 `server/services/shop.service.ts`：`getOrGenerateGoldShop`/`getOrGenerateGemsShop` 合併為 `getOrGenerateShop`；`generateShopItems()` 分別 roll 金幣池（`maxRarity=SR`）與寶石池（`minRarity=SR`）後合併為單一陣列，各 slot 標記 `currency`/`price`
- [ ] 2.6 `server/services/shop.service.ts`：`purchaseItem` 移除 `shopType` 參數，改讀 slot 的 `currency` 決定扣款欄位與價格來源；transaction 內對應的 collection/ref 改為 `dailyShops`
- [ ] 2.7 `deleteShopsForCharacter`：改為清理 `dailyShops`（今天/昨天），一併清理舊 `shopsGold`/`shopsGems` 文件（若存在）避免孤兒化
- [ ] 2.8 更新 `server/services/shop.service.test.ts` 對應合併後的行為

## 3. 商店 API 路由

- [ ] 3.1 新增 `server/api/character/[characterId]/shop/index.get.ts`（取代 `gold.get.ts`+`gems.get.ts`），刪除舊兩支路由檔案
- [ ] 3.2 `server/api/character/[characterId]/shop/purchase.post.ts`：request body 解析移除 `shopType`
- [ ] 3.3 `server/utils/openapi.ts`：同步移除舊兩支 shop GET 路徑的 schema 註冊，改註冊新的單一路徑

## 4. 商店前端

- [ ] 4.1 `app/composables/useShop.ts`：合併 `goldItems`/`gemsItems` 等成對狀態為單一 `items`/`loading`/`loaded`/`error`；`fetchShop()` 呼叫新端點；`purchase()` 移除 `shopType` 參數
- [ ] 4.2 `app/pages/shop.vue`：移除 `TAB_OPTIONS`/`activeTab` 分頁切換，改為單一清單依 `item.type` 分層（裝備/道具）；格位貨幣圖示與價格依 `slot.currency`/`slot.price` 顯示
- [ ] 4.3 `app/components/game/common/shopPurchaseDialog.vue`：移除對 `shopType` prop 的依賴，改由 slot 自帶 `currency` 判斷顯示與請求參數
- [ ] 4.4 手動於瀏覽器驗證：商店清單同時顯示金幣/寶石商品、購買金幣商品與寶石商品皆正確扣款與入包

## 5. 老虎機（gacha）常數與型別

- [ ] 5.1 `server/constants/`（新檔案，如 `gacha.ts`）：定義 `GACHA_CONFIG = { GOLD_COST: 100, GEMS_COST: 5 }`、`GACHA_GOLD_RARITY_WEIGHTS`、`GACHA_GEMS_RARITY_WEIGHTS`
- [ ] 5.2 `shared/types/`（新檔案或併入 `shop.ts`）：定義 `GachaCurrency = 'GOLD' | 'GEMS'`、`GachaPullResult` 型別
- [ ] 5.3 `shared/schemas/api/`（新檔案 `gacha.schema.ts`）：`gachaPullRequestSchema`（`currency`）、`gachaPullResponseSchema`（回傳 `ItemInstance`、扣除的資源與剩餘餘額）

## 6. 老虎機服務與 API

- [ ] 6.1 新增 `server/services/gacha.service.ts`：`pull(accountId, characterId, currency)`，單一 Firestore transaction 內完成資源檢查、扣款、`generateItemInstance` roll（帶 `rarityWeightsOverride`）、寫入 `items` collection、加入永久背包（含背包已滿檢查，回滾規則同商店購買）
- [ ] 6.2 新增 `server/api/character/[characterId]/gacha/pull.post.ts`：`requireAuth` → 驗證 body → 呼叫 `GachaService.pull` → 回傳結果
- [ ] 6.3 `server/utils/openapi.ts`：註冊新的 gacha pull 路徑與 schema
- [ ] 6.4 新增 `server/services/gacha.service.test.ts`：涵蓋成功抽取（金幣/寶石）、資源不足、背包已滿、只抽出裝備不抽藥水

## 7. 老虎機前端

- [ ] 7.1 新增 `app/composables/useGacha.ts`：呼叫 `POST /api/character/{characterId}/gacha/pull`，管理 loading/error/最近一次抽取結果
- [ ] 7.2 新增老虎機頁面/元件（沿用既有 pixel-art 風格與 `GameCommonPixelIcon`/`RARITY_COLOR` 等既有工具）：選擇金幣或寶石抽取、抽獎動畫、結果呈現（稀有度、物品名稱、屬性）
- [ ] 7.3 加入導覽入口（比照現有商店頁面在選單/導覽的掛載方式）
- [ ] 7.4 手動於瀏覽器驗證：金幣抽取與寶石抽取皆能正確扣款、發放裝備、資源不足時正確擋下

## 8. 文件與收尾

- [ ] 8.1 `docs/game-design/balance/drop-rates.md`：新增章節記錄 `GACHA_GOLD_RARITY_WEIGHTS`/`GACHA_GEMS_RARITY_WEIGHTS` 實際數值與換算機率
- [ ] 8.2 `pnpm lint` 全綠
- [ ] 8.3 `pnpm test` 全綠（含新增/調整的 shop、gacha、item.service 測試）
- [ ] 8.4 `pnpm build` 確認型別編譯通過
