## ADDED Requirements

### Requirement: 受保護路由導向登入
系統 SHALL 以前端路由 middleware 保護需登入頁面（大廳/冒險/設定），未登入時導向 `/login`，且不提供新手引導/教學流程。

#### Scenario: 未登入訪問受保護頁面
- **WHEN** 未登入使用者直接訪問 `/lobby` 或 `/adventure` 或 `/settings`
- **THEN** 系統導向 `/login`，不渲染該頁面內容

#### Scenario: 已登入正常訪問
- **WHEN** 已登入使用者訪問受保護頁面
- **THEN** 正常渲染頁面內容，不出現任何教學/引導彈窗

#### Scenario: Auth 狀態初始化中
- **WHEN** 頁面剛載入、Firebase Auth 狀態尚未初始化完成
- **THEN** middleware 等待初始化完成（或逾時後）才判斷是否導向登入，不會誤判已登入使用者為未登入
