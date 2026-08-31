## Context

現行結構（`shared/types/adventure.ts` `STAGE_CONFIG`、`server/repositories/character.repository.ts`、`server/repositories/adventure-run.repository.ts`）把「章節（設施主題）」與「一次 run」綁死成 1:1：`nextChapterIndex` 只記在角色文件上，Run 建立時直接抄一份到 `run.chapterIndex`，Boss 戰勝利即結算並把 `nextChapterIndex + 1`。`STAGE_CONFIG.FACILITY_THEMES` 是設施主題清單，`NODE_COUNT_MIN/MAX`（10~20）是每次 run 的節點數區間——這兩者目前都是全域共用，與設施主題無關。

本次要在「章節」與「run」之間插入「關卡（Level）」，讓同一個章節（設施）可以包含多次 run，且不同設施類型的關卡數不同。同時 Boss 戰（`server/services/combat.service.ts`）目前固定單體，要擴充為「Boss + 最多 2 小兵」並支援補位。

## Goals / Non-Goals

**Goals:**
- 角色文件能追蹤「目前在哪個章節的第幾關」與「本章節總共幾關」
- 進入章節時以決定性 RNG 依設施類型 roll 出本章節總關卡數
- 關卡（Level）攻略成功（Boss 戰勝利）後，依是否為章節最後一關決定「推進到下一關（同章節）」或「推進到下一章節」
- Boss 戰支援「Boss + 最多 2 小兵」，且部分 Boss 具備小兵補位能力
- 死亡/斷線後，角色停留在同一關卡，不回退也不前進

**Non-Goals:**
- 不涉及前端 UI/UX 呈現章節進度的具體設計（留給後續 tasks 或 change）
- 不重新設計金幣/寶石/物品的結算規則（沿用現行 `Run 結算` requirement）
- 不引入「Level 難度倍率」以外的新增戰鬥數值曲線調整
- 不處理章節/關卡的排行榜、成就掛鉤（沿用現行事件掛鉤機制，不擴充新事件）

## Decisions

### 1. 資料模型：角色文件新增 `currentLevelIndex`、`chapterTotalLevels`

沿用現行 `nextChapterIndex`（角色目前所在章節），新增：
- `currentLevelIndex: number`（0-based，角色目前在本章節的第幾關）
- `chapterTotalLevels: number`（本章節總關卡數，進入章節第一關時 roll 定，章節內固定不變）

**替代方案**：把關卡資訊記在 `AdventureRun` 文件而非角色文件——否決，因為關卡進度需要跨越多次 run（死亡/斷線後開新 run 仍要停在同一關），角色文件才是正確的持久化位置，run 文件只是「目前這一關的執行狀態」。

### 2. 設施類型 → 關卡數區間：新增 `LEVEL_COUNT_RANGE_BY_FACILITY`

在 `STAGE_CONFIG` 旁新增一份對照表，key 為 `FACILITY_THEMES` 的索引（或設施主題字串），value 為 `{ min, max }`。依 `docs/worldview.md` 第 2 節設施類型的規模語感給初始值（例如「無主小賣店」3~5、「廢棄研究所」8~12，其餘設施類型落在兩者之間，具體數字在 spec 定案時給出完整表格）。

**替代方案**：關卡數固定寫死（不用 RNG）——否決，使用者已確認要用「進入章節時一次決定性 RNG roll」，理由是维持隨機性但避免玩家在同一章節內看到關卡數變動。

### 3. 章節/關卡推進判定：在 Run 結算時做，不新增獨立 API

沿用現行 `Run 結算`（`character.repository.ts` 的 `endRun`/結算邏輯）的呼叫點，在 `endReason = COMPLETED` 分支內新增判定：
- `currentLevelIndex + 1 < chapterTotalLevels` → 只更新 `currentLevelIndex += 1`，`nextChapterIndex` 不變
- `currentLevelIndex + 1 >= chapterTotalLevels` → `nextChapterIndex += 1`、`currentLevelIndex = 0`、重新 roll 新章節的 `chapterTotalLevels`

死亡/斷線（`DEAD`/`DISCONNECT`）分支維持現行「`nextChapterIndex` 不變」的邏輯不動，額外明確 `currentLevelIndex` 也不變（本來就沒被觸碰，只是要在 spec 寫清楚）。

