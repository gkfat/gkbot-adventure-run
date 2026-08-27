## 1. Service 層

- [ ] 1.1 新增 `server/services/character.service.ts`：`getCharacterWithStats(accountId)`、`allocateAttributes(accountId, patch)`、`setNickname(accountId, nickname)`
- [ ] 1.2 擴充 `server/constants/stats.ts`：`calculateBaseStats` 改為可接受 `equipmentBonus`（本 change 先傳空物件）

## 2. Repository 層

- [ ] 2.1 `server/repositories/character.repository.ts` 新增 `updateAttributes`、`updateNickname` 方法（沿用既有 `BaseRepository` 的 update 慣例）
- [ ] 2.2 從 `shared/schemas/firestore/character.schema.ts` 的 `characterSchema` 移除 `healingPotion` 欄位與 `healingPotionSchema`（藥水已改為一般消耗品物品，見 items-and-equipment / adventure-run-core change）
- [ ] 2.3 從 `server/repositories/character.repository.ts` 的 `prepareInitialCharacterData` 移除 `healingPotion` 初始化邏輯
- [ ] 2.4 `shared/schemas/firestore/character.schema.ts` 的 `nickname` 改為必填字串（移除 `.optional()`）
- [ ] 2.5 新增 `generateDefaultNickname(accountId)`（格式：`玩家{accountId 後 6 碼大寫}`），並在 `prepareInitialCharacterData` 中呼叫，寫入 `nickname` 初始值

## 3. API

- [ ] 3.1 新增 `server/api/character/index.get.ts`
- [ ] 3.2 新增 `server/api/character/attributes.post.ts`（驗證 `allocateAttributesRequestSchema`）
- [ ] 3.3 新增 `server/api/character/nickname.post.ts`（驗證 `setNicknameRequestSchema`）

## 4. 規則驗證

- [ ] 4.1 分配屬性點：拒絕總和超過 `unspentAttributePoints` 的請求（400）
- [ ] 4.2 gold/gems 邊界檢查沿用 `RESOURCE_LIMITS`（確認扣款後仍 clamp 在 [0, 100000)）

## 5. 文件與驗證

- [ ] 5.1 於 `server/utils/openapi.ts` 註冊 3 個新路徑（character schemas 已存在，只需註冊 path；同時移除 `shared/schemas/api/character.schema.ts` 中已不再需要的 `upgradePotionResponseSchema` 與 `/character/potion/upgrade` 相關文件註冊，若先前已註冊）
- [ ] 5.2 執行 `pnpm nuxt typecheck`
- [ ] 5.3 以 Swagger UI 測試：查詢角色 → 分配點數 → 設定暱稱（含各項錯誤情境）
- [ ] 5.4 手動驗證：新建帳號後角色 `nickname` 立即為預設格式且非空，設定自訂暱稱後可正確覆蓋
