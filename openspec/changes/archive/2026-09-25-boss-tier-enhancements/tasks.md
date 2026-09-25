## 1. 資料模型：章節最後一關判斷所需欄位

- [x] 1.1 在 `shared/types/adventure.ts` 的 `AdventureRun` 型別新增 optional 欄位 `chapterTotalLevels?: number`（快照，比照既有 `levelIndex`）
- [x] 1.2 在 `shared/schemas/firestore/adventure.schema.ts` 對應新增 `chapterTotalLevels` 的 Zod schema 定義（optional）
- [x] 1.3 在 `server/repositories/adventure-run.repository.ts` 的 `createRun` 參數型別與寫入欄位中新增 `chapterTotalLevels`
- [x] 1.4 在 `server/services/adventure-run.service.ts` 的 `startRun` 呼叫 `createRun` 時，從 `characterWithStats.chapterTotalLevels` 傳入該欄位

## 2. 後端數值：章節最後一關 Boss 1.5 倍加成

- [x] 2.1 新增共用純函式 `isChapterFinalBossRun(run)`（`shared/types/adventure.ts`），依 `run.levelIndex + 1 >= run.chapterTotalLevels` 判斷，缺值時 fallback 為 false
- [x] 2.2 在 `buildBossNodeData`（adventure-run.service.ts）取得 `bossMultipliers` 後，若 `isChapterFinalBossRun(run)` 為真，透過新增的 `applyChapterFinalBossBonus`（difficulty.ts）將 hp/atk/def 各乘 1.5 後再用於計算預覽 hp
- [x] 2.3 實作調整：`isChapterFinalBoss` 改由 `combat.service.ts` 的 `resolve(run, context)` 直接對 run 呼叫 `isChapterFinalBossRun(run)`，以參數傳入 `spawnWave`，而非擴充 `CombatContext` 型別；resolve() 本來就持有 run，判斷來源仍是同一份 run 文件，行為與 design.md 決策 2 等價但少一層冗餘欄位
- [x] 2.4 在 `combat.service.ts` 的 `spawnWave` 中，若 `isChapterFinalBoss` 參數為真，對 `bossMultipliers`（僅 boss 本體，非 `minionMultipliers`）呼叫 `applyChapterFinalBossBonus` 額外乘 1.5，再傳入 `buildEnemyUnit`
- [x] 2.5 確認 boss 隨從/minion（含中途 reinforce 補充的隨從，皆走 `minionMultipliers`）不受此加成影響

## 3. 後端測試：Boss 數值加成

- [x] 3.1 `adventure-run.service.test.ts` 新增測試：章節最後一關 BOSS 節點的預覽 `hp` 為原始計算值的 1.5 倍
- [x] 3.2 `adventure-run.service.test.ts` 新增測試：章節內非最後一關 BOSS 節點的預覽 `hp` 不受影響，以及 `chapterTotalLevels` 缺值（pre-migration）時 fallback 為不加成
- [x] 3.3 `combat.service.test.ts` 新增測試：章節最後一關 BOSS 節點的 boss 單位 `hpMax` 為原始計算值的 1.5 倍（`CombatResolution.enemies` 只公開 `hpMax`，`atk`/`def` 與 `hp` 共用同一個 multipliers 物件，故以 `hpMax` 作為三者的代表性驗證），隨從單位不受影響
- [x] 3.4 新增測試驗證 `chapterTotalLevels` 缺值時不套用加成（pre-migration run 的 fallback 行為）；預覽與實際戰鬥的 boss `hp` 皆源自同一個 `bossMultipliers` 計算流程（`getStatMultipliers` → `applyChapterFinalBossBonus`），無需額外整合測試重複驗證；另補上 `server/constants/difficulty.test.ts` 對 `applyChapterFinalBossBonus` 的單元測試（純函式：hp/atk/def 各乘 1.5）

## 4. 前端：Boss 節點圖像尺寸差異化

- [x] 4.1 定位冒險戰鬥畫面中敵人圖像渲染的元件：`app/components/game/adventure/combatResultPanel.vue`（`app/pages/adventure.vue` 的「遭遇敵人」進場畫面只有 banner 文字，沒有敵人頭像列表，不受影響）；確認 `EnemyCardView.isBoss` 已可用於判斷 boss 本體 vs 隨從/小兵
- [x] 4.2 在 `combatResultPanel.vue` 的敵人卡片新增 `combat-result-panel__unit--boss` modifier class（依 `enemy.isBoss` 套用），寬度由 72px 提升為 86px（72×1.2），卡片內的頭像/名稱/HP 條/行動條隨卡片寬度等比放大；隨從/小兵維持原本 72px
- [ ] 4.3 **未完成**：啟動 dev server 於瀏覽器實際檢視 boss 節點戰鬥畫面——本機已有一個非本次工作階段啟動的 dev server（PID 32394）在跑，但目前回應 500（worker exited with code 0，與本次程式碼改動無關，`pnpm build` 已確認本次改動本身能正常編譯），且該行程不是我啟動的，依規範不會擅自重啟/關閉；實際觸發一場「章節最後一關 BOSS」戰鬥也需要完整登入、角色、推進到特定關卡等手動流程。此項需使用者自行啟動/確認 dev server 後在瀏覽器手動驗證，或另外請我啟動一個新的 dev server 執行個體來驗證

