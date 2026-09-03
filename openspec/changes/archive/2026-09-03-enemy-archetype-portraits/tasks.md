## 1. Archetype content data — 加上 slug

- [x] 1.1 在 `server/constants/templates/enemies.ts` 的 `EnemyArchetype` type 新增 `slug: string` 欄位
- [x] 1.2 為 `ENEMY_ARCHETYPES`（GKBOT 小兵 8 種）填入 slug：已有美術的 4 種沿用現有檔名（`gkbot-repair`／`gkbot-security-unit`／`gkbot-runaway-hauler`／`gkbot-scrap-pile`），其餘 4 種（產線機械臂／合成觀測員／幻影投影體／荷官型 GkBot）新命名
- [x] 1.3 為 `GKBOT_BOSS_ARCHETYPES`（GKBOT 頭目 8 種）填入 slug
- [x] 1.4 為 `HUMAN_ARCHETYPES`（HUMAN 小兵 8 種）填入 slug
- [x] 1.5 為 `HUMAN_BOSS_ARCHETYPES`（HUMAN 頭目 8 種）填入 slug
- [x] 1.6 寫一個 lint/test 層級的檢查（可放在既有 `characterArchetypes.test.ts` 旁的 `enemies.test.ts`，若不存在則新建）斷言全部 32 個 slug 為 kebab-case、非空、彼此不重複

## 2. 共用型別與 API schema

- [x] 2.1 `shared/types/adventure.ts`：`EnemyPreview` 新增必填 `archetypeSlug: string`；`CombatResult.enemies[]` 的元素型別新增 `archetypeSlug?: string`（optional，見 design.md D4）
- [x] 2.2 `shared/schemas/firestore/adventure.schema.ts`：`combatSummarySchema.enemies` 的物件 schema 新增 `archetypeSlug: z.string().optional()`
- [x] 2.3 `server/utils/openapi.ts`：確認/更新對應的 response schema 註冊，讓 `/api/openapi.json` 反映新欄位（`startCombatResponseSchema` 直接複用 `combatSummarySchema`，欄位自動反映，無需另外修改）
- [x] 2.4 若 `startCombatResponseSchema`（`shared/schemas/api/adventure.schema.ts`）或其他 API schema 有另外重複定義 enemies 欄位（而非直接複用 `combatSummarySchema`），一併同步（確認無重複定義；`EnemyPreview`/`nodeData` 本身無獨立 Zod schema，不涉及此變更）

## 3. 伺服端：組裝 archetypeSlug

- [x] 3.1 `server/services/combat.service.ts` 的 `buildEnemyUnit`：從 `archetype.slug` 帶出 `archetypeSlug`，寫入 `CombatUnit`
- [x] 3.2 `CombatUnit` → `CombatResult.enemies[]` 的轉換處，補上 `archetypeSlug`
- [x] 3.3 `server/services/adventure-run.service.ts` 建立 `firstWaveEnemies`（`EnemyPreview[]`）的兩處（一般節點、Boss 節點）：從對應 archetype 帶出 `archetypeSlug`
- [x] 3.4 確認 `disambiguateEnemyNames` 或其他後處理不會遺漏／覆蓋 `archetypeSlug`（`disambiguateEnemyNames` 用 `{...unit, name: ...}` spread，其餘欄位含 `archetypeSlug` 原樣保留，確認無遺漏）

## 4. 前端：頭像解析與白名單

- [x] 4.1 `app/utils/enemyAvatar.ts`：新增已有專屬美術的 archetype slug 白名單常數（目前 4 個：`gkbot-repair`／`gkbot-security-unit`／`gkbot-runaway-hauler`／`gkbot-scrap-pile`）
- [x] 4.2 新增 `getEnemyPortraitUrl(archetypeSlug: string | undefined, faction: EnemyFaction, tier: EnemyAvatarTier): string`：slug 在白名單則回傳 `/images/enemies/{slug}.png`，否則回傳既有 `getEnemyAvatarUrl(faction, tier)` 的結果
- [x] 4.3 `app/components/game/combatResultPanel.vue`：`enemyAvatarSrc` 改用 `getEnemyPortraitUrl`，傳入該筆敵人卡片的 `archetypeSlug`
- [x] 4.4 確認 `EnemyCardView`（`app/composables/useCombat.ts`）在組裝敵人卡片資料時，把 `archetypeSlug` 從 `CombatResult.enemies[]` 帶進 `EnemyCardView`
- [x] 4.5 `app/pages/adventure.vue` 的戰前遭遇預覽（`combatNodeData.firstWaveEnemies`）：在既有文字列表中加上 `getEnemyPortraitUrl` 頭像圖片

## 5. 測試

- [x] 5.1 `server/services/combat.service.test.ts`：新增/更新測試斷言 `CombatResult.enemies[].archetypeSlug` 對應正確的 archetype
- [x] 5.2 `server/services/character.service.test.ts` 或既有相關測試若有 snapshot 到 enemies 陣列形狀，一併更新（確認無 enemies 陣列 snapshot，無需變更）
- [x] 5.3 新增/更新 `app/utils/enemyAvatar.ts` 的單元測試（維持 repo 現況：vitest 只涵蓋 `server/**/*.test.ts`，不擴充前端測試範圍；`getEnemyPortraitUrl` 改以人工驗證 + `pnpm build` 型別檢查把關，見 task 6.3/6.4）

## 6. 驗證與收尾

- [x] 6.1 `pnpm lint`（本次變更觸及的檔案全數通過；repo 既有 144 個 lint error 分布在未觸及的檔案，屬既有問題，非本次變更引入）
- [x] 6.2 `pnpm test`（`server/**/*.test.ts`，20 files / 199 tests 全數通過）
- [x] 6.3 `pnpm build`（型別編譯通過，含 shared types 變動）
- [x] 6.4 手動於本機跑起遊戲，觸發一場已有專屬美術 archetype（如「保全機具」）與一場尚未有美術的 archetype 的戰鬥，確認前者顯示專屬頭像、後者 fallback 回 `{faction}-{tier}.png` 且無破圖（用瀏覽器操作使用者現有的 HUMAN 陣營 run，觸發「私兵護衛」戰鬥：戰前預覽與戰鬥結果頭像皆正確 fallback 回 `human-normal.png`、無破圖；另外發現既有 4 張美術的實際檔名帶 `gkbot-` 前綴、與 design.md 原假設不同，已與使用者確認後修正全部 slug／白名單／規劃文件為 `gkbot-repair`／`gkbot-security-unit`／`gkbot-runaway-hauler`／`gkbot-scrap-pile`；用獨立腳本複製 `getEnemyPortraitUrl` 邏輯驗證三種情境：專屬 slug 命中白名單、slug 不在白名單、slug 為 undefined，皆解析出正確路徑）
- [x] 6.5 更新 `docs/game-design/mechanics/content/enemies.md`：反映實際 archetype 數量（現況是 32 種，文件目前僅整理 4 種，已經過時，需在本次一併校正或至少加註）
