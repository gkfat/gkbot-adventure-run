## 1. Schema

- [x] 1.1 於 `shared/schemas/firestore/account.schema.ts` 的 `accountSchema` 新增 `bgmEnabled: z.boolean()`、`sfxEnabled: z.boolean()`
- [x] 1.2 新增 `shared/schemas/api/account.schema.ts`：`updateAccountSettingsRequestSchema`（皆為 optional boolean）與 `updateAccountSettingsResponseSchema`
- [x] 1.3 更新 `shared/schemas/api/auth.schema.ts` 的 `meResponseSchema`，data 內新增 `bgmEnabled`、`sfxEnabled`

## 2. Repository / Service

- [x] 2.1 `server/repositories/account.repository.ts` 新增 `updateAudioSettings(accountId, patch)` 方法
- [x] 2.2 `server/services/account.service.ts` 的 `createOrGetAccount` 建帳號時寫入 `bgmEnabled: true, sfxEnabled: true`
- [x] 2.3 `server/services/account.service.ts` 新增 `updateAudioSettings(accountId, patch)`，只更新有帶入的欄位
- [x] 2.4 既有帳號讀取時若欄位缺失，於 repository 讀取層以 `?? true` 補齊（不寫 migration script）

## 3. API

- [x] 3.1 新增 `server/api/account/settings.put.ts`：驗證 body、呼叫 service、回傳更新後設定
- [x] 3.2 調整 `server/api/auth/me.get.ts` 回應加入 `bgmEnabled`/`sfxEnabled`

## 4. 文件與驗證

- [x] 4.1 於 `server/utils/openapi.ts` 註冊新 schema 與 `PUT /api/account/settings` path
- [x] 4.2 執行 `pnpm nuxt typecheck` 確認型別正確（新增/修改檔案無型別錯誤；既有的其他檔案錯誤為既存技術債，與本 change 無關）
- [x] 4.3 手動測試更新流程（`/api-docs` 因既有 pre-existing bug 無法產生 openapi.json，改用 curl 直接打 API 驗證）：`PUT /api/account/settings` 與 `GET /api/auth/me` 未帶 Bearer token 皆正確回傳 401；帶入無效 token 則回傳 401 且訊息明確。因無可用的真實 Firebase ID token，未涵蓋「帶有效 token 實際更新成功」的端到端驗證，其正確性由程式碼審視與既有相同模式的 `advance` 等端點一致性保證。
