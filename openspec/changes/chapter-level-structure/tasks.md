## 1. 設定資料：章節/關卡數對照表

- [x] 1.1 在 `shared/types/adventure.ts` 的 `STAGE_CONFIG` 旁新增 `LEVEL_COUNT_RANGE_BY_FACILITY`（8 種設施類型 × `{min, max}`，`FACILITY_THEMES` 每個索引都有對應區間），依世界觀規模語感定案數字（小賣店 3~5、研究設施 8~12 為錨點，其餘 6 種依規模語感落在合理區間）
- [x] 1.2 新增 `rollChapterTotalLevels(chapterIndex, rngValue)`（純函式）+ `CharacterRepository` 內的 `rollChapterTotalLevelsForCharacter(characterId, chapterIndex)`：以 `random(characterId, chapterIndex)` 決定性推導 rngValue，不需要額外持久化 seed

## 2. 角色文件：章節/關卡進度欄位

- [x] 2.1 在角色文件 schema/型別新增 `currentLevelIndex: number`、`chapterTotalLevels: number`
- [x] 2.2 `withLevelDefaults`（`character.repository.ts`）比照既有 `withNextChapterDefault` 的「不做資料回填」容忍模式，在記憶體中即時預設缺欄位的舊角色文件；因為 `rollChapterTotalLevelsForCharacter` 對同一 (characterId, chapterIndex) 是決定性、可重現的，不需要寫回 Firestore 也能保持跨次讀取穩定
- [x] 2.3 角色初始建立（新角色）時，`currentLevelIndex = 0`，並依第 0 個設施主題 roll 出初始 `chapterTotalLevels`

## 3. Run 結算：關卡推進 vs 章節推進

- [x] 3.1 修改 `server/repositories/character.repository.ts` 的 `settleRunRewards`：`endReason = COMPLETED` 時，依 `currentLevelIndex + 1` 與 `chapterTotalLevels` 比較，決定「`currentLevelIndex += 1`」或「`nextChapterIndex += 1` + `currentLevelIndex = 0` + 重新 roll `chapterTotalLevels`」，回傳新增的 `chapterAdvanced` 旗標
- [x] 3.2 確認 `DEAD`/`DISCONNECT` 結算路徑不異動 `currentLevelIndex`/`chapterTotalLevels`
- [x] 3.3 `SettleSummary` 新增 `chapterAdvanced: boolean`（`shared/types/adventure.ts` + `settleSummarySchema`），`adventure-run.service.ts` 的 `settleRun` 一併帶出

## 4. Boss 戰鬥：小兵陣容與補位機制

- [x] 4.1 `EnemyArchetype`（`server/constants/combat.ts`）新增 `bossMinionCount: 0|1|2` 與 `canReinforce: boolean`，4 個既有模板各自定案數值
- [x] 4.2 `adventure-run.service.ts` 新增 `buildBossNodeData`：BOSS tier 固定 1 wave，敵人陣容為「1 隻 Boss（BOSS 倍率）+ archetype.bossMinionCount 隻小兵（STRONG_ELITE 倍率）」；`combat.service.ts` 的 `spawnWave`/`buildEnemyUnit` 依 slot 0 vs 其餘 slot 套用對應倍率
- [x] 4.3 `combat.service.ts` 的 `resolve()` 主迴圈新增補位邏輯：每滿 3 回合（`BOSS_REINFORCE_CONFIG.CHECK_INTERVAL_ROUNDS`）檢查一次，具備補位能力、Boss 存活、小兵數 < 2 時以 50%（`BOSS_REINFORCE_CONFIG.CHANCE`）機率補一隻新小兵，單場上限 2 次（`MAX_REINFORCEMENTS`）
- [x] 4.4 勝負判定沿用既有 `alive.length === 0` 迴圈結束條件，天然涵蓋「Boss 本體與所有小兵皆陣亡」，新增測試驗證
- [x] 4.5 `computeRewards` 的保底掉落改為只在擊敗的單位是 `unit.isBoss` 時強制 `dropChance = 1`，其餘（含小兵）沿用 LUCK 門檻機率，避免陣容全滅時多重保底掉落

## 5. 一般戰鬥：波次與敵人數上限確認

- [x] 5.1 確認 `rollWaveCount`/`rollEnemyCount`（`server/constants/difficulty.ts`）已透過 `Math.min(2, WAVE_COUNT_MAX)`/`Math.min(3, ENEMY_COUNT_MAX)` 結構性限制在 1~2 / 1~3，無需改動；沿用既有 `combat.test.ts`/`difficulty.ts` 覆蓋

## 5a. 前端：首頁章節/關卡進度顯示

- [x] 5a.1 `getCharacterResponseSchema`（`shared/schemas/api/character.schema.ts`）新增 `currentLevelIndex`/`chapterTotalLevels`；同步修正 `app/composables/useCharacter.ts` 的 `CharacterData` 介面（原本連既有的 `nextChapterIndex` 都沒宣告，屬於既有型別缺口，一併補上）
- [x] 5a.2 `app/components/game/characterStage.vue` 在「開始/繼續冒險」按鈕上方新增小字 `character-stage__level-progress`，顯示「第 {currentLevelIndex + 1}/{chapterTotalLevels} 關」，資料來源固定讀 `character.value`

## 6. 測試

- [x] 6.1 重寫 `character.repository.test.ts` 的 `settleRunRewards` 測試群組：同章節內關卡推進、章節推進（含 `chapterAdvanced`）、DEAD/DISCONNECT 不異動、舊角色缺 `nextChapterIndex`／缺 `currentLevelIndex`+`chapterTotalLevels` 兩種 legacy 回填情境
- [x] 6.2 `adventure-run.service.test.ts`：更新既有「Stage boundary (Boss)」測試斷言新的 `enemyCountPerWave`（roll=0 預設對到 archetype0，1 Boss + 2 小兵 = 3）
- [x] 6.3 `combat.service.test.ts` 新增：Boss+小兵陣容全滅才判定勝利、Boss 保底掉落只算 Boss 本體不含小兵、可補位 Boss 觸發補位、不可補位 Boss 不觸發補位；`combat.test.ts` 新增 `bossMinionCount`/`canReinforce` 資料健全性檢查
- [x] 6.4 檢查 `event.service.ts`/`event.service.test.ts`，未發現任何「Boss 固定單體」假設，無需調整

## 7. 文件與驗證

- [x] 7.1 `npx vitest run`（117/117 通過）、`npx eslint --fix`（未新增任何 lint 錯誤，且修正了 `useCharacter.ts` 既有的 `nextChapterIndex` 型別缺口副作用地解掉一個既有 `nuxi typecheck` 錯誤）、`npx nuxi typecheck`（無新增型別錯誤）全數確認
- [ ] 7.2 Archive 本 change，將 delta spec 同步回 `openspec/specs/adventure-run-lifecycle/spec.md`、`openspec/specs/combat-engine/spec.md`（留給使用者確認後執行 `/opsx:archive`）
