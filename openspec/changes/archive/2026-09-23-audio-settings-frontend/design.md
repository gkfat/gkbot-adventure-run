## Context

Server 端（`account-audio-settings` change）已提供：
- `GET /api/auth/me`：回應含 `bgmEnabled`/`sfxEnabled`
- `PUT /api/account/settings`：部分更新 `bgmEnabled`/`sfxEnabled`（皆為 optional boolean）

前端目前完全沒有音效系統：無 `useAudio` composable、無音檔、無設定 UI。`useAuth` 只在登入流程呼叫 `POST /api/auth/login`（回應不含 `bgmEnabled`/`sfxEnabled`），從未呼叫過 `GET /api/auth/me`。既有 composable（`useCharacter`、`useAchievements` 等）採用「module-level `ref` 作為單例狀態 + 回傳 `computed`/方法」的模式，並提供 `reset()` 給登出流程呼叫（見 `app/components/game/common/accountDrawer.vue` 的 `handleSignOut`）。

## Goals / Non-Goals

**Goals:**
- 新增 `useAudio()` composable，管理 `bgmEnabled`/`sfxEnabled` 狀態，並提供 `playBgm`/`stopBgm`/`playSfx`/`toggleBgm`/`toggleSfx` API
- 狀態變更（切換開關）即時呼叫 `PUT /api/account/settings` 持久化，並反映在 UI 上
- 登入後（或 App 初始化時已登入）呼叫 `GET /api/auth/me` 取得目前設定值，初始化 `useAudio` 狀態
- 在 `GameCommonAccountDrawer`（帳號抽屜）新增 BGM/SFX 開關 UI，與既有的「登出」等操作並列
- 音檔載入路徑可插拔（`public/audio/bgm/`、`public/audio/sfx/`），實際檔案不存在時播放方法需靜默失敗（不拋錯、不中斷遊戲流程）

**Non-Goals:**
- 不提供實際音效素材（`.mp3`/`.ogg` 等檔案）
- 不將 BGM/SFX 接入任何具體遊戲場景或事件（例如戰鬥音效、按鈕點擊音、關卡 BGM 切換）——僅建立可供後續呼叫的播放 API 與全域開關
- 不做音量大小調整 UI（維持 server 端規範：僅布林開關）

## Decisions

- **狀態管理沿用既有 composable 單例模式**：`useAudio.ts` 採用 module-level `ref<{ bgmEnabled: boolean; sfxEnabled: boolean }>`，與 `useCharacter`/`useAchievements` 一致，而非引入 Pinia 等新依賴（專案目前無 Pinia，符合「優先使用既有技術棧」原則）。
- **初始化時機：登入成功後與 App 啟動時已登入皆呼叫 `GET /api/auth/me`**：`useAuth.initAuthListener` 的 `onAuthStateChanged` callback 在取得 `idToken` 後，呼叫 `useAudio().fetchSettings()`（內部呼叫 `useApi().get('/api/auth/me')`），避免在多個進入點（登入頁、reload 後）各自重複串接。
    - 替代方案（否決）：在 `signInWithGoogle` 內串接——但 reload 後不會重跑這段，會漏掉已登入但重新整理頁面的情境。
- **切換開關即時呼叫 API，採樂觀更新 + 失敗回滾**：使用者點擊開關時，先更新本地狀態（即時反饋），再呼叫 `PUT /api/account/settings`；若 API 失敗則回滾本地狀態並提示錯誤，不採用「先確認 API 成功再更新 UI」（避免明顯的操作延遲感）。
- **播放方法對「檔案不存在」靜默失敗**：`playBgm`/`playSfx` 內部用 `HTMLAudioElement.play()`，包在 try/catch 中，載入或播放失敗僅 `console.warn`，不拋出例外——因為本 change 音檔尚未就位，若拋錯會影響到後續呼叫方（尚未寫成的場景整合程式碼）的穩定性。
- **UI 放置位置：帳號抽屜（`accountDrawer.vue`）內的獨立 dialog**：與登出等帳號層級操作放在一起，符合「音效設定屬於 Account」的既有 server 端設計決策（`account-audio-settings` design.md），且該元件已是玩家熟悉的「帳號相關操作」入口，不需新增頁面/路由。實作上不直接把開關塞進抽屜版面（避免與既有方形按鈕列、登出區擠壓），而是在既有「切換角色/圖鑑/成就」方形按鈕列新增第 4 顆「音效設定」按鈕，點擊後開啟 `GameCommonAudioSettingsDialog`（比照 `renameCharacterDialog.vue` 的緊湊 dialog 樣式）承載兩個開關與錯誤提示，與 `bestiaryDialog`/`achievementsDialog` 用 dialog 承載子功能的既有慣例一致。
- **登出時重置狀態**：`useAudio` 提供 `reset()`，在 `handleSignOut` 一併呼叫，避免下一個登入帳號短暫顯示前一個帳號的設定殘影（比照 `resetCharacter`/`resetInventory` 等既有模式）。

## Risks / Trade-offs

- [風險] 樂觀更新在 API 失敗時需要準確回滾，若遺漏處理會讓 UI 狀態與伺服器狀態不同步 → [緩解] `toggleBgm`/`toggleSfx` 內建 try/catch，失敗時還原前值並拋出可被 UI 捕捉的錯誤旗標，`tasks.md` 明確要求測試涵蓋失敗回滾情境
- [風險] 音檔尚未就位，`playBgm`/`playSfx` 目前只能靠靜默失敗驗證，無法實際聽到聲音 → [可接受]：Non-Goals 已明確排除實際素材與場景整合，待後續 change 補上真實音檔後再驗證聽覺效果
- [風險] `GET /api/auth/me` 呼叫時機若與既有 `useAuth`/`useCharacter` 初始化流程有先後順序依賴，可能造成初始化競態 → [緩解] 僅在 `idToken` 確定取得後才觸發 `fetchSettings()`，且該呼叫與角色/背包等其他初始化各自獨立、互不阻塞
