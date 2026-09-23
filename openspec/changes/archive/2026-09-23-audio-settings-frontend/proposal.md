## Why

`account-audio-settings` change 已完成 server 端（`PUT /api/account/settings`、`GET /api/auth/me` 回傳 `bgmEnabled`/`sfxEnabled`），但前端目前完全沒有音效播放機制與設定介面：玩家登入後無法看到、也無法切換自己的 BGM/SFX 偏好，伺服器端存好的設定形同虛設。

## What Changes

- 新增 `app/composables/useAudio.ts`：提供 `playBgm(track)` / `stopBgm()` / `playSfx(sound)` / `toggleBgm()` / `toggleSfx()` 等 API，內部維護 `bgmEnabled`/`sfxEnabled` 狀態，並在狀態變更時呼叫 `PUT /api/account/settings` 持久化
- 登入後（`useAuth`/`GET /api/auth/me` 回應）將 `bgmEnabled`/`sfxEnabled` 初始值灌入 `useAudio` 的狀態
- 新增音效設定 UI（開關切換元件），讓玩家可以切換 BGM/SFX
- 音效素材以可插拔的 placeholder 路徑（`public/audio/`）搭建，本次不含實際音檔與各場景播放時機串接（留待後續 change）

## Capabilities

### New Capabilities
- `audio-preferences`：前端音效偏好狀態管理與持久化（BGM/SFX 開關），涵蓋 `useAudio()` composable 的狀態同步與設定 UI 的存在，不包含具體播放時機。

### Modified Capabilities
（無，`account-audio-settings` 規範的是 server 端行為，本 change 是新的前端能力，不修改既有 spec 的既有需求）

## Impact

- 新增 `app/composables/useAudio.ts`
- `app/composables/useAuth.ts` 或 `app/composables/useApi.ts`：登入流程取得 `bgmEnabled`/`sfxEnabled` 初始值並提供給 `useAudio`
- 新增設定 UI 元件（開關切換），掛載位置待 design 階段決定（例如既有頁面內的設定區塊或新增獨立設定頁）
- `public/audio/`：新增 placeholder 目錄結構，供後續補上實際音檔
- 對應既有 API：`GET /api/auth/me`、`PUT /api/account/settings`（`account-audio-settings` change 已實作完成）
