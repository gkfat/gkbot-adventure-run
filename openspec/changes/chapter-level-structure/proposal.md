## Why

現行冒險結構是扁平的「一次 run＝一趟完整遠征（10~20 節點，最後固定 Boss 戰）」，每次攻略成功就直接切換到下一個設施主題（`nextChapterIndex + 1`）。這與世界觀設定（`docs/worldview.md` 第 6 節）不符：不同設施理當有不同的規模/複雜度（小賣店應該很快攻略完，研究設施應該要打好幾趟才能摸透），但目前所有設施都是「打贏一次 Boss 就換下一個設施」，規模感完全一樣。需要在 run 之上插入「章節（設施）→ 關卡（該設施內的第幾趟遠征）」的階層，讓設施規模真正反映在需要攻略的關卡數上；同時 Boss 戰目前是固定單體，缺乏「頭目帶小兵」的戰術層次，也一併在本次補上。

## What Changes

- 新增「章節（Chapter）→ 關卡（Level）→ Run → Stage」四層階層：
  - Chapter＝設施主題（沿用現行 `nextChapterIndex` 概念，依序循環設施主題清單）
  - Level＝章節內的第幾趟遠征，每個章節的總關卡數在**進入章節時**以決定性 RNG 依設施類型的區間 roll 定（例如小賣店 3~5、研究設施 8~12），需要一份「設施類型 → 關卡數區間」對照表
  - Run＝現行的一次遠征（不變的資料實體），但改為對應「一個關卡」而非「整個設施」
  - Stage＝現行「節點（Node）」的改名（純命名，行為不變），run 內固定 10~20 個 Stage，最後一個 Stage 固定為該關卡的 Boss 戰
- **BREAKING**：關卡攻略成功（Boss 戰勝利）後的推進規則改變：
  - 若章節內還有未攻略的關卡，只推進到下一關卡（同一個設施主題，重新開始一次新的 10~20 Stage run），不切換設施主題
  - 只有攻略完章節最後一關，才真正推進到下一個章節（`nextChapterIndex + 1`、切換設施主題），並重置關卡進度、重新 roll 下一章節的總關卡數
- 死亡/斷線結算規則不變（只保留 EXP），但新增明確規則：死亡/斷線後角色停留在同一個關卡（關卡進度不回退、不前進）
- Boss 戰從「固定 1 wave、1 隻敵人」改為「1 隻 Boss + 最多 2 隻小兵護衛」，且部分 Boss 具備「手下有空缺時補充手下」的補位機制（需定案觸發時機與補位上限，避免無限刷新）
- 一般戰鬥 Stage 明確定案：1~2 波次、每波最多 3 隻敵人（沿用現行機制，只是把上限寫進 spec）
- `docs/worldview.md` 第 6 節已同步改寫為新的敘事骨架（章節・關卡・Run・Stage）

## Capabilities

### New Capabilities
（無新 capability，沿用既有兩個 capability 擴充其 requirements）

### Modified Capabilities
- `adventure-run-lifecycle`：新增 Chapter/Level 階層、角色文件新欄位（關卡進度與章節總關卡數）、設施類型對關卡數區間對照表、關卡推進 vs 章節推進的判定規則、死亡/斷線後關卡不回退規則；既有「Stage 結構與 Boss 節點」「Stage 完成即結束 Run」等 requirement 依新階層重新表述（節點改稱 Stage）
- `combat-engine`：Boss tier 從固定單體改為「Boss + 最多 2 小兵」，新增小兵補位機制的觸發規則與上限；一般戰鬥的波次/波內敵人數上限（1~2 波、每波最多 3 隻）明確寫入 spec

## Impact

- **Server**：`server/repositories/character.repository.ts`（角色文件新增關卡進度欄位、`nextChapterIndex` 推進條件改變）、`server/repositories/adventure-run.repository.ts`、`server/services/adventure-run.service.ts`（run 建立/結算流程需要判斷章節內關卡推進 vs 章節推進）、`server/services/combat.service.ts`（Boss 戰改為多目標、小兵補位邏輯）
- **設定資料**：`STAGE_CONFIG`/`NODE_CONFIG` 需要擴充「設施類型 → 關卡數區間」對照表；`FACILITY_THEMES` 清單需要對應新增此區間資料
- **測試**：`character.repository.test.ts`、`adventure-run.service.test.ts`、`combat.service.test.ts`、`event.service.test.ts` 涉及章節推進與 Boss 戰的既有測試需要同步調整
- **前端**：冒險畫面顯示（首頁 CTA 文案、章節/關卡進度顯示）需要跟進，但本次 change 聚焦後端 spec 定案，前端調整留待對應 change 的 tasks 規劃
- **不受影響**：`docs/worldview.md` 已於本次一併更新，僅作為敘事對齊依據，不在本 change 的 tasks 範圍內重複列出
