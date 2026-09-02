## Context

冒險運行狀態的唯一來源是 `app/composables/useAdventureRun.ts`（module-level singleton），已暴露 `currentNodeType`/`severityTier`/`factionType`/`advance()`，本次改版不需要新的狀態來源，只需在既有欄位上做視覺呈現的映射。戰鬥演出目前完全寫在 `app/components/game/combatResultPanel.vue` 內：靠 `combatLog`（`{ actorId, targetId, action: 'ATTACK'|'CRIT'|'DODGE'|'DEATH', damage?, targetHpRemaining? }`）算出一條絕對時間軸，用 `setTimeout` 逐筆觸發 `sparkFx`/`cardFx` 兩組 `Map<unitId, {value,key}>` 狀態，搭配 CSS `@keyframes` + `:key` remount 重播動畫。角色/敵人皆無現成 avatar 資產：玩家有 `public/images/archetypes/{name}.png` + `{name}-breathe-{1,2,3}.png`（576×576、`image-rendering: pixelated`），敵人完全沒有圖，`EnemyPreview` 也沒有 sprite 欄位。

## Goals / Non-Goals

**Goals:**
- 在不改動任何 API/schema 的前提下，讓冒險頁面與戰鬥演出更有場景感與回饋感
- 建立可重用的美術資產命名慣例（背景／背面圖／敵人 avatar），供 implement 階段用 pixel-art-studio 逐一產出
- 把 `combatResultPanel.vue` 的演出邏輯抽成 `useCombat`，讓後續新增的飄字/avatar 狀態有清楚歸屬，不繼續讓單一元件肥大
- 移除已停用職業的 template 與相容查表邏輯，收斂 `character-roster`/`character-archetype-abilities` 的既定行為

**Non-Goals:**
- 不新增 `EnemyPreview`/`CombatSummary` 等任何 API 回應 schema 欄位（敵人 avatar 純前端 lookup）
- 不做「每個敵人專屬 sprite」（33+ 種敵人逐一畫圖美術量過大，只做 faction×tier 共用圖）
- 不補齊 4 個已停用職業的背面圖或任何美術（直接移除，不延續相容顯示）
- 不引入新的動畫函式庫（沿用既有手刻 `@keyframes` + JS `setTimeout`/`rAF` 排程模式）

## Decisions

### 1. 敵人 avatar：前端 `faction × tier` lookup，不加 schema 欄位
`CombatSummary.enemies: EnemyPreview[]` 目前只有 `enemyId`/`name`/`description`/`hp`/`isBoss`，沒有 faction/tier 欄位本身回傳；但 run 層級的 `factionType: EnemyFaction`（`useAdventureRun.ts`）已可用，`isBoss` 也已存在於 `EnemyPreview`。tier 判斷規則：`isBoss ? 'boss' : (由 currentNodeType 是否為 ELITE/STRONG_ELITE 決定 'elite'，否則 'normal')`。前端建一個 `getEnemyAvatarUrl(factionType, tier)` 純函式，對應到 `public/images/enemies/{faction}-{tier}.png`（如 `gkbot-normal.png`、`gkbot-elite.png`、`gkbot-boss.png`、`human-normal.png`...），共 6 張起跳。
- **替代方案考慮**：在 `EnemyPreview` 加 `spriteUrl` 欄位，由後端決定圖檔 — 否決，因為這會讓美術資產路徑成為 API contract 的一部分，日後改圖檔命名或加細分類都要動 schema/server，且此資訊完全可由前端已有的 `factionType`/`isBoss`/`currentNodeType` 推導，不需要跨層耦合。

### 2. `useCombat` composable 的邊界
新增 `app/composables/useCombat.ts`，職責：接收 `combatLog` + 參戰單位清單，內部管理：
- 時間軸排程（原本 `combatResultPanel.vue` 內算絕對時間戳、`setTimeout` 觸發的邏輯）
- 三組演出狀態：`sparkFx`（命中/爆擊 spark 疊圖）、`cardFx`（攻擊 lunge / 閃避 sidestep 卡片動畫）、`damageTextFx`（新增：傷害數字/「閃避」文字飄字，同樣是 `Map<unitId, {value,key}>` + `setTimeout` 清除的既有 pattern）
- 對外只回傳唯讀 ref/computed 給元件渲染用，不持有任何 DOM 操作
`combatResultPanel.vue` 改為純渲染層：從 `useCombat` 取狀態綁 class/文字，不再自己管理計時器。
- **替代方案考慮**：維持現狀、只在 `combatResultPanel.vue` 內加第三個 `damageTextFx` map — 否決，因為 item 4（走路動畫接續戰鬗前的位移）未來若要與戰鬥演出時間軸銜接，邏輯留在元件內會讓 `advance()` 與 combat 演出的耦合更難梳理；現在抽出成本較低。

