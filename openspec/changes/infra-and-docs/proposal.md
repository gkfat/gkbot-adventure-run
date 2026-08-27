## Why

其餘 9 個 change 都會新增 Firestore collection 與 API 端點，但目前 `firestore.rules` 是否已正確設為預設拒絕、前端的登入路由守衛、以及新端點是否確實同步進 OpenAPI 文件，都是容易被個別 change 忽略的橫切關注點。集中一個 change 處理，確保這些防線在所有功能 change 落地後被驗證一次。

## What Changes

- 驗證並強化 `firestore.rules`：預設拒絕所有直接 client 讀寫，僅允許透過 server（Admin SDK）操作
- 新增前端路由守衛（`app/middleware/auth.ts`）：未登入導向 `/login`，不提供教學/引導流程
- 盤點所有 change 新增的 API 端點是否都已註冊進 `server/utils/openapi.ts`，補齊遺漏

## Capabilities

### New Capabilities
- `firestore-access-control`：Firestore security rules 的預設拒絕原則
- `auth-route-guard`：前端受保護路由的登入檢查

### Modified Capabilities
- `api-documentation`：目前已有 `17_API文件自動生成系統.md` 描述的既有實作（Zod → OpenAPI → Swagger UI），本 change 不改變其架構，只要求「新端點需求」的落地檢查（若視為既有能力的行為未變更，僅為維運檢查，可不建立獨立 spec 檔；本 change 選擇建立 spec 以便追蹤 NFR-012 的落地情形）

## Impact

- `firestore.rules`：確認/補強 `allow read, write: if false` 的預設規則
- `app/middleware/auth.ts`：新增（沿用 `docs/ARCH_Firebase_Client_Auth_Integration.md` 已規劃的設計）
- `app/pages/*.vue`：套用 `definePageMeta({ middleware: 'auth' })` 到需登入頁面
- `server/utils/openapi.ts`：確認 account-audio-settings/character-progression/items-and-equipment/shop/quests-and-achievements/leaderboard/adventure-run-core/combat-engine/events-and-blessings 這 9 個 change 新增的所有端點都已註冊
- 對應分析：FR-080~087、UC-033~034、UC-036、RULE-017（domain-model.yaml）、API-029/030（api-model.yaml）、NFR-003/008/010/012

## 建議執行時機

本 change 依賴其餘 9 個 change 已經（至少大部分）完成，因為「盤點是否都註冊進 OpenAPI」與「路由守衛要保護哪些頁面」需要知道最終的端點與頁面清單。建議排在依賴序的最後執行，或拆成兩次：Firestore rules 與路由守衛可以及早做（不依賴其他 change），OpenAPI 盤點放最後。
