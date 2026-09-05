## Why

商店目前以「分頁」呈現金幣商店與寶石商店，玩家需切換分頁才能看到另一種貨幣的商品，介面上重複了 tier 分層與排版邏輯。同時遊戲缺少一個消耗貨幣、帶隨機性的裝備取得管道——玩家想要老虎機抽裝備這種「單次消費換一次隨機結果」的體驗，作為每日商店（固定商品、無重複消耗）之外的另一種裝備獲取手段。

## What Changes

- **BREAKING**：商店頁面移除金幣/寶石分頁切換，改為單一商品列表；每個商品格位固定只對應一種貨幣（`priceGold` 或 `priceGems` 二擇一，不再是同一商品理論上兩者皆可設定的欄位設計），畫面直接在格位上顯示對應貨幣圖示與價格。
- 後端 `GET /api/character/{characterId}/shop/gold`、`GET /api/character/{characterId}/shop/gems` 兩支 API 合併為 `GET /api/character/{characterId}/shop`，回傳單一已排序商品清單（每筆各自標示貨幣）；每日生成邏輯維持「金幣商品稀有度上限較低、寶石商品稀有度下限較高」的分層，只是合併進同一份清單/同一份文件。
- `POST /api/character/{characterId}/shop/purchase` 的 `shopType` 參數移除（商品本身已決定貨幣類型，不需由呼叫端指定）。
- 新增「裝備老虎機」（gacha）功能：玩家可花費金幣 100 或寶石 5 抽一次，隨機取得一件裝備並直接進入永久背包；金幣抽的裝備稀有度上限較低，寶石抽的裝備稀有度下限較高，兩種抽法各自使用獨立設計的稀有度權重表（不沿用商店/掉落既有的 `STANDARD_RARITY_WEIGHTS`）。
- 新增前端老虎機頁面/入口與抽獎動畫、結果呈現。

## Capabilities

### New Capabilities
- `equipment-gacha`: 花費金幣或寶石抽取隨機裝備（老虎機），各自獨立的稀有度權重表、扣款與發放交易、結果呈現所需的 API 與資料模型。

### Modified Capabilities
- `shop`: 每日商店的金幣/寶石商店合併為單一清單與單一查詢端點；商品資料結構簡化為單一貨幣欄位；購買 API 移除 `shopType` 參數。
- `item-generation`: `generateItemInstance`/`rollRarity` 新增可選的稀有度權重表覆寫參數，讓呼叫端（gacha）能以獨立設計的權重表取代 template 預設的 `STANDARD_RARITY_WEIGHTS`；未提供覆寫時行為不變。

## Impact

- **Server**: `server/services/shop.service.ts`、`server/repositories/shop.repository.ts`、`shared/types/shop.ts`、`shared/schemas/api/shop.schema.ts`、`shared/schemas/firestore/shop.schema.ts`、`server/api/character/[characterId]/shop/*`（合併 `gold.get.ts`+`gems.get.ts` → `index.get.ts`，`purchase.post.ts` 調整）。新增 `server/services/gacha.service.ts`（或併入 `shop.service.ts`，設計階段決定）、對應 repository/schema/API route，以及 `server/constants/` 內的 gacha 專用稀有度權重表。
- **Client**: `app/pages/shop.vue`、`app/composables/useShop.ts`（移除分頁邏輯，統一清單）、`app/components/game/common/shopPurchaseDialog.vue`；新增老虎機頁面/元件與對應 composable。
- **依賴既有能力**：`item-generation`（`generateItemInstance`/`rollRarity` 需支援外部覆寫稀有度權重表，供 gacha 使用）、`inventory`（發放物品進永久背包）、角色 `gold`/`gems` 資源扣款（沿用 `shop` 既有的 transaction 模式）。
- 需新增 `docs/game-design/balance/` 內的 gacha 稀有度權重表文件，比照現有 `drop-rates.md` 格式。