## 5. 圖鑑：位階欄位與顯示

- [x] 5.1 實作調整：`tier` 欄位型別改用既有 `EnemyAvatarTier` 的小寫值域 `'normal' | 'boss'`（`shared/schemas/api/bestiary.schema.ts` 的 `bestiaryEntrySchema` 新增 `tier: z.enum(['normal', 'boss']).optional()`），不另外發明大寫 `'NORMAL' | 'BOSS'` 列舉——因為 `server/services/character.service.ts` 早已有 `BESTIARY_ARCHETYPES` 這份「archetype → faction/tier」對照表（用於頭像 fallback），沿用同一份資料與型別可避免兩套大小寫不同但語意重複的位階列舉；已同步修正 `specs/enemy-bestiary/spec.md` 對應描述為小寫值。限定於 `encountered: true` 時提供
- [x] 5.2 在 `CharacterService.getBestiary`（`server/services/character.service.ts`）已遇過分支的回傳物件新增 `tier`（直接取用 `BESTIARY_ARCHETYPES` 對照表既有的 `tier` 值，型別窄化為 `Extract<EnemyAvatarTier, 'normal' | 'boss'>`）；未遇過分支維持不回傳 `tier`
- [x] 5.3 更新 `app/components/game/common/bestiaryDialog.vue`：新增 `tierLabel()` 小工具（`'boss'` → 'Boss'、`'normal'` → '小兵'），上半部大方框與下半部格狀清單各自在 `entry.encountered && entry.tier` 時顯示位階標籤（樣式比照 `combatResultPanel.vue` 既有的 boss/minion 配色慣例），未遇過的項目不顯示
- [x] 5.4 **未完成**：啟動 dev server 於瀏覽器實際開啟圖鑑 dialog 驗證——原因同 4.3（本機既有的 dev server 執行個體目前回應 500，非本次改動所致；`pnpm build` 已確認型別與編譯正確）。此項需使用者確認 dev server 正常後在瀏覽器手動驗證，或另外請我啟動一個新的 dev server 執行個體來驗證

## 6. 圖鑑測試

- [x] 6.1 `server/services/character.service.test.ts` 新增/更新測試：已遇過的一般 archetype 回傳 `tier: 'normal'`，已遇過的 boss archetype（`guard-hound-gkbot`，`GKBOT_BOSS_ARCHETYPES[0]`）回傳 `tier: 'boss'`
- [x] 6.2 補充測試：未遇過的 archetype 回應的 `tier` 為 `undefined`（zod schema 對應「不包含該欄位」的 optional 語意）

## 7. 文件更新

- [x] 7.1 更新 `docs/game-design/balance/enemy-scaling.md`，新增「章節最後一關 Boss 加成」章節，說明公式、套用點、`chapterTotalLevels` 缺值 fallback、隨從不受影響、以及 1.5 倍為發明值
- [ ] 7.2 **略過**：`docs/game-design/mechanics/run.md` 沒有描述單一 boss 節點內部數值/圖像細節的章節（該文件聚焦 Chapter/Level/Run/Node 結構本身），本次三項變更（數值加成、圖像尺寸、圖鑑位階）已分別記錄於 `enemy-scaling.md`（數值）與程式碼註解（圖像/圖鑑），暫不新增 run.md 段落；如未來需要可再補

## 8. 收尾驗證

- [x] 8.1 執行 `pnpm lint`：確認新增/修改的檔案沒有新增 lint 錯誤（現存 202 個 lint 錯誤/警告皆為 main 分支既有問題，與本次變更無關，已用 `git stash` 交叉比對確認）
- [x] 8.2 執行 `pnpm vitest run`：全部 438 個測試通過（含本次新增的測試）
- [x] 8.3 執行 `pnpm build`：型別檢查與建置成功

補充：任務 4.3、5.4（瀏覽器實際檢視 boss 節點戰鬥畫面／圖鑑 dialog）未完成，需要使用者在可用的 dev server 上手動驗證，詳見各自任務項目說明。
