## ADDED Requirements

### Requirement: API 端點 100% 註冊進 OpenAPI 文件
系統 SHALL 確保每一個 `server/api/**` 底下的路由都已在 `server/utils/openapi.ts` 註冊對應的 path 與 schema，使其出現在 `/api-docs` 與 `/api/openapi.json`。

#### Scenario: 端點清單比對無差集
- **WHEN** 比對 `server/api/**/*.ts` 的實際路由清單與 `server/utils/openapi.ts` 已註冊的 path 清單
- **THEN** 兩者一致，沒有任何端點缺漏於文件之外

#### Scenario: 新端點上線後文件同步更新
- **WHEN** 任一 change 新增了 API 端點並完成註冊
- **THEN** 重新產生的 `/api/openapi.json` 立即反映該端點，無需額外手動步驟
