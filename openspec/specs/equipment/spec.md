# equipment

## Purpose

角色裝備欄位管理：6 個固定裝備槽位（HEAD/BODY/SHOES/LEFT_HAND/RIGHT_HAND/RING）的裝備/卸下、槽位替換確認，以及主畫面裝備欄位的前端呈現。裝備/卸下是跨 `characters`（slot -> itemId 參照）與 `items`（物品本體，帶 `characterId` 擁有者欄位）兩份文件的操作，於單一 Firestore transaction 內完成。

## Requirements

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

### Requirement: 左右手互換裝備
系統 SHALL 允許 HAND 類道具（`equipSlot` 屬於 `HAND_SLOTS = [LEFT_HAND, RIGHT_HAND]`）裝備到 `LEFT_HAND` 或 `RIGHT_HAND` 任一槽位，由呼叫端以 `requestedSlot` 指定；因此角色可組成雙武器或雙防具。若 `requestedSlot` 未指定，系統 SHALL 使用該道具 template 的預設 `equipSlot`。

#### Scenario: 指定裝到另一手
- **WHEN** 玩家對一件 `equipSlot = RIGHT_HAND` 的武器呼叫 `equip`，並帶入 `requestedSlot = LEFT_HAND`
- **THEN** 該道具裝備到 `LEFT_HAND` 槽位

#### Scenario: 雙武器組合
- **WHEN** 玩家先把一件武器裝到 `RIGHT_HAND`，再把另一件武器指定 `requestedSlot = LEFT_HAND` 裝上
- **THEN** 兩個手部槽位皆為武器類道具，系統不拒絕此組合

#### Scenario: 雙防具組合
- **WHEN** 玩家先把一件防具裝到 `LEFT_HAND`，再把另一件防具指定 `requestedSlot = RIGHT_HAND` 裝上
- **THEN** 兩個手部槽位皆為防具類道具，系統不拒絕此組合

#### Scenario: 未指定 requestedSlot 時使用預設槽位
- **WHEN** 玩家裝備一件 `equipSlot = RIGHT_HAND` 的道具，未帶 `requestedSlot`
- **THEN** 該道具裝備到 `RIGHT_HAND`（與現行行為一致）

### Requirement: 不合法的 requestedSlot 回傳錯誤
系統 SHALL 在 `requestedSlot` 不屬於 `HAND_SLOTS`，或該道具本身不是 HAND 類道具卻帶入 `requestedSlot` 時，回傳 400，不修改 `equipment`。

#### Scenario: requestedSlot 不屬於 HAND_SLOTS
- **WHEN** 玩家裝備一件 HAND 類道具，帶入 `requestedSlot = HEAD`
- **THEN** 系統回傳 400，`equipment` 不變

#### Scenario: 非 HAND 類道具帶入 requestedSlot
- **WHEN** 玩家裝備一件 `equipSlot = HEAD` 的道具，帶入 `requestedSlot = LEFT_HAND`
- **THEN** 系統回傳 400，`equipment` 不變

> 取代現行 `equipItem`（`equipment.service.ts`）在 `requestedSlot` 不合法時靜默 fallback 回 `item.equipSlot` 的行為。

### Requirement: 主畫面精簡呈現，不顯示屬性與戰鬥數值面板
系統 SHALL 讓角色主畫面（`/main`）只保留：角色等級/職業/暱稱/戰力標示、裝備欄位（角色圖像左右各 3 格，見「主畫面裝備欄位呈現」）、角色圖像、章節進度與開始冒險 CTA；屬性面板與戰鬥數值面板 SHALL NOT 顯示於主畫面，改為顯示於角色頁（`inventory` capability「背包頁面呈現」）。

#### Scenario: 主畫面不顯示屬性面板
- **WHEN** 玩家進入角色主畫面
- **THEN** 畫面中不存在屬性（STR/AGI/CON/LUCK）與可分配屬性點的互動區塊

#### Scenario: 主畫面不顯示戰鬥數值面板
- **WHEN** 玩家進入角色主畫面
- **THEN** 畫面中不存在 ATK/DEF/HP_MAX/actionIntervalSec/critChance/dodgeChance 等戰鬥數值的顯示區塊

#### Scenario: 裝備欄位維持顯示於主畫面
- **WHEN** 玩家進入角色主畫面
- **THEN** 角色圖像左右兩側仍各以 3 個小格子呈現裝備槽位，行為與「主畫面裝備欄位呈現」既有需求一致，不受本次精簡影響
