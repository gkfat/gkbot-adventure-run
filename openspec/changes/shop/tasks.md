## 1. Repository

- [ ] 1.1 新增 `server/repositories/shop.repository.ts`：`getGoldShop(accountId, date)`、`getGemsShop(date)`、`createGoldShop`、`createGemsShop`（用 Firestore `create` 而非 `set`）、`markSlotSold`

## 2. Service

- [ ] 2.1 新增 `server/services/shop.service.ts`：`getOrGenerateGoldShop`、`getOrGenerateGemsShop`（懶生成邏輯，含決定性 seed 產生）
- [ ] 2.2 商品生成：固定格數（例如 6），呼叫 `items-and-equipment` change 的 `ItemService.generateItemInstance`，金幣商店 rarity 上限 N/R/SR、紅寶石商店 SR/SSR/L
- [ ] 2.3 `purchaseItem(accountId, shopType, slotId, destination, replaceSlot?)`：Firestore transaction 內完成「檢查未售出 + 檢查資源 + 扣款 + 標記售出 + 發放物品」

## 3. API

- [ ] 3.1 新增 `server/api/shop/gold.get.ts`
- [ ] 3.2 新增 `server/api/shop/gems.get.ts`
- [ ] 3.3 新增 `server/api/shop/purchase.post.ts`

## 4. 文件與驗證

- [ ] 4.1 於 `server/utils/openapi.ts` 註冊 3 個新路徑
- [ ] 4.2 執行 `pnpm nuxt typecheck`
- [ ] 4.3 手動驗證：跨日重新查詢商店會重新生成；同一帳號連續查詢商品不變；購買成功/資源不足/重複購買三種情境
