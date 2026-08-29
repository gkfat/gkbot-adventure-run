## ADDED Requirements

### Requirement: 裝備物品到固定槽位
系統 SHALL 支援 6 個固定裝備槽位（HEAD/BODY/SHOES/LEFT_HAND/RIGHT_HAND/RING）；裝備一件物品時，若目標槽位已有裝備，系統 SHALL 回傳需要替換確認的資訊而非直接覆蓋。

> 更新（2026-08-28）：原設計為 8 槽（另含 GLOVES、NECKLACE），依需求收斂為 6 槽。

#### Scenario: 裝備到空槽位
- **WHEN** 玩家對背包內某件 `equipSlot = HEAD` 的物品呼叫 `POST /api/character/{characterId}/equip`，且 HEAD 槽位目前為空
- **THEN** `characters.equipment.HEAD` 更新為該物品的 itemId，回應的 `equipped` 為該物品，`unequipped` 為空

#### Scenario: 槽位已佔用時回傳替換資訊
- **WHEN** HEAD 槽位已有裝備 A，玩家裝備背包內另一件 `equipSlot = HEAD` 的物品 B
- **THEN** 系統執行替換：`equipment.HEAD` 更新為 B 的 itemId，回應同時帶出 `equipped = B` 與 `unequipped = A`

#### Scenario: 物品槽位不符
- **WHEN** 玩家嘗試把 `equipSlot = RIGHT_HAND` 的物品裝備到 HEAD 槽位
- **THEN** 系統回傳 400，不修改 equipment

#### Scenario: 物品不存在於玩家背包
- **WHEN** 玩家嘗試裝備一個不屬於自己背包的 itemId
- **THEN** 系統回傳 400（或 404），不修改 equipment

### Requirement: 卸下裝備
系統 SHALL 提供 `POST /api/character/{characterId}/unequip`，卸下指定槽位的裝備；裝備效果卸下後立即失效（不再計入下次 stats 計算）。

#### Scenario: 成功卸下
- **WHEN** HEAD 槽位有裝備，玩家呼叫 `unequip({ slot: 'HEAD' })`
- **THEN** `equipment.HEAD` 變為空，回應帶出被卸下的物品

### Requirement: 主畫面裝備欄位呈現
系統 SHALL 在角色主畫面（首頁）的角色圖像左右兩側，各以 3 個小格子呈現 6 個裝備槽位（HEAD/BODY/SHOES/LEFT_HAND/RIGHT_HAND/RING）目前的內容。

#### Scenario: 顯示已裝備物品
- **WHEN** 某個槽位目前有裝備
- **THEN** 對應小格顯示該物品的圖示，並以稀有度對應的樣式（例如邊框顏色）呈現

#### Scenario: 顯示空槽位
- **WHEN** 某個槽位目前沒有裝備
- **THEN** 對應小格顯示空槽位樣式（例如淡化的槽位圖示）

#### Scenario: 卸下空槽位
- **WHEN** 目標槽位目前無裝備
- **THEN** 系統回傳 400
