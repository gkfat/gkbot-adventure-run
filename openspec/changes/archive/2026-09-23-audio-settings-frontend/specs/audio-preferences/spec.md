## ADDED Requirements

### Requirement: 登入後同步音效偏好設定
系統 SHALL 在使用者完成登入（或重新整理頁面後偵測到已登入狀態）時，向 `GET /api/auth/me` 取得該帳號目前的 `bgmEnabled`/`sfxEnabled`，並用該值初始化前端音效狀態。

#### Scenario: 登入後取得設定
- **WHEN** 使用者透過 Google 登入成功，或重新整理頁面後偵測到已登入的 Firebase session
- **THEN** 前端呼叫 `GET /api/auth/me`，並將回應中的 `bgmEnabled`/`sfxEnabled` 設為目前音效狀態

#### Scenario: 尚未登入時不觸發
- **WHEN** 使用者尚未登入
- **THEN** 系統不呼叫 `GET /api/auth/me`，音效狀態維持預設值（`true`/`true`）

### Requirement: 玩家可切換並持久化音效設定
系統 SHALL 提供 BGM/SFX 開關 UI，讓已登入玩家切換設定，切換後立即呼叫 `PUT /api/account/settings` 持久化。

#### Scenario: 切換 BGM 開關
- **WHEN** 已登入玩家在帳號抽屜點擊 BGM 開關
- **THEN** 前端立即更新本地 `bgmEnabled` 狀態（樂觀更新），並呼叫 `PUT /api/account/settings` 帶上 `{ bgmEnabled: <新值> }`

#### Scenario: 切換 SFX 開關
- **WHEN** 已登入玩家在帳號抽屜點擊 SFX 開關
- **THEN** 前端立即更新本地 `sfxEnabled` 狀態（樂觀更新），並呼叫 `PUT /api/account/settings` 帶上 `{ sfxEnabled: <新值> }`

#### Scenario: 持久化失敗時回滾
- **WHEN** 切換開關後呼叫 `PUT /api/account/settings` 失敗（例如網路錯誤或伺服器錯誤）
- **THEN** 前端將對應的開關狀態還原為切換前的值，並提示使用者發生錯誤

### Requirement: 登出時重置音效狀態
系統 SHALL 在玩家登出時，將前端音效狀態重置為預設值，避免殘留前一個帳號的設定。

#### Scenario: 登出後狀態重置
- **WHEN** 已登入玩家點擊登出
- **THEN** 前端音效狀態（`bgmEnabled`/`sfxEnabled`）重置為預設值 `true`/`true`

### Requirement: 提供可插拔的音效播放 API
系統 SHALL 提供 `playBgm`/`stopBgm`/`playSfx` 方法，供後續功能呼叫播放對應音效；當 `bgmEnabled`/`sfxEnabled` 為 `false`，或對應音檔不存在／載入失敗時，方法 SHALL 靜默失敗，不得拋出未捕捉例外或中斷呼叫端的執行流程。

#### Scenario: 開關關閉時不播放
- **WHEN** `bgmEnabled` 為 `false` 時呼叫 `playBgm(track)`，或 `sfxEnabled` 為 `false` 時呼叫 `playSfx(sound)`
- **THEN** 系統不播放任何音效，且不拋出例外

#### Scenario: 音檔不存在時靜默失敗
- **WHEN** 呼叫 `playBgm`/`playSfx` 時對應的音檔路徑不存在或載入失敗
- **THEN** 系統於 console 記錄警告，不拋出例外，呼叫端程式碼繼續正常執行
