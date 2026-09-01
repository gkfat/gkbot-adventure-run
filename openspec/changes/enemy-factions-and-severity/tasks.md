## 0. 前置依賴

- [x] 0.1 確認 `single-stage-run-settlement` 已實作完成（已歸檔）：一個 run＝一個 Stage，`chapterIndex` 為角色跨 run 的持久進度欄位，本 change 只需要在 `createRun` 骰一次分級/陣營，不涉及章節內多 Stage 邊界推進

## 1. 型別與常數

- [x] 1.1 `shared/types/adventure.ts`：新增 `FacilitySeverity`（`'DEEP_WRECK'|'PARTIAL_ACTIVE'|'HIGHLY_ACTIVE'`）、`EnemyFaction`（`'GKBOT'|'HUMAN'`）型別；`AdventureRun` 新增 `severityTier`/`factionType`；`Enemy` 型別新增 `faction: EnemyFaction`
- [x] 1.2 `shared/types/adventure.ts` 新增 `SEVERITY_CONFIG`（依 `chapterIndex` 動態遞增的分級機率公式、`SEVERITY_STAT_MULTIPLIER`、`SEVERITY_WAVE_ENEMY_MULTIPLIER`、`HUMAN_FACTION_CHANCE`，見 design.md 決策 2）
- [x] 1.3 `server/constants/combat.ts`：`EnemyArchetype` 型別新增可選的 `critChanceOverride`/`dodgeChanceOverride`；`ENEMY_ARCHETYPES` 擴充為 8 隻 GkBot 小兵；新增 `GKBOT_BOSS_ARCHETYPES`（8 隻）、`HUMAN_ARCHETYPES`（8 隻小兵）、`HUMAN_BOSS_ARCHETYPES`（8 隻頭目），數值比照 design.md 決策 6 的表格
- [x] 1.4 `shared/schemas/firestore/adventure.schema.ts`：`adventureRunSchema` 新增 `severityTier`/`factionType` 對應的 zod schema

## 2. 遠征分級/陣營決策

- [x] 2.1 `server/repositories/adventure-run.repository.ts`：`createRun` 用尚未寫入的 `seed` 透過 `random(seed, N)` 決定性算出 `severityTier`（依 `SEVERITY_CONFIG` 的動態機率公式，輸入為呼叫端傳入的 `chapterIndex`）與 `factionType`（依 `HUMAN_FACTION_CHANCE[severityTier]`），與現行 `stageNodeCount` 的算法風格一致
- [x] 2.2 讀取既有 run 文件時，對 `severityTier`/`factionType` 兩個新欄位容錯預設 `PARTIAL_ACTIVE`/`GKBOT`（見 design.md Migration Plan）

## 3. 戰鬥引擎（陣營與分級套用）

- [x] 3.1 `server/services/combat.service.ts`：敵人範本選用依 `run.factionType` 切換清單；一般戰鬥節點從 `ENEMY_ARCHETYPES`/`HUMAN_ARCHETYPES` 抽取，BOSS 節點從 `GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES` 抽取
- [x] 3.2 `server/services/combat.service.ts`：BOSS 節點呼叫 `getStatMultipliers` 時改傳入 `'NORMAL'` tier（不再傳 `'BOSS'`），避免頭目自身高數值再疊加 BOSS tier 倍率；`expForKill`/`blessingPointsForVictory`/`maxDropRarity` 等獎勵倍率維持傳入 `'BOSS'` tier 不變（純獎勵計算，不影響戰鬥數值）
- [x] 3.3 `server/constants/difficulty.ts` 或呼叫端：`getStatMultipliers` 結果乘以 `SEVERITY_STAT_MULTIPLIER[severityTier]`
- [x] 3.4 `server/constants/difficulty.ts` 或呼叫端：`getWave2Chance`/`getEnemy2Chance`/`getEnemy3Chance` 結果乘以 `SEVERITY_WAVE_ENEMY_MULTIPLIER[severityTier]`，並 clamp 在既有 `WAVE_2_CAP`/`ENEMY_2_CAP`/`ENEMY_3_CAP` 上限內
- [x] 3.5 `server/services/combat.service.ts`：爆擊/閃避判定改為優先讀取敵人範本的 `critChanceOverride`/`dodgeChanceOverride`，未填寫則回退 `ENEMY_COMBAT_STATS`

## 4. 前端

- [x] 4.1 `app/composables/useAdventureRun.ts`：`AdventureRunView` 型別新增 `severityTier`/`factionType`
- [x] 4.2 `app/pages/adventure.vue`：run 開始（`stageNodeIndex === 0`）時顯示分級/陣營提示文案（固定文案表，依 `severityTier`/`factionType` 對應）

## 5. 測試與驗證

- [x] 5.1 分級/陣營 roll 單元測試：不同 `chapterIndex` 下 `severityTier` 分布符合動態機率公式（多次抽樣統計檢驗，且驗證機率有上限、不會變成必然結果）；`HIGHLY_ACTIVE` 分級下 `HUMAN` 機率高於其他分級，`DEEP_WRECK` 下 `HUMAN` 機率仍大於 0
- [x] 5.2 敵人範本選用單元測試：`factionType=HUMAN` 時一般戰鬥從 `HUMAN_ARCHETYPES`、Boss 從 `HUMAN_BOSS_ARCHETYPES` 抽取；`factionType=GKBOT` 對應抽取 `ENEMY_ARCHETYPES`/`GKBOT_BOSS_ARCHETYPES`
- [x] 5.3 頭目數值不重複疊加測試：驗證 Boss 節點呼叫 `getStatMultipliers` 使用 `'NORMAL'` tier，且頭目清單抽出的敵人最終數值等於「頭目 base 值 × NORMAL tier 縮放 × severity 倍率」，不含 `BOSS` tier 倍率
- [x] 5.4 分級數值調整單元測試：相同 step/tier 下，`HIGHLY_ACTIVE` 的敵人數量機率與 hp/atk/def 皆不低於 `DEEP_WRECK`；`PARTIAL_ACTIVE` 與既有曲線一致
- [x] 5.5 LUK 覆寫單元測試：設有 `critChanceOverride`/`dodgeChanceOverride` 的範本使用覆寫值判定；未設定的範本回退全域 `ENEMY_COMBAT_STATS`
- [x] 5.6 既有回歸測試（`adventure-run.service.test.ts`／`combat.service.test.ts`／`difficulty.test.ts`／`combat.test.ts`）維持全綠
- [ ] 5.7 手動驗證（瀏覽器）：以不同角色（不同 `chapterIndex`）連續開啟多趟新 run，觀察分級/陣營提示文案與實際遭遇的敵人範本（GkBot vs 人類/合成人、小兵 vs 頭目）一致
