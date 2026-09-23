## Why

帳號登入/查詢/刪除（`POST /api/auth/login`、`GET /api/auth/me`、`DELETE /api/auth/account`）已經實作完成，但 spec 要求的音效設定（BGM/SFX 開關，per-account 持久化）尚未有任何端點或欄位。玩家目前無法跨裝置/跨登入保留自己的音效偏好。

## What Changes

- 在 `accounts` collection 新增 `bgmEnabled`、`sfxEnabled` 兩個布林欄位（預設 `true`）
- 新增 `PUT /api/account/settings`：允許已登入玩家更新自己的 BGM/SFX 開關
- `GET /api/auth/me` 的回應需一併帶出 `bgmEnabled`/`sfxEnabled`，讓前端登入後可直接取得目前設定

## Capabilities

### New Capabilities
- `account-audio-settings`：帳號層級的音效偏好設定（BGM/SFX 開關），可跨裝置持久化。

### Modified Capabilities
（無，`openspec/specs/` 目前尚無既有 spec，`GET /api/auth/me` 的回應擴充視為此新 capability 的一部分，不視為既有 capability 的行為變更）

## Impact

- `shared/schemas/firestore/account.schema.ts`：`accountSchema` 新增 `bgmEnabled`、`sfxEnabled`
- `shared/schemas/api/auth.schema.ts`：`meResponseSchema` 的 data 新增兩欄位
- 新增 `shared/schemas/api/account.schema.ts`：`updateAccountSettingsRequestSchema` / `ResponseSchema`
- `server/repositories/account.repository.ts`：新增/調整更新方法
- `server/services/account.service.ts`：新增 `updateAudioSettings` 方法；`createOrGetAccount` 建立帳號時要帶入預設值
- 新增 `server/api/account/settings.put.ts`
- `server/utils/openapi.ts`：註冊新 schema 與路徑
- 對應分析：FR-082、UC-035、AGG-001/VO-012（`openspec/analysis/domain-model.yaml`）、API-004（`openspec/analysis/api-model.yaml`）、DATA-001（`openspec/analysis/data-model.yaml`）
