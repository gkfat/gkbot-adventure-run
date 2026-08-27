## 1. Firestore Security Rules

- [ ] 1.1 讀取現有 `firestore.rules`，確認是否已為預設拒絕
- [ ] 1.2 若未符合，補強為 `allow read, write: if false` 的預設規則，並為 AudioSettings 等白名單欄位加上限定本人的例外規則
- [ ] 1.3 設定 Firebase Local Emulator Suite（若尚未設定）並撰寫規則測試（`@firebase/rules-unit-testing`）覆蓋 spec 中的 3 個 scenario

## 2. 前端路由守衛

- [ ] 2.1 新增 `app/middleware/auth.ts`（沿用 `docs/ARCH_Firebase_Client_Auth_Integration.md` 的既有設計）
- [ ] 2.2 為 `/lobby`（或 `/main`）、`/adventure`、`/settings` 等頁面套用 `definePageMeta({ middleware: 'auth' })`
- [ ] 2.3 確認 auth 狀態初始化中的 loading 情境不會誤判

## 3. OpenAPI 覆蓋率盤點

- [ ] 3.1 寫一次性腳本比對 `server/api/**/*.ts` 路由清單與 `server/utils/openapi.ts` 已註冊 path
- [ ] 3.2 補齊所有發現的缺漏（若有）
- [ ] 3.3 於 `docs/17_API文件自動生成系統.md` 更新目前已文件化的端點總數

## 4. 驗證

- [ ] 4.1 執行規則測試套件，全數通過
- [ ] 4.2 手動測試：未登入訪問受保護頁面被導向登入；已登入正常訪問
- [ ] 4.3 開啟 `/api-docs` 確認端點總數與 `server/api/**` 實際路由數一致
