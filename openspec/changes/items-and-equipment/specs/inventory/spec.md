## ADDED Requirements

### Requirement: 永久背包容量上限
系統 SHALL 將每個帳號的永久背包容量限制為 500 格；超過上限時拒絕新增物品。

#### Scenario: 查詢背包內容
- **WHEN** 已登入玩家呼叫 `GET /api/inventory`
- **THEN** 回傳該帳號永久背包的 `items` 陣列、目前數量 `count` 與上限 `maxCount = 500`

#### Scenario: 背包已滿無法新增物品
- **WHEN** 帳號背包已有 500 件物品，系統嘗試新增第 501 件（例如商店購買選擇放入背包）
- **THEN** 該筆新增操作被拒絕，背包內容維持 500 件不變

### Requirement: 捨棄背包物品
系統 SHALL 提供 `DELETE /api/inventory/{itemId}`，允許玩家永久捨棄一件永久背包內的物品；捨棄後不可復原。

> 注意：本需求對應 `openspec/analysis/api-model.yaml` 的 API-012，該端點在原始 spec 文件中沒有直接來源（見 traceability.yaml 的 needs-review gap），本 spec 按既有程式碼 schema 的既定行為描述。

#### Scenario: 成功捨棄物品
- **WHEN** 玩家對自己背包內存在的 `itemId` 呼叫 `DELETE /api/inventory/{itemId}`
- **THEN** 該物品從永久背包移除，且無法再被查詢到

#### Scenario: 捨棄不存在的物品
- **WHEN** 玩家對不屬於自己背包的 `itemId` 呼叫刪除
- **THEN** 系統回傳 404，背包內容不變

#### Scenario: 不可捨棄目前已裝備的物品
- **WHEN** 玩家嘗試捨棄目前被裝備在某個槽位上的物品
- **THEN** 系統回傳 400，要求先卸下該裝備才能捨棄
