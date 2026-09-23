# account-audio-settings Specification

## Purpose
TBD - created by archiving change account-audio-settings. Update Purpose after archive.
## Requirements
### Requirement: 帳號音效偏好持久化
系統 SHALL 為每個帳號保存 `bgmEnabled` 與 `sfxEnabled` 兩個獨立的布林設定，預設皆為 `true`，且僅能由該帳號本人的已驗證請求修改。

#### Scenario: 新帳號預設開啟音效
- **WHEN** 使用者首次登入並建立帳號（`POST /api/auth/login`）
- **THEN** 新建立的 account 文件 `bgmEnabled` 與 `sfxEnabled` 皆為 `true`

#### Scenario: 更新音效設定
- **WHEN** 已登入玩家呼叫 `PUT /api/account/settings`，帶上 `{ bgmEnabled: false }`
- **THEN** 該帳號的 `bgmEnabled` 更新為 `false`，`sfxEnabled` 維持原值不變

#### Scenario: 未登入呼叫遭拒
- **WHEN** 未附帶有效 Bearer token 呼叫 `PUT /api/account/settings`
- **THEN** 系統回傳 401，且不修改任何帳號資料

### Requirement: 登入後可取得目前音效設定
系統 SHALL 讓 `GET /api/auth/me` 的回應包含目前帳號的 `bgmEnabled`/`sfxEnabled`，供前端登入後立即還原播放狀態。

#### Scenario: 查詢帳號資訊包含音效設定
- **WHEN** 已登入玩家呼叫 `GET /api/auth/me`
- **THEN** 回應的 `data` 物件包含 `bgmEnabled` 與 `sfxEnabled` 欄位

