## Context

目前 `firestore.rules` 內容未知是否已符合「預設拒絕」（需先讀取現況再決定要不要改）。前端路由守衛的設計已經在 `docs/ARCH_Firebase_Client_Auth_Integration.md` 規劃過（`useAuth`/`useApi`/`middleware/auth.ts`），本 change 是把那份規劃真正落地並套用到所有需登入頁面。

## Goals / Non-Goals

**Goals:**
- Firestore 規則的預設拒絕原則可被驗證（例如寫一個簡單的規則測試腳本或手動用 Firebase Emulator 驗證）
- 路由守衛套用到所有大廳/冒險/設定頁面，行為與 `ARCH_Firebase_Client_Auth_Integration.md` 一致
- OpenAPI 文件覆蓋率達到 100%（NFR-012）

**Non-Goals:**
- 不重新設計認證架構（沿用既有 Firebase Auth + Bearer token 機制）
- 不新增任何遊戲玩法功能

## Decisions

- **Firestore rules 驗證方式**：使用 Firebase Local Emulator Suite 搭配簡單的規則測試（`@firebase/rules-unit-testing`），驗證「未認證的 client 對任何 collection 的直接讀寫都被拒絕」，而不是只靠人工讀 rules 檔案判斷。若專案尚未設定 emulator，本 change 的 tasks 包含基本設定。
- **音效設定（AudioSettings）作為唯一的白名單例外要單獨測試**：確認即使開放，也只限制在「使用者自己的帳號文件」，不可讀寫其他帳號。
- **OpenAPI 覆蓋率檢查**：寫一個簡單的一次性腳本，比對 `server/api/**/*.ts` 的路由清單與 `server/utils/openapi.ts` 已註冊的 path 清單，列出差集；不做成長期 CI gate（超出本 change 範圍，但可在 tasks 中留一個 note 建議未來考慮）。

## Risks / Trade-offs

- [風險] Firestore rules 若過度嚴格，可能誤擋掉 AudioSettings 這種刻意允許 client 寫入的欄位 → [緩解] 明確測試「使用者可寫自己的 AudioSettings 相關欄位」與「不能寫其他帳號」兩種情境
- [風險] 本 change 排在其他 9 個 change 之後執行，若中途發現某個 change 漏了 OpenAPI 註冊，需要回頭修改該 change 已合併的程式碼 → [可接受]：這正是本 change 存在的目的（集中檢查點），修正成本遠低於未來才發現

## Appendix A：Vercel 部署與 Firebase 認證設定（原 `docs/16_Vercel部署與Firebase認證設定.md`）

**問題**：Vercel 上 Firebase Admin SDK 的 `applicationDefault()` 無法自動取得憑證（`Error: Could not load the default credentials.`）。

**解法**：`server/utils/firebaseAdmin.ts` 依環境分支：
- **Vercel/Production**：用環境變數 `FIREBASE_SERVICE_ACCOUNT_KEY`（單行 JSON 字串）+ `FIREBASE_PROJECT_ID`，以 `cert(JSON.parse(...))` 建立 credential。
- **Local**：用 `applicationDefault()`（依賴 `GOOGLE_APPLICATION_CREDENTIALS` 或本機已登入的 gcloud 認證）。

**所需環境變數**：
| 變數 | 用途 |
|---|---|
| `FIREBASE_PROJECT_ID` | server 端 Firebase 專案 id |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Vercel 專用，單行 JSON service account key（`cat key.json \| jq -c` 或 `node -e "console.log(JSON.stringify(require('./key.json')))"` 產生） |
| `NUXT_PUBLIC_FIREBASE_PROJECT_ID` | client 端 runtimeConfig |

**安全注意事項**：
- Service Account Key 絕不可提交到 Git（`.gitignore` 需涵蓋 `*.json` service account 檔、`.env*`）
- 建議每 90 天輪替一次 Service Account Key
- 部署後可用 `curl https://<domain>/api/health/ping` 驗證基本連線

**常見故障**：JSON 格式錯誤/含換行 → 用 `jq -c` 重新格式化；`Permission denied` → 檢查 Service Account 是否有 Firestore 讀寫權限。

> 本 change 的 tasks 不重複列出部署步驟本身（已完成/屬既有維運知識），此附錄僅作為未來重新設定或輪替金鑰時的參考依據。

## Appendix B：API 文件自動生成系統（原 `docs/17_API文件自動生成系統.md`）

