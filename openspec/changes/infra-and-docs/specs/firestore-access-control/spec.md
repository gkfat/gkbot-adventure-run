## ADDED Requirements

### Requirement: Firestore 預設拒絕直接 client 存取
系統 SHALL 將 Firestore security rules 設為預設拒絕所有直接 client 讀寫；僅允許透過 server（Firebase Admin SDK）操作，明確允許的例外（例如帳號音效設定）僅能限制在使用者自己的文件內。

#### Scenario: 未認證 client 讀取被拒
- **WHEN** 未經 Firebase Auth 認證的 client 嘗試直接讀取任一 collection
- **THEN** Firestore 拒絕該操作

#### Scenario: 已認證 client 仍不可直接寫入遊戲資料
- **WHEN** 已認證的 client 嘗試直接寫入 `characters/{accountId}` 或 `adventureRuns/{runId}`
- **THEN** Firestore 拒絕該操作（必須透過 server API）

#### Scenario: 白名單欄位僅限本人
- **WHEN** 已認證 client 嘗試寫入自己帳號的音效設定相關欄位
- **THEN** 允許；若嘗試寫入其他帳號的對應欄位，則拒絕
