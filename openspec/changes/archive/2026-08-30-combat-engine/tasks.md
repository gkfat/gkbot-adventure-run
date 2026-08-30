## 1. 戰鬥數值常數

- [x] 1.1 於 `server/constants/stats.ts`（或新增 `server/constants/combat.ts`）補齊 crit/dodge 係數與上限（`baseCrit=0.05`、`critPerAgi=0.003`、`critCap=0.35`、`critMultiplier=1.5`、`baseDodge=0.03`、`dodgePerAgi=0.002`、`dodgeCap=0.25`）— 實作時發現這些係數已經在 `adventure-run-core` 的 `shared/types/adventure.ts` 的 `COMBAT_CONFIG` 定義且已被 `server/constants/stats.ts` 使用，數值完全吻合，不需重複定義；`server/constants/combat.ts` 改為存放本 change 新增的敵人資料表與掉落公式

## 2. 戰鬥模擬引擎

- [x] 2.1 新增 `server/services/combat.service.ts`：時間軸事件排程（依 actionIntervalSec 決定行動順序）
- [x] 2.2 傷害計算：`damage = max(1, ATK-DEF) * (crit ? critMultiplier : 1)`，crit/dodge 判定透過 `RngService`
- [x] 2.3 `applyModifiers(baseStats, activeModifiers)`：套用生效中 Blessing/Curse 的臨時數值修正 — 實作時發現 `run.blessings`/`run.curses` 目前只是 modifierId 字串陣列，沒有查表機制可解析成實際的 `RunModifier` 物件（那是 `events-and-blessings` 的範圍），故 `resolve()` 內目前固定傳入 `[]`；`applyModifiers`/`combinedDropRateMultiplier` 函式本身已完整實作並測試，等 `events-and-blessings` 完成查表後只需把解析出的陣列接上即可
- [x] 2.4 掉落結算：金幣（受 LUCK 影響）、物品（呼叫 `items-and-equipment` 的 `ItemService.generateItemInstance`）、gems（依 enemyLevel 分級，含 >30 的 fallback 規則並加註記）

## 3. 對接 adventure-run-core

- [x] 3.1 實作 `CombatResolver` 介面（取代 `adventure-run-core` 的 stub）
- [x] 3.2 戰鬥結束後呼叫 `quests-and-achievements` 的 `incrementProgress`（例如擊殺數）— 透過 `adventure-run-core` 已經注入的 `ProgressTracker` no-op stub 呼叫（`quests-and-achievements` 尚未實作，目前無實際效果，等該 change 完成後自動生效）

## 4. API

- [x] 4.1 新增 `server/api/adventure/combat/start.post.ts` — 同 `adventure-run-core` 的既有慣例，補上 `startCombatRequestSchema`（`characterId`，因為端點是 flat path 沒有 `{characterId}` 片段）

## 5. 文件與驗證

- [x] 5.1 於 `server/utils/openapi.ts` 註冊新路徑（含新增的 request body schema）
- [x] 5.2 單元測試：傷害公式邊界（ATK<=DEF 時傷害恆為 1）、crit/dodge 機率的 clamp 上限、多波多敵的 combatLog 完整性 — clamp 上限本身是 `character-progression` 既有的 `calculateBaseStats` 邏輯（不在本 change 範圍），本 change 針對傷害公式、`applyModifiers`、多波多敵 combatLog 完整性、掉落公式新增了完整的單元測試（`combat.service.test.ts`、`combat.test.ts`）
- [x] 5.3 執行 `pnpm nuxi typecheck` — 通過（僅剩 2 處與本 change 無關的既有型別錯誤，未新增任何錯誤）
- [x] 5.4 手動驗證：透過瀏覽器實際跑過一場戰鬥（開始戰鬥 → 6 回合 → 勝利 → 分數+10/金幣+2 → combatLog 正確顯示中文事件敘述 → 繼續前進正確推進到第 2 關且戰鬥面板正確清除）。**未實測**：不同 LUCK 值的掉落量差異、Blessing/Curse 生效時的傷害變化——LUCK 對掉落的影響已有單元測試覆蓋（`combat.test.ts` 的 `applyLuckToGold`），Blessing/Curse 因 `events-and-blessings` 尚未實作、`activeModifiers` 目前恆為 `[]`，無法產生真實效果可供手動比對

## 6. 前端

- [x] 6.1 `useAdventureRun.ts` 新增 `startCombat(characterId)`：封裝 `POST /api/adventure/combat/start`，呼叫後重新 `fetchCurrent`（比照 `useHealingItem` 的模式）
- [x] 6.2 `adventure.vue`：COMBAT 節點改為「開始戰鬥」按鈕（取代「戰鬥尚未開放」佔位文字）
- [x] 6.3 `adventure.vue`：戰鬥結束後顯示 combatSummary（勝負/回合數/金幣/寶石/物品掉落）與簡化版 combatLog 事件列表 — 新增 `GameCombatResultPanel` 元件；結果會在 COMBAT 與接下來的 RESOLUTION 畫面持續顯示，直到玩家按「繼續前進」離開
- [x] 6.4 手動驗證：從 COMBAT 節點點「開始戰鬥」→ 正確顯示戰鬥結果 → 沿用既有 RESOLUTION 畫面（繼續前進/結束冒險）皆正常運作 — 瀏覽器實測通過（見 5.4）
