## 1. 資料模型：章節最後一關判斷所需欄位

- [ ] 1.1 在 `shared/types/adventure.ts` 的 `AdventureRun` 型別新增 optional 欄位 `chapterTotalLevels?: number`（快照，比照既有 `levelIndex`）
- [ ] 1.2 在 `shared/schemas/firestore/adventure.schema.ts` 對應新增 `chapterTotalLevels` 的 Zod schema 定義（optional）
- [ ] 1.3 在 `server/repositories/adventure-run.repository.ts` 的 `createRun` 參數型別與寫入欄位中新增 `chapterTotalLevels`
- [ ] 1.4 在 `server/services/adventure-run.service.ts` 的 `startRun` 呼叫 `createRun` 時，從 `characterWithStats.chapterTotalLevels` 傳入該欄位

## 2. 後端數值：章節最後一關 Boss 1.5 倍加成

- [ ] 2.1 在 `adventure-run.service.ts` 新增/沿用共用邏輯計算 `isChapterFinalBoss = run.levelIndex + 1 >= (run.chapterTotalLevels ?? Infinity)`（缺欄位時 fallback 為非最後一關，避免誤判）
- [ ] 2.2 在 `buildBossNodeData`（adventure-run.service.ts）取得 `bossMultipliers` 後，若 `isChapterFinalBoss` 為真，將 `{hp, atk, def}` 各乘 1.5 後再用於計算預覽 `hp`
- [ ] 2.3 將 `isChapterFinalBoss` 傳入 `CombatContext`（供 `combat.service.ts` 使用），確保與 1.5 倍加成相關的判斷來源與預覽一致
- [ ] 2.4 在 `combat.service.ts` 的 `spawnWave` 中，若 `context.isChapterFinalBoss` 為真，對 `bossMultipliers`（僅 boss 本體，非 `minionMultipliers`）額外乘 1.5，再傳入 `buildEnemyUnit`
- [ ] 2.5 確認 boss 隨從/minion（`minionMultipliers` 對應單位）不受此加成影響

## 3. 後端測試：Boss 數值加成

- [ ] 3.1 `adventure-run.service.test.ts` 新增測試：章節最後一關 BOSS 節點的預覽 `hp` 為原始計算值的 1.5 倍
- [ ] 3.2 `adventure-run.service.test.ts` 新增測試：章節內非最後一關 BOSS 節點的預覽 `hp` 不受影響
- [ ] 3.3 `combat.service.test.ts` 新增測試：章節最後一關 BOSS 節點的 boss 單位 `hp`/`atk`/`def` 為原始計算值的 1.5 倍，隨從單位不受影響
- [ ] 3.4 新增/更新測試驗證預覽與實際戰鬥的 boss `hp` 數值一致

## 4. 前端：Boss 節點圖像尺寸差異化

- [ ] 4.1 定位冒險戰鬥畫面中敵人圖像渲染的元件（`app/pages/adventure.vue` 或其子元件），確認現有 `isBoss` 欄位可用於判斷 boss 本體 vs 隨從/小兵
- [ ] 4.2 於 boss 節點中，為 boss 本體圖像套用 1.2 倍顯示尺寸樣式（或等效縮小小兵圖像），隨從/minion 維持原尺寸
- [ ] 4.3 啟動 dev server，於瀏覽器實際檢視 boss 節點戰鬥畫面，確認 boss 與小兵圖像尺寸差異正確呈現，且 HP 條/行動條等關聯 UI 無錯位或破版

## 5. 圖鑑：位階欄位與顯示

- [ ] 5.1 在 bestiary 相關的 API 回應 schema（`shared/schemas/api/*`）新增 `tier` 欄位（`'NORMAL' | 'BOSS'`），限定於 `encountered: true` 時提供
- [ ] 5.2 在 bestiary 查詢邏輯（`server/services` 中對應服務）依 archetype 來源陣列（一般 vs boss 陣列）決定 `tier` 值
- [ ] 5.3 更新圖鑑前端元件：上半部大方框與下半部格狀清單，於已遇過的敵人項目顯示位階標籤（例如「小兵」/「Boss」）；未遇過的項目不顯示
- [ ] 5.4 啟動 dev server，於瀏覽器實際開啟圖鑑 dialog，確認已遇過/未遇過敵人的位階顯示符合預期

## 6. 圖鑑測試

- [ ] 6.1 補充/更新 bestiary 相關後端測試：已遇過的一般 archetype 回傳 `tier: 'NORMAL'`，已遇過的 boss archetype 回傳 `tier: 'BOSS'`
- [ ] 6.2 補充/更新測試：未遇過的 archetype 回應不包含 `tier` 欄位

## 7. 文件更新

- [ ] 7.1 更新 `docs/game-design/balance/enemy-scaling.md`，補充章節最後一關 boss ×1.5 加成規則與範例
- [ ] 7.2 視需要更新 `docs/game-design/mechanics/run.md` 或相關 mechanics 文件，說明章節終局戰的數值/呈現差異

## 8. 收尾驗證

- [ ] 8.1 執行 `pnpm lint` 確認無新增 lint 錯誤
- [ ] 8.2 執行 `pnpm test` 確認所有測試通過
- [ ] 8.3 執行 `pnpm build` 確認型別檢查與建置成功
