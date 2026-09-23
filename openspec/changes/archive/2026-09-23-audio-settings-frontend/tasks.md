## 1. useAudio composable

- [x] 1.1 新增 `app/composables/useAudio.ts`：module-level 單例狀態 `{ bgmEnabled: boolean; sfxEnabled: boolean }`（預設 `true`/`true`）
- [x] 1.2 實作 `fetchSettings()`：呼叫 `useApi().get('/api/auth/me')`，用回應的 `bgmEnabled`/`sfxEnabled` 覆寫狀態
- [x] 1.3 實作 `toggleBgm()`/`toggleSfx()`：樂觀更新本地狀態 → 呼叫 `useApi().put('/api/account/settings', { bgmEnabled | sfxEnabled })` → 失敗時回滾並回傳/拋出錯誤旗標
- [x] 1.4 實作 `playBgm(track: string)`/`stopBgm()`/`playSfx(sound: string)`：用 `HTMLAudioElement`，路徑對應 `public/audio/bgm/<track>`、`public/audio/sfx/<sound>`；開關為 `false` 或載入/播放失敗時靜默失敗（`console.warn`，不拋例外）
- [x] 1.5 實作 `reset()`：狀態重置為預設值 `true`/`true`

## 2. 登入/登出整合

- [x] 2.1 `app/composables/useAuth.ts` 的 `onAuthStateChanged` callback 在成功取得 `idToken` 後呼叫 `useAudio().fetchSettings()`
- [x] 2.2 `app/components/game/common/accountDrawer.vue` 的 `handleSignOut` 加入 `useAudio().reset()`

## 3. 設定 UI

- [x] 3.1（變更為 dialog 形式，見下）於 `app/components/game/common/accountDrawer.vue` 的方形按鈕列新增第 4 顆「音效設定」按鈕（比照切換角色/圖鑑/成就樣式），點擊開啟新增的 `GameCommonAudioSettingsDialog`
- [x] 3.2 新增 `app/components/game/common/audioSettingsDialog.vue`（比照 `renameCharacterDialog.vue` 的緊湊 dialog 樣式），內含 BGM/SFX 開關；改用既有像素風格 `confirm`/`cancel` icon（`GameCommonPixelIcon`）取代 Vuetify `v-switch`，點擊切換按鈕呼叫對應 `toggleBgm()`/`toggleSfx()`，並依 `bgmEnabled`/`sfxEnabled` 顯示勾選/叉叉
- [x] 3.3 持久化失敗時於 dialog 內顯示錯誤文字（沿用 `renameCharacterDialog.vue` 的錯誤提示樣式）

## 4. 音檔目錄與型別

- [x] 4.1 新增 `public/audio/bgm/.gitkeep`、`public/audio/sfx/.gitkeep`（placeholder 目錄，尚無實際音檔）
- [x] 4.2 補上 `useAudio.ts` 的 TypeScript 型別（回傳值、參數），確保 `pnpm nuxt typecheck` 對此檔案無新增錯誤

## 5. 驗證

- [x] 5.1 執行 `pnpm nuxt typecheck`，確認新增/修改檔案無新增型別錯誤
- [x] 5.2 執行 `pnpm lint`，確認新增/修改檔案無新增 lint 錯誤（`useAudio.ts` 的 2 處 `catch (err: any)` 與既有 `useAchievements.ts` 範本一致，屬既有 composable 慣例）
- [x] 5.3 啟動 `pnpm dev`，於瀏覽器手動測試：登入後帳號抽屜顯示正確的 BGM/SFX 開關初始值、切換開關後重新整理頁面設定仍保留（實測通過，並在過程中發現並修正一個 server 端既有 bug，見下）。限制：測試環境僅有一個可登入的 Google 帳號，「登出再切換帳號後開關顯示新帳號的設定」這個情境未實測，僅由 `reset()`/`fetchSettings()` 的程式邏輯保證正確性。

## 6. 測試中發現並修正的既有 bug（server 端）

- [x] 6.1 `server/repositories/account.repository.ts` 的 `updateAudioSettings` 原本用繼承自 `BaseRepository` 的 `getByIdOrThrow` 讀回更新後的帳號文件，未套用 `?? true` 補值邏輯；對於 `account-audio-settings` change 之前就存在、Firestore 文件本來就缺 `bgmEnabled`/`sfxEnabled` 欄位的舊帳號，切換單一開關後回應會缺欄位，導致 zod response schema 驗證失敗、`PUT /api/account/settings` 回傳 500。改為直接讀 doc 並套用 `withAudioSettingsDefaults`，已於瀏覽器實測確認修復（切換開關回傳 200，重新整理後設定正確保留）。
