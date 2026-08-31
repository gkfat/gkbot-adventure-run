## 1. 播放邏輯

- [x] 1.1 在 `app/components/game/combatResultPanel.vue`（或抽成 composable）新增依 `timestamp` 分批的播放排程：先將 `combatLog` 依 `timestamp` 分組，逐批以 `setTimeout` 延遲顯示，延遲時間 = 相鄰兩批 `timestamp` 差值
- [x] 1.2 元件卸載（`onUnmounted`）時清除所有尚未觸發的 timer，避免記憶體洩漏或卸載後仍更新狀態
- [x] 1.3 摘要列（回合數/EXP/金幣/寶石/掉落物）改為在最後一批 log 顯示完畢後才 render（一併把 `app/pages/adventure.vue` 的「戰鬥勝利/戰鬥失敗」標題也延後到播放完畢才顯示，透過 `playback-complete` 事件同步）

## 1a. 敵人狀態面板與倒數旋轉動畫

- [x] 1a.1 `CombatResult.enemies`（`shared/types/adventure.ts`）新增 `hpMax`/`isBoss`，`combat.service.ts` 的 `enemies: encountered.map(...)` 一併帶出；`combatSummarySchema.enemies`（`shared/schemas/firestore/adventure.schema.ts`）同步新增欄位，否則 `startCombatResponseSchema.parse()` 會把新欄位濾掉
- [x] 1a.2 `combatResultPanel.vue` 新增 `enemyStatus` computed：以目前已播放的批次（`visibleEntries`）依序套用 `targetHpRemaining`/`DEATH`，還原每隻敵人當下的 HP／存活狀態；只有戰鬥中存在 `isBoss=true` 的敵人才顯示「頭目/小兵」階級標籤
- [x] 1a.3 新增 rotate-spinner：`spinnerDurationMs` computed 依目前批次到下一批次的 `timestamp` 差值決定動畫單圈時長，`:key="visibleGroupCount"` 讓每批之間重新開始轉一圈；播放完畢（`visibleGroupCount` 到達批次總數）時不顯示

## 2. 驗證

- [ ] 2.1 手動在瀏覽器測試一場多波次戰鬥（含一場 BOSS 戰），確認 log 依攻速節奏逐筆出現、摘要延後顯示、敵人狀態面板（階級/HP）隨播放進度更新、倒數旋轉動畫的單圈時長與下一批間隔一致 —— **未完成**：本機登入僅提供 Google OAuth，無開發用 bypass 帳號，無法在沙盒瀏覽器內完成登入以觸發真實戰鬥，需請使用者自行以 `npm run dev` 手動驗證
- [x] 2.2 確認快速連續觸發戰鬥（例如玩家連按）不會讓上一場戰鬥殘留的 timer 汙染新一場的播放（`schedulePlayback` 一開始就呼叫 `clearTimers()`，並由 `watch(() => props.result, ...)` 在每次新戰鬥結果進來時重新排程）

## 3. Archive

- [x] 3.1 確認無其他前端元件依賴「combatLog 一次性全部顯示」的假設（僅 `useAdventureRun.ts`、`combatResultPanel.vue`、`adventure.vue` 使用 `combatLog`，皆已檢查）
- [ ] 3.2 執行 `openspec archive combat-log-sequential-playback`，同步 delta spec 回 `openspec/specs/combat-engine/spec.md`（待使用者確認 2.1 手動驗證通過後再執行）