### 3. 背景/背面圖/敵人 avatar 的命名慣例
沿用現有 `public/images/archetypes/{name}.png` 慣例，新增：
- `public/images/archetypes/{name}-back.png`（僅 5 個現行職業，576×576、`image-rendering: pixelated`，比照正面圖無呼吸動畫幀，走路動畫另用獨立幀）
- `public/images/backgrounds/{severityTier}.png`（`DEEP_WRECK`/`PARTIAL_ACTIVE`/`HIGHLY_ACTIVE` 三張起跳；若特定 `currentNodeType`（如 BOSS）需要專屬背景，用 `{severityTier}-{nodeType}.png` 覆蓋，找不到覆蓋檔則 fallback 到 `{severityTier}.png`）
- `public/images/enemies/{factionType}-{tier}.png`（`gkbot`/`human` × `normal`/`elite`/`boss`）
走路動畫幀命名比照呼吸動畫模式：`{name}-back-walk-{1,2,3}.png`，由新的 `useWalkFrame` composable（結構比照既有 `useIdleBreathingFrame.ts`）驅動，僅在 `advance()` 呼叫期間啟用。

### 4. 已停用職業移除範圍
`server/constants/templates/characterArchetypes.ts` 直接刪除 4 筆 `isSelectable: false` 的 template（`barbarian`/`rogue`/`paladin`/`wanderer`），移除檔案頂部「Retired archetypes stay here...」註解（不再適用）。`character-roster`、`character-archetype-abilities` 兩份 spec 的既有「已停用職業」Requirement/Scenario 隨之移除（delta spec 見 `specs/`）。不做 Firestore 既有角色資料的遷移或防呆 — 使用者已確認可接受既有角色若命中這 4 個 archetypeId 會查表失敗。

## Risks / Trade-offs

- **[風險]** 若 Firestore 仍有角色使用這 4 個已停用 archetypeId，其角色頁 className/spriteUrl 查表會失敗、畫面可能顯示異常 → **緩解**：使用者已明確接受此風險並確認免查證；如未來發現此問題，屬於獨立 bug 而非本次 change 範圍
- **[風險]** 敵人 avatar 只有 6 張（faction×tier），同 tier 內不同敵人視覺上無法區分（例如「維修型 GkBot」與「保全機具」共用同一張 normal 圖）→ **緩解**：本次以「識別陣營/威脅等級」為目標而非「識別個別敵人」，個別敵人辨識仍靠既有的名稱文字卡；後續如需求提高可用同一組命名慣例逐步加細分類，不影響本次架構
- **[風險]** `useCombat` 抽出後，`combatResultPanel.vue` 與新 composable 的介面若設計不當，可能需要同時改兩邊才能修一個演出細節 → **緩解**：composable 只回傳渲染用的唯讀狀態，時間軸/清除邏輯完全內聚，元件端只做「讀狀態渲染」，降低雙邊修改機率
- **[Trade-off]** 走路動畫依賴背景與背面圖都完成才有意義，若美術產出進度不同步，Phase F 可能被迫延後 → 已在 tasks 分批順序中反映（先做無新美術的 Phase A/B，最後做依賴最多的走路動畫）

## Migration Plan

無資料庫 migration。部署步驟：
1. 先上 Phase A/B（HP/行動條位置、傷害飄字/閃避文字、`useCombat` 抽出）— 純前端邏輯與既有測試不受影響即可上線
2. 美術資產就緒後依序上 Phase C（敵人 avatar/panel）→ D（背景）→ E（背面圖）→ F（走路動畫，依賴 D+E）
3. 已停用職業移除（template + spec 更新）可與 Phase A/B 同批上線，屬獨立變更、不依賴美術資產
- **Rollback**：純前端展示變更，任一 Phase 有問題可直接 revert 對應 commit，不涉及資料格式回滾

## Open Questions

無（美術資產的實際圖檔規格已於 tasks 階段留待 implement 時用 pixel-art-studio 產出，非設計層待決問題）
