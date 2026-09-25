## Context

現況（研究已於 proposal 前完成）：
- 章節結構為 Chapter → Level → Run（= 一個 Level/Stage）→ Node。每個 Run 的最後一個 node 固定是 `NodeType.BOSS`（`adventure-run.service.ts` `decideNextNode`）。
- 「這個 Level 是否為章節最後一關」目前只在戰鬥**結算後**於 `character.repository.ts`（`settleRunRewards`）判斷（比較 `character.currentLevelIndex + 1` 與 `character.chapterTotalLevels`），且只存在 `character` 文件上，`AdventureRun` 文件本身沒有 `chapterTotalLevels` 快照。
- Boss 數值計算分兩處各自呼叫 `getStatMultipliers(enemyLevel, 'NORMAL', severityTier)`：
  - 預覽：`adventure-run.service.ts` `buildBossNodeData`
  - 實際戰鬥：`combat.service.ts` `spawnWave`/`buildEnemyUnit`
  兩處需保持倍率一致，否則玩家在戰前預覽看到的血量會與實際戰鬥不符。
- 圖鑑 API（`GET /api/character/:characterId/bestiary`）目前回傳每個 archetype 的 `slug`/`encountered`/`name`/`description`/`portraitUrl`/`defeatedCount`，沒有位階（`EnemyTier`）欄位；`EnemyTier` 目前只存在 `difficulty.ts`，且是「戰鬥時動態計算」的概念（依 node type 決定），archetype 本身沒有固定的位階分類，但 boss archetype 清單（`GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES`）與一般 archetype 清單（`ENEMY_ARCHETYPES`/`HUMAN_ARCHETYPES`）是分開的靜態陣列，因此圖鑑可依「該 archetype 屬於哪個陣列」得出一個**靜態基礎位階標籤**（一般 mob 顯示「小兵」、boss 陣列顯示「Boss」）；菁英/強菁英是同一 archetype 在不同 node type 下的動態 tier，不屬於 archetype 固有屬性，圖鑑呈現時以此為前提設計。

## Goals / Non-Goals

**Goals:**
- 章節最後一關 boss 本體（不含 minion）數值提升為原本的 1.5 倍，且預覽與實際戰鬥一致。
- boss 節點畫面中 boss 圖像顯示尺寸為小兵圖像的 1.2 倍。
- 圖鑑呈現每個敵人 archetype 的位階標籤。

**Non-Goals:**
- 不調整章節內非最後一關 boss 的數值。
- 不調整 boss 隨從/minion 的數值或圖像尺寸。
- 不新增「菁英/強菁英」在圖鑑中的動態位階顯示（圖鑑呈現的是 archetype 固有的基礎位階：小兵 or Boss；菁英/強菁英屬於戰鬥時動態 tier，不在本次圖鑑欄位範圍內）。
- 不重新設計章節/關卡的整體結構。

## Decisions

1. **在 `AdventureRun` 文件快照 `chapterTotalLevels`**，比照現有 `levelIndex` 的做法，在 `startRun` 建立 run 時一併寫入（來源：`characterWithStats.chapterTotalLevels`）。
   - 替代方案：在 `buildBossNodeData` 時即時查詢 character 文件取得 `chapterTotalLevels`。
   - 選擇快照的理由：與現有 `levelIndex` 快照模式一致，避免額外一次 Firestore 讀取，且避免角色章節進度在同一場戰鬥期間被其他機制變更造成不一致。

2. **是否為章節最後一關以 `run.levelIndex + 1 >= run.chapterTotalLevels` 判斷**，計算後得出 `isChapterFinalBoss: boolean`，透過 `CombatContext` 從 `adventure-run.service.ts` 傳遞到 `combat.service.ts`，確保 `buildBossNodeData`（預覽）與 `spawnWave`（實際戰鬥）使用同一個 flag 來源（run 文件），而非各自重算。

3. **1.5 倍加成只套用於 boss 本體，不套用於 minion**：在 `bossMultipliers`（`getStatMultipliers(enemyLevel, 'NORMAL', severityTier)` 的回傳值）之後，若 `isChapterFinalBoss` 為真，額外將 `{hp, atk, def}` 各乘 1.5；`minionMultipliers` 不受影響。此加成以「乘在最終 multiplier 上」的方式實作（而非改動 `getStatMultipliers` 內部的 `BOSS` tier 常數），因為該函式目前的呼叫慣例是回傳一組 tier 對應的固定倍率，額外的「情境性加成」（如同現有 `severityMult` 的做法）更適合在取得基礎倍率後另外相乘，保持 `getStatMultipliers` 語意單純。

4. **圖像尺寸差異化為前端純展示邏輯**：在 boss 節點的敵人渲染元件中，依「是否為 boss 本體」（沿用既有 `isBoss` 欄位）套用 `transform: scale(1.2)` 或等效的尺寸樣式，不改動後端資料結構。

5. **圖鑑位階欄位**：圖鑑 API 回應新增 `tier` 欄位，值依該 archetype 來源陣列決定：`ENEMY_ARCHETYPES`/`HUMAN_ARCHETYPES` → `'NORMAL'`（小兵）、`GKBOT_BOSS_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES` → `'BOSS'`。此欄位在 `encountered: false` 時是否顯示（是否算「劇透」）待 tasks 階段依現有「未遇過遮罩」慣例決定（傾向不顯示，與 `name`/`description` 等欄位一致對待）。

## Risks / Trade-offs

- [Risk] `AdventureRun` schema 新增欄位可能影響既有已建立但尚未完成的 run 文件（缺少 `chapterTotalLevels`）→ Mitigation：欄位設為 optional 並在讀取端 fallback（例如缺欄位時視為非章節最後一關，避免誤判造成非預期加成）。
- [Risk] 前端 1.2 倍圖像縮放若未同步調整容器版面，可能造成 boss 圖像與 HP 條/行動條錯位 → Mitigation：實作時需人工於瀏覽器檢視 boss 節點畫面確認版面無破版（依 CLAUDE.md 要求，UI 變更需啟動 dev server 實際檢視）。
- [Risk] 圖鑑新增 `tier` 欄位若在 `encountered: false` 時仍回傳，可能洩漏敵人強度資訊、破壞既有「保留探索懸念」設計 → Mitigation：比照 `name`/`description`/`portraitUrl` 的既有規則，僅在 `encountered: true` 時回傳 `tier`。

## Migration Plan

- 無需資料遷移腳本：新欄位皆為 optional 或有明確 fallback，既有 Firestore 文件不需批次更新即可安全上線。
- 部署順序：後端（schema + 數值 + API）與前端（圖像樣式 + 圖鑑顯示）可視情況分開部署，因為新欄位皆為 additive、不破壞既有 API 契約。

## Open Questions

- 圖鑑「未遇過」的敵人是否需要顯示位階（例如遮罩狀態下仍顯示「???」但標示是 Boss 類）？目前設計傾向不顯示（與其他遮罩欄位一致），如有不同需求需於 tasks/spec 階段確認。