專案已整合 `@asteasolutions/zod-to-openapi` + `swagger-ui-dist`，由 `shared/schemas/api/*.schema.ts` 的 Zod schema 自動產生 OpenAPI 3.0 規格：
- 開發環境：Swagger UI 於 `http://localhost:3000/api-docs`，JSON 於 `http://localhost:3000/api/openapi.json`
- 認證：Swagger UI 的 Authorize 按鈕輸入 Firebase ID Token（`Bearer <token>`）

**新增一個 API 的標準流程**（供本 change 之外的所有功能 change 依循）：
1. 在 `shared/schemas/api/<domain>.schema.ts` 定義 request/response Zod schema（用 `.strict()`、明確驗證規則、`z.infer<>` 匯出型別）
2. Handler 內用 `schema.safeParse` 驗證 body，失敗回 400
3. 於 `server/utils/openapi.ts`：
   - 在 `createOpenAPIRegistry()` 的 `schemas` 物件註冊新 schema
   - 用 `registry.registerPath(...)` 註冊 method/path/tags/request/responses（含 401/400 等錯誤回應統一用 `errorResponseSchema`）
   - 新 tag 需同步加進 `generateOpenAPISpec()` 的 `tags` 陣列
4. 重啟 dev server，於 `/api-docs` 確認新端點出現且可測試

**Schema 設計原則**：`.strict()` 拒絕多餘欄位、用 `.min()/.max()/.email()` 等明確驗證、必要時用 `.refine()` 附自訂錯誤訊息。

**檔案結構**：
```
server/api/openapi.json.get.ts   # OpenAPI JSON 端點
server/routes/api-docs.get.ts    # Swagger UI 頁面
server/utils/openapi.ts          # OpenAPI 生成邏輯（唯一需要手動註冊的地方）
server/middleware/auth.global.ts # 已排除 /api-docs、/api/openapi.json 等文件路徑
shared/schemas/api/              # 各 domain 的 API schema
```

> 本 change 第 3 節「OpenAPI 覆蓋率盤點」的比對腳本，就是用來偵測「忘記做上述步驟 3」的情況。

## Appendix C：Firebase Client-Side Auth 整合架構（原 `docs/ARCH_Firebase_Client_Auth_Integration.md`）

此架構規劃已大致落地於既有程式碼（`server/api/auth/*`、`server/middleware/auth.global.ts`），以下摘要其關鍵決策供本 change 的路由守衛（`app/middleware/auth.ts`）與後續前端串接依循：

**技術選型決策**：
- **Firebase SDK**：直接用官方 Firebase JS SDK，不用 VueFire（本專案是 SPA，不需要 VueFire 的 SSR 整合；且減少依賴、更明確可控）
- **API Client**：Nuxt 原生 `$fetch` + `useApi` composable 封裝（不用 Axios，避免多一個依賴）
- **State Management**：用 `useState` 的 composable（`useAuth`），不用 Pinia（auth state 夠簡單，不需要額外狀態管理套件）
- **Token 儲存**：依賴 Firebase Auth 內建的 IndexedDB/localStorage 機制 + `onAuthStateChanged` 自動恢復登入狀態，不手動存 token 到 localStorage、不透過 URL 傳遞 token

**檔案結構規劃**（若尚未建立，屬本 change 或後續前端 change 的範圍）：
```
app/
├── composables/
│   ├── useAuth.ts          # 登入狀態、signInWithGoogle/signOut/getCurrentToken
│   └── useApi.ts           # authenticatedFetch：自動附加 Authorization header，401 時嘗試 force-refresh token 重試一次
├── plugins/
│   └── firebase.client.ts  # 初始化 Firebase App/Auth（client-only plugin）
├── middleware/
│   └── auth.ts             # 路由守衛：等待 auth 初始化 → 未登入導向 '/'
```

**路由守衛核心邏輯**（`app/middleware/auth.ts`，對應本 change 的 `auth-route-guard` capability）：
- 只在 client-side 執行（`if (import.meta.server) return`）
- `loading` 為 true 時用 `watch` 等待初始化完成，並設 5 秒逾時防護，避免無限等待
- 未登入時 `navigateTo('/', { replace: true })`

**安全考量**：所有業務邏輯驗證在 server 端（client 驗證僅為 UX 提示）；token 不印到 console、不透過 URL query 傳遞；CSP headers 可於 `nuxt.config.ts` 的 `nitro.routeRules` 補強（`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff` 等）。

**已知限制**（原文件的 Trade-offs，供未來參考）：token 過期由 `getIdToken(true)` 強制 refresh 處理；多 tab 同步依賴 Firebase SDK 內建的 `onAuthStateChanged`；SPA mode 犧牲 SEO 但本遊戲不需要 SEO。
