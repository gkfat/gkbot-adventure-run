## Why

`docs/worldview.md` 第 3 節「設施風險分級與敵對陣營」已定案世界觀：設施的毀損/運作程度決定敵人數量與強度，且部分設施會被人類/合成人佔領、以人類陣營小兵與頭目取代 GkBot。目前的戰鬥引擎（`combat-engine`）與章節結構（`adventure-stage-progression`）完全沒有落實這件事——所有敵人一律是同一份 `ENEMY_ARCHETYPES`（GkBot 風味），也沒有任何「這個設施比較危險/比較安全」的機制反映到數值上。這次要把世界觀定案的分級與陣營落成實際的資料與生成規則。

## What Changes

- 新增「設施風險分級」：每個章節（Chapter）開始時，以決定性 RNG 決定該章節的 `severityTier`（`DEEP_WRECK` / `PARTIAL_ACTIVE` / `HIGHLY_ACTIVE`，對應 `docs/worldview.md` 3.1 節的三級光譜），影響該章節內敵人的數量機率（wave/enemy count）與數值倍率
- 新增「敵對陣營」：每個章節開始時，依 `severityTier` 加權決定該章節的 `factionType`（`GKBOT` / `HUMAN`），`severityTier` 越高（越接近運作中），`HUMAN` 出現機率越高（呼應 worldview「整批人類武裝勢力佔領最常發生在高度運作分級」）
- 新增人類/合成人敵人範本（`HUMAN_ARCHETYPES`）：掠奪者、私兵、潛伏合成人等一般敵人，以及對應的 Boss 範本（佔領軍指揮官等）
- 修改敵人生成邏輯（`combat.service.ts`）：依章節的 `factionType` 選用 `ENEMY_ARCHETYPES`（GkBot）或 `HUMAN_ARCHETYPES`（人類/合成人）；依 `severityTier` 調整 wave/enemy count 機率與 hp/atk/def 倍率
- 修改冒險畫面：章節開始（進入新章節第一個節點）時顯示簡短的分級/陣營提示文案（例如「警戒森嚴：偵測到大量敵對武裝」），沿用既有 EVENT 式的一次性提示呈現方式，不新增互動流程

## Capabilities

### Modified Capabilities
- `adventure-run-lifecycle`：章節開始時新增 `severityTier`/`factionType` 的決定性 RNG 決策
- `combat-engine`：敵人生成依陣營選用不同範本清單；hp/atk/def 倍率與 wave/enemy count 機率疊加 `severityTier` 調整

## Impact

- `shared/types/adventure.ts`：新增 `FacilitySeverity`、`EnemyFaction` 型別；`AdventureRun` 新增 `chapterSeverityTier`/`chapterFactionType`；`Enemy` 型別新增 `faction` 欄位
- `shared/types/adventure.ts` 新增 `SEVERITY_CONFIG`（severity 權重、severity 對應的 wave/enemy/stat 調整倍率、faction 權重）
- `server/constants/combat.ts`：新增 `HUMAN_ARCHETYPES`（一般 + boss 範本）；既有 `ENEMY_ARCHETYPES` 重新標註哪些可作為 Boss 範本
- `server/services/adventure-run.service.ts`：章節開始（依賴 `adventure-stage-progression` 的章節邊界推進點）時 roll `chapterSeverityTier`/`chapterFactionType`
- `server/services/combat.service.ts`：敵人範本選用與 hp/atk/def 倍率、wave/enemy count 機率依 `severityTier`/`factionType` 調整
- `server/repositories/adventure-run.repository.ts`：`createRun` 初始化第一個章節的 `chapterSeverityTier`/`chapterFactionType`
- `app/pages/adventure.vue`：新章節開始時顯示分級/陣營提示文案
- **依賴 `adventure-stage-progression`**（章節/關卡結構、`chapterIndex` 等欄位）已實作完成——本 change 只能在其之後套用，若尚未實作需先完成該 change
