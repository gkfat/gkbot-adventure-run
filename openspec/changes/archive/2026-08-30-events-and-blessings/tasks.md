## 1. 模板常數

- [x] 1.1 新增 `server/constants/events.ts`：事件模板（type/weight/description/choices）— 5 種模板對應 5 個 EventType，數值為 ASSUMPTION（`10_事件祝福與詛咒.md` 不存在），已記錄在 design.md
- [x] 1.2 新增 `server/constants/blessings.ts`：Blessing/Curse 效果定義 — `blessingPointsThreshold` 不在此檔（已由 `adventure-run-core` 的 `NODE_CONFIG.BLESSING_POINTS_THRESHOLD` 定義，見 opsx:update 的衝突修正）；per-enemyLevel 給分規則同理已由 `combat-engine` 的 `blessingPointsForVictory` 實作，本檔只放 Blessing/Curse 的 `RunModifier` 內容與候選權重

## 2. 事件服務

- [x] 2.1 新增 `server/services/event.service.ts`：`selectEvent(runId)`、`resolve(run, choiceIndex)` 內部依 type 分派到 HEAL/BLESSING/CURSE/WHEEL/CHOICE 各自的處理（含 gems 3% 機率規則）
- [x] 2.2 實作 `EventResolver` 介面（`AdventureRunService` 新增 `eventService` 欄位並在 `advanceFromExploring`/新增的 `resolveEvent()` 呼叫）

## 3. 祝福服務

- [x] 3.1 新增 `server/services/blessing.service.ts`：`generateCandidates(runId, luck)`（3 選 1，權重隨 LUCK 偏向 MAJOR tier）；`accumulatePoints`/`selectBlessing` 不在此服務——點數累積已由 `combat-engine` 的 `resolveCombat` 實作，候選存取/選擇邏輯合併進 `AdventureRunService.selectBlessing()`（單一 run 寫入者原則，見 design.md）
- [x] 3.2 Run 結束時清空所有生效中 RunModifier — 確認不需要額外清空函式：`AdventureRunRepository.createRun` 已將每個新 run 的 `blessings`/`curses` 固定初始化為 `[]`，且 `getActiveByCharacterId` 排除 `state=ENDED` 的 run，modifier 天生就不會帶到下一個 run

## 4. API

- [x] 4.1 新增 `server/api/adventure/event/resolve.post.ts` — 補上 `characterId`（同前面所有 change 的既有慣例）與缺漏的 `eventId`/`blessingGranted`/`curseApplied`/`itemsGained` 回應欄位（原 scaffold 的 `resolveEventResponseSchema` 沒有這些欄位，對不上 `EventResult` 型別）
- [x] 4.2 新增 `server/api/adventure/blessing/select.post.ts` — 補上 `characterId`

## 5. 文件與驗證

- [x] 5.1 於 `server/utils/openapi.ts` 註冊 2 個新路徑 — 發現這兩個路徑其實已經在既有 scaffold 中完整註冊（含 request body），不需要額外修改
- [x] 5.2 執行 `pnpm nuxi typecheck` — 通過（僅剩既有無關錯誤）
- [ ] 5.3 手動驗證：事件選擇/choice 結算、轉盤 gems 掉落機率、祝福累積達門檻觸發、候選稀有度隨 LUCK 變化、run 結束後 modifier 不殘留

## 6. 前端

- [x] 6.1 `useAdventureRun.ts` 新增 `resolveEvent(characterId, choiceIndex?)`：封裝 POST /api/adventure/event/resolve
- [x] 6.2 `useAdventureRun.ts` 新增 `selectBlessing(characterId, blessingId)`：封裝 POST /api/adventure/blessing/select
- [x] 6.3 `adventure.vue`：EVENT 節點顯示事件描述；有 choices 顯示選項按鈕，無 choices 直接顯示套用結果
- [x] 6.4 `adventure.vue`：BLESSING_SELECT 節點顯示 3 個候選 Blessing 卡片，可點選
- [x] 6.5 手動驗證：事件（有/無 choices）與祝福選擇畫面皆正確運作，沿用既有 RESOLUTION 流程
    - 瀏覽器實測涵蓋：COMBAT、REST、EVENT（CHOICE 型、HEAL 型無 choices）、BLESSING_SELECT，皆正確運作
    - 過程中發現並修正兩個真實 bug：
      1. `advanceFromExploring` 組 EVENT 的 `currentNodeData.choices` 在無 choices 事件下會設為 `undefined`，Firestore 拒絕寫入導致 500；改為無 choices 時完全省略該欄位
      2. `useAdventureRun.ts` 的 `advance()` 只在進入 COMBAT/EVENT 時清除 `lastCombatResult`/`lastEventResult`，導致例如「戰鬥 → REST → RESOLUTION」時 RESOLUTION 誤顯示上一場戰鬥的舊結果；改為離開 RESOLUTION 時一律清除兩者
