## Why

伺服器已經是依「攻速（`actionIntervalSec`）」做離散事件排程模擬整場戰鬥，`combatLog` 每筆事件也已經帶有 `timestamp`（相對戰鬥時間，ms），忠實記錄了誰在第幾毫秒行動。但前端 `combatResultPanel.vue` 目前是把整個 `combatLog` 陣列一次性、瞬間全部渲染出來，完全沒有利用這份時間資訊——玩家看到的是「戰鬥結果的文字清單」，感受不到「角色攻速 2 秒打一次、敵人攻速 3 秒打一次」這種戰術節奏。需要讓冒險畫面依 `timestamp` 差值逐筆播放戰鬥紀錄，而不是一次全部顯示。

## What Changes

- 冒險畫面播放 `combatLog` 時，SHALL 依相鄰兩筆事件的 `timestamp` 差值作為播放間隔，逐筆依序顯示，不再一次性全部渲染
- 同一個 `timestamp` 的多筆事件（例如同一次攻擊判定產生的 DODGE/CRIT + 隨後的 DEATH）SHALL 同時顯示，不額外插入等待
- 戰鬥摘要（EXP/金幣/寶石/掉落物）SHALL 在最後一筆 log 播放完畢後才顯示，呼應「不要一次播放所有結果」

## Capabilities

### New Capabilities
（無）

### Modified Capabilities
- `combat-engine`：「冒險畫面顯示戰鬥結果」requirement 新增依攻速/timestamp 逐筆播放的行為定義

## Impact

- **前端**：`app/components/game/combatResultPanel.vue`（改為依 timestamp 排程逐筆顯示 log，摘要延後到播放完畢才顯示）
- **不受影響**：伺服器端戰鬥模擬邏輯（`server/services/combat.service.ts`）與 API 回應格式（`combatLog`/`combatSummary`）皆已具備所需資料，本次不需要新增或修改後端欄位
