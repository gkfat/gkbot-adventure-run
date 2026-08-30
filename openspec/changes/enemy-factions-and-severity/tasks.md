## 0. 前置依賴

- [ ] 0.1 確認 `adventure-stage-progression` 已實作完成（`chapterIndex`/`chapterStageCount`/`stageIndexInChapter` 等欄位與章節邊界推進邏輯已存在），本 change 才能接續

## 1. 型別與常數

- [ ] 1.1 `shared/types/adventure.ts`：新增 `FacilitySeverity`（`'DEEP_WRECK'|'PARTIAL_ACTIVE'|'HIGHLY_ACTIVE'`）、`EnemyFaction`（`'GKBOT'|'HUMAN'`）型別；`AdventureRun` 新增 `chapterSeverityTier`/`chapterFactionType`；`Enemy` 型別新增 `faction: EnemyFaction`
- [ ] 1.2 `shared/types/adventure.ts` 新增 `SEVERITY_CONFIG`（`SEVERITY_WEIGHTS`/`SEVERITY_STAT_MULTIPLIER`/`SEVERITY_WAVE_ENEMY_BONUS`/`HUMAN_FACTION_CHANCE`，見 design.md）
- [ ] 1.3 `server/constants/combat.ts`：`EnemyArchetype` 型別新增 `bossCapable: boolean`；既有 `ENEMY_ARCHETYPES` 4 型全部補上 `bossCapable: true`；新增 `HUMAN_ARCHETYPES`（掠奪者民兵/裂域私兵/潛伏合成人/佔領軍指揮官，見 design.md）
- [ ] 1.4 `shared/schemas/firestore/adventure.schema.ts`：`adventureRunSchema` 新增 `chapterSeverityTier`/`chapterFactionType` 對應的 zod schema

## 2. 章節分級/陣營決策

- [ ] 2.1 `server/services/adventure-run.service.ts`：新章節開始時（沿用 `adventure-stage-progression` 的章節邊界推進點），以 `RngService` 依 `SEVERITY_WEIGHTS` 加權 roll `chapterSeverityTier`，再依 `HUMAN_FACTION_CHANCE[severityTier]` roll `chapterFactionType`
- [ ] 2.2 `server/repositories/adventure-run.repository.ts`：`createRun` 初始化第一個章節時一併 roll `chapterSeverityTier`/`chapterFactionType`
- [ ] 2.3 讀取既有 run 文件時，對這兩個新欄位容錯預設 `PARTIAL_ACTIVE`/`GKBOT`（見 design.md Migration Plan）

## 3. 戰鬥引擎（陣營與分級套用）

- [ ] 3.1 `server/services/combat.service.ts`：敵人範本選用依 `run.chapterFactionType` 切換 `ENEMY_ARCHETYPES`/`HUMAN_ARCHETYPES`；Boss 節點只從對應清單 `bossCapable=true` 的範本抽取
- [ ] 3.2 `server/constants/difficulty.ts` 或呼叫端：`getStatMultipliers` 結果套用 `SEVERITY_STAT_MULTIPLIER[severityTier]` 疊加倍率
- [ ] 3.3 `server/constants/difficulty.ts` 或呼叫端：`rollWaveCount`/`rollEnemyCount` 的機率輸入疊加 `SEVERITY_WAVE_ENEMY_BONUS[severityTier]`（clamp 於既有上限內）

## 4. 前端

- [ ] 4.1 `app/composables/useAdventureRun.ts`：`AdventureRunView` 型別新增 `chapterSeverityTier`/`chapterFactionType`
- [ ] 4.2 `app/pages/adventure.vue`：章節第一個節點（`stageIndexInChapter === 0 && stageNodeIndex === 0`）時顯示分級/陣營提示文案（固定文案表，依 `chapterSeverityTier`/`chapterFactionType` 對應）

## 5. 測試與驗證

- [ ] 5.1 分級/陣營 roll 單元測試：`severityTier`/`factionType` 分布符合設定權重（多次抽樣統計檢驗）；`HIGHLY_ACTIVE` 分級下 `HUMAN` 機率高於其他分級
- [ ] 5.2 敵人範本選用單元測試：`factionType=HUMAN` 時一般戰鬥與 Boss 皆只從 `HUMAN_ARCHETYPES` 抽取；`factionType=GKBOT` 維持既有 `ENEMY_ARCHETYPES`
- [ ] 5.3 分級數值調整單元測試：相同 step/tier 下，`HIGHLY_ACTIVE` 的敵人數量機率與 hp/atk/def 皆不低於 `DEEP_WRECK`；`PARTIAL_ACTIVE` 與既有曲線一致
- [ ] 5.4 既有回歸測試（`adventure-run.service.test.ts`／`combat.service.test.ts`／`difficulty.test.ts`）維持全綠
- [ ] 5.5 手動驗證（瀏覽器）：連續開啟多個新章節，觀察分級/陣營提示文案與實際遭遇的敵人範本（GkBot vs 人類/合成人）一致
