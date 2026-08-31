## Context

`CombatLogEntry`（`shared/types/adventure.ts`）已經有 `timestamp: number`（相對戰鬥時間，ms），由 `server/services/combat.service.ts` 的離散事件排程（每個 unit 依自己的 `actionIntervalSec` 排 `nextAttackAt`）產生，因此 `timestamp` 差值本身就已經是「依攻速換算出的等待時間」，不需要前端重新查角色/敵人的 `actionIntervalSec` 或重新計算節奏。目前 `combatResultPanel.vue` 用單一 `v-for` 把整個 `combatLog` 陣列同步渲染完畢。

## Goals / Non-Goals

**Goals:**
- 前端依 `combatLog` 各筆 `timestamp` 差值，逐筆延遲顯示戰鬥紀錄
- 同一個 `timestamp` 的多筆事件（例如攻擊判定 + 目標死亡）一起顯示，不拆成兩次等待
- 戰鬥摘要（EXP/金幣/寶石/掉落物）延後到播放完最後一筆 log 才顯示

**Non-Goals:**
- 不新增「跳過播放/快轉」互動（若之後需要，留給後續 change 評估）
- 不修改伺服器端戰鬥模擬邏輯或 API 回應格式（`timestamp` 資料已存在，足夠使用）
- 不處理 `timestamp` 極端值（例如很長的戰鬥導致總播放時間很長）的特殊優化，1:1 呈現伺服器模擬的節奏即可

## Decisions

### 1. 播放間隔 = 相鄰兩筆事件的 `timestamp` 差值，1:1 對應真實時間

不重新計算 `actionIntervalSec`，直接用 `entries[i].timestamp - entries[i-1].timestamp`（ms）作為顯示第 i 筆前的等待時間；第一筆等待時間固定為 0（一開始播放就顯示）。這樣「攻速 2 秒打一次」會自然反映成畫面上大約每 2000ms 出現一條攻擊 log，不需要額外的攻速查表邏輯。

**替代方案**：前端重新依 actorId 查角色/敵人的 `actionIntervalSec` 計算間隔——否決，`timestamp` 已經是模擬時已經算好的結果，重算是多餘且可能與伺服器實際排程不一致（例如 Boss 補位、RunModifier 調整 `actionIntervalSec` 後的效果，`timestamp` 已經反映，但前端重算未必能重現）。

### 2. 相同 `timestamp` 的事件視為同一批，一次顯示

播放邏輯以「批次」為單位：先依 `timestamp` 分組（保持原陣列順序），批次間的等待時間 = 下一批 `timestamp` - 目前批次 `timestamp`；同批次內的多筆 entry 同時顯示、不插入等待。

### 3. 戰鬥摘要延後到播放結束才顯示

現行 `combatResultPanel.vue` 一開始就顯示回合數/EXP/金幣/寶石/掉落物摘要列（第 3~14 行），與「不要一次播放所有結果」的精神衝突。本次一併調整為：摘要列在最後一批 log 顯示完畢後才 render 出來，log 播放期間只顯示逐步累積的戰鬥紀錄。

**替代方案**：摘要維持一開始就顯示，只有 log 逐筆播放——否決，使用者的訴求是「戰鬥過程不要一次播放所有結果」，摘要本身就是「結果」的一部分，延後顯示更貼合訴求且改動成本很低（同一個元件內移動一個 `v-if` 條件）。

## Risks / Trade-offs

- [風險] 若某場戰鬥回合數很多（例如 Boss 補位延長戰鬥），總播放時間可能拉得很長，玩家需要等待 → Mitigation：本次先如實呈現伺服器模擬節奏（Non-Goal 已註明不做特殊優化），若之後體感不佳再由後續 change 評估加入快轉/跳過
- [風險] 元件卸載（玩家提前離開畫面）時，尚在等待中的 `setTimeout`/播放邏輯需要正確清除，否則可能造成記憶體洩漏或畫面卸載後仍嘗試更新狀態 → Mitigation：實作時以 `onUnmounted` 清除所有排程中的 timer

## Open Questions

- 若戰鬥紀錄很長導致總播放時間過長，是否需要「快轉」互動——本次列為 Non-Goal，留待玩家實際體驗回饋後再決定是否開新 change