**替代方案**：在 Run 建立時就先行決定「這是不是章節最後一關」並存進 run 文件——否決，關卡總數在章節開始時已經 roll 定，`currentLevelIndex` 與 `chapterTotalLevels` 在角色文件上就能推算，不需要在 run 文件重複一份。

### 4. Boss 戰：Boss + 最多 2 小兵，支援補位

`combat.service.ts` 目前 BOSS tier 固定 `waveCount=1, enemyCount=1`。改為：Boss 進場時固定生成「1 隻 Boss（tier=BOSS 數值）+ 最多 2 隻小兵（沿用 STRONG_ELITE 或既有小兵數值模板）」。補位機制：部分 Boss（由怪物模板的旗標決定，例如既有 `enemy-factions-and-severity` 定案的技能型 Boss 清單中挑選具備補位能力的頭目）在回合結算後，若小兵數 < 2 且 Boss 仍存活，SHALL 以一定機率/固定間隔補一隻新小兵，並設補位次數上限（避免無限刷新拖長戰鬥），具體機率/間隔/上限留待 spec 的 Requirement/Scenario 定案。

**替代方案**：所有 Boss 都能補位——否決，使用者的描述是「有些 boss」，只有具備該旗標的 Boss 模板才會補位，其餘 Boss 固定只在開場生成小兵、打完就沒了。

### 5. 命名：節點（Node）→ Stage

只在文件/型別命名層面統一（`NodeType` 等現行型別可保留，spec 文字改用「Stage」描述，避免大改型別名稱造成不必要的程式碼變動）。`STAGE_CONFIG.NODE_COUNT_MIN/MAX` 可維持現有欄位名稱不變（實作細節，非 spec 契約），spec 內文一律稱為「Stage」。

## Risks / Trade-offs

- [風險] 章節推進判定從「Boss 戰勝利即結算」變成「還要判斷是否為章節最後一關」，若舊有測試/前端假設「攻略成功＝一定換設施主題」會壞掉 → Mitigation：`adventure-run.service.test.ts`、`character.repository.test.ts` 需要新增涵蓋「同章節內關卡推進」與「章節推進」兩種案例，並在 tasks 中列出前端需要跟進但本次不強制完成
- [風險] Boss 補位機制若上限設計不當可能讓戰鬥模擬迴圈拖太長（伺服器單次決定性模擬，回合數上升會拉長運算時間）→ Mitigation：spec 明確定案補位次數上限與觸發間隔，並在既有「伺服器單次模擬戰鬥」requirement 下新增情境測試
- [風險] `chapterTotalLevels` 一次性 roll 定後，若之後想調整某設施的關卡數區間，既有進行中角色的 `chapterTotalLevels` 不會自動套用新區間 → Mitigation：屬於預期行為（角色已經在跑的章節維持原本 roll 定的數字），下個章節開始才套用新區間，不需要遷移邏輯

## Migration Plan

- 角色文件新增欄位 `currentLevelIndex`（預設 0）、`chapterTotalLevels`（既有角色首次讀取時，比照現行 `nextChapterIndex` backfill 的做法，依角色目前 `nextChapterIndex` 對應的設施類型即時 roll 一次並寫回，邏輯放在 `character.repository.ts` 既有的 backfill 函式旁）
- 無需資料搬遷腳本，backfill 於讀取時 lazily 完成即可（沿用現行 `nextChapterIndex` 的 backfill 模式）
- 不需要 feature flag：本次為 spec/後端邏輯調整，前端顯示不受影響（CTA 文案沿用現行設施主題名稱），關卡數變動只影響「打贏 Boss 後是否切換主題」，屬於單次部署即可生效的行為變更

## Open Questions

- 各設施類型的關卡數區間完整表格（8 種設施類型 × min/max）由誰定案語感——本次 design 只給兩個錨點（小賣店 3~5、研究設施 8~12），其餘 6 種留待 spec 撰寫時依規模語感直接定案，不再另外提問
- Boss 補位機制的觸發機率/間隔/次數上限的具體數字，留待 spec Requirement/Scenario 定案時直接給出可驗證的值（例如「每 3 回合檢查一次，最多補位 2 次」），不在此 design 預先鎖定
