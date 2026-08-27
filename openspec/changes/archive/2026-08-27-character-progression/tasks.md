## 1. Service 層

- [x] 1.1 新增 `server/services/character.service.ts`：`getCharacterWithStats(accountId)`、`allocateAttributes(accountId, patch)`、`setNickname(accountId, nickname)`
- [x] 1.1.1（修正）`getCharacterWithStats` 遇到帳號存在但角色遺失（同 `AccountService.createOrGetAccount` 既有的 inconsistent-state 情境）時，自動呼叫 `createCharacter` 補建角色後再回傳，取代直接回 400 `Character not found`
- [x] 1.2 擴充 `server/constants/stats.ts`：`calculateBaseStats` 改為可接受 `equipmentBonus`（本 change 先傳空物件）（既有 `applyEquipmentStats(baseStats, equipmentBonus)` 已提供此擴充點，`CharacterService` 呼叫時傳入 `{}`，未改動 `calculateBaseStats` 簽名本身）

## 2. Repository 層

- [x] 2.1 `server/repositories/character.repository.ts` 新增 `updateAttributes`、`updateNickname` 方法（沿用既有 `BaseRepository` 的 update 慣例）
- [x] 2.2 從 `shared/schemas/firestore/character.schema.ts` 的 `characterSchema` 移除 `healingPotion` 欄位與 `healingPotionSchema`（藥水已改為一般消耗品物品，見 items-and-equipment / adventure-run-core change）
- [x] 2.3 從 `server/repositories/character.repository.ts` 的 `prepareInitialCharacterData` 移除 `healingPotion` 初始化邏輯
- [x] 2.4 `shared/schemas/firestore/character.schema.ts` 的 `nickname` 改為必填字串（移除 `.optional()`）
- [x] 2.5 新增 `generateDefaultNickname(accountId)`（格式：`玩家{accountId 後 6 碼大寫}`），並在 `prepareInitialCharacterData` 中呼叫，寫入 `nickname` 初始值
- [x] 2.6.1（修正）`shared/schemas/firestore/character.schema.ts` 的 `equipmentSchema` 改用 `z.partialRecord`（原本 `z.record(nativeEnum, ...)` 在 zod v4 下要求所有 `EquipmentSlot` 鍵都存在，導致新建角色寫入 `equipment: {}` 時驗證失敗）
- [x] 2.6（修正）`getByAccountId` 讀到 `nickname` 缺漏的既有角色（`nickname` 改必填前建立）時自我修復：即時補上 `generateDefaultNickname` 並寫回 Firestore 再回傳，避免 `GET /api/character` 因 `getCharacterResponseSchema` 驗證失敗回 500

## 3. API

- [x] 3.1 新增 `server/api/character/index.get.ts`
- [x] 3.2 新增 `server/api/character/attributes.post.ts`（驗證 `allocateAttributesRequestSchema`）
- [x] 3.3 新增 `server/api/character/nickname.post.ts`（驗證 `setNicknameRequestSchema`）

## 4. 規則驗證

- [x] 4.1 分配屬性點：拒絕總和超過 `unspentAttributePoints` 的請求（400）
- [x] 4.2 gold/gems 邊界檢查沿用 `RESOURCE_LIMITS`（本 change 範圍內無 gold/gems 扣款操作——藥水升級已移出此 change——故無實際扣款路徑需驗證；`characterSchema` 仍保留 `gold`/`gems` 的上限檢查，供未來 change 沿用）

## 5. 文件與驗證

- [x] 5.1 於 `server/utils/openapi.ts` 註冊 3 個新路徑（`GET/POST /api/character*` 三條路徑先前已預先註冊；本次移除已不再需要的 `upgradePotionResponseSchema`、`UpgradePotionResponse` 與 `/character/potion/upgrade` 路徑文件註冊）
- [x] 5.2 執行 `pnpm nuxt typecheck`（server 端本 change 相關程式碼皆通過；剩餘 2 個錯誤為既有前端問題 `app/components/system/systemBtn.vue`、`app/composables/useApi.ts`，經 `git stash` 確認在本 change 之前即存在，不屬於本 change 範圍）
- [x] 5.3 以 Swagger UI 測試：查詢角色 → 分配點數 → 設定暱稱（含各項錯誤情境）（已啟動本機 dev server 驗證三條路徑皆已註冊於 `/api/openapi.json`、且未帶 token 時皆正確回傳 401；`potion/upgrade` 路徑已確認移除。完整帶 Firebase ID Token 的成功路徑因無可用測試帳號，需使用者以真實登入 token 於 Swagger UI 手動補測）
- [x] 5.4 手動驗證：新建帳號後角色 `nickname` 立即為預設格式且非空，設定自訂暱稱後可正確覆蓋（`generateDefaultNickname` 邏輯已隨 `characterSchema.parse` 於程式碼中強制非空字串驗證；實際新建帳號的端對端驗證需使用者以真實登入觸發 `createOrGetAccount` 補測）
