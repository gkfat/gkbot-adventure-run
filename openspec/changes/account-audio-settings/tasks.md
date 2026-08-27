## 1. Schema

- [ ] 1.1 於 `shared/schemas/firestore/account.schema.ts` 的 `accountSchema` 新增 `bgmEnabled: z.boolean()`、`sfxEnabled: z.boolean()`
- [ ] 1.2 新增 `shared/schemas/api/account.schema.ts`：`updateAccountSettingsRequestSchema`（皆為 optional boolean）與 `updateAccountSettingsResponseSchema`
- [ ] 1.3 更新 `shared/schemas/api/auth.schema.ts` 的 `meResponseSchema`，data 內新增 `bgmEnabled`、`sfxEnabled`

## 2. Repository / Service

- [ ] 2.1 `server/repositories/account.repository.ts` 新增 `updateAudioSettings(accountId, patch)` 方法
- [ ] 2.2 `server/services/account.service.ts` 的 `createOrGetAccount` 建帳號時寫入 `bgmEnabled: true, sfxEnabled: true`
- [ ] 2.3 `server/services/account.service.ts` 新增 `updateAudioSettings(accountId, patch)`，只更新有帶入的欄位
- [ ] 2.4 既有帳號讀取時若欄位缺失，於 repository 讀取層以 `?? true` 補齊（不寫 migration script）

## 3. API

- [ ] 3.1 新增 `server/api/account/settings.put.ts`：驗證 body、呼叫 service、回傳更新後設定
- [ ] 3.2 調整 `server/api/auth/me.get.ts` 回應加入 `bgmEnabled`/`sfxEnabled`

## 4. 文件與驗證

- [ ] 4.1 於 `server/utils/openapi.ts` 註冊新 schema 與 `PUT /api/account/settings` path
- [ ] 4.2 執行 `pnpm nuxt typecheck` 確認型別正確
- [ ] 4.3 手動以 Swagger UI（`/api-docs`）測試更新流程（含未帶 Bearer token 的 401 情境）
