## Context

`app/utils/enemyAvatar.ts` 目前用 `getEnemyAvatarUrl(faction, tier)` 組出 `/images/enemies/{faction}-{tier}.png`（`faction` 是整場 run 唯一值，`tier` 只分 normal/elite/boss），32 個 `EnemyArchetype`（`server/constants/templates/enemies.ts` 的 `ENEMY_ARCHETYPES`/`GKBOT_BOSS_ARCHETYPES`/`HUMAN_ARCHETYPES`/`HUMAN_BOSS_ARCHETYPES`）全部共用 6 張圖（2 faction × 3 tier）。

Archetype 身分目前只在伺服端以陣列位置（`archetypeIndex`）存在（`combat.service.ts` 的 `buildEnemyUnit`/`resolveWave`），且僅有 `EnemyPreview.archetypeIndex`（戰前預覽）傳到前端；`CombatResult.enemies`（戰鬥結果，含 `CombatSummary`）完全沒有 archetype 資訊。`archetypeIndex` 同時被頭目補兵邏輯（`bossArchetypes[bossUnit.archetypeIndex]`）使用，不能把它的語意跟「畫像查找 key」混用。

美術已用 `pixel-art-studio` 產出 4 張 archetype 專屬肖像（`gkbot-repair.png`／`gkbot-security-unit.png`／`gkbot-runaway-hauler.png`／`gkbot-scrap-pile.png`），對應 GKBOT 小兵 8 種中的 4 種；其餘 28 種尚無圖，需要 fallback 機制銜接美術產出的時間差。

## Goals / Non-Goals

**Goals:**
- 每個 `EnemyArchetype` 有一個穩定、與陣列順序無關的 `slug`，做為畫像檔名依據，且未來新增/調整 archetype 順序不會讓已上線的圖檔跟錯 archetype。
- 前端兩個顯示敵人的地方（戰前預覽、戰鬥結果）都能取得 archetype slug，並依「archetype 專屬圖優先、faction+tier 圖 fallback」的規則解析頭像，美術未覆蓋的 archetype 不會破圖。
- API contract（`CombatResult`/`EnemyPreview` 的 Zod schema 與 OpenAPI 文件）與新增欄位保持同步。

**Non-Goals:**
- 不在本 change 產出剩餘 28 張 archetype 美術（後續任務）。
- 不改變 tier（NORMAL/ELITE/STRONG_ELITE/BOSS）的數值倍率或戰鬥邏輯。
- 不讓 archetype 頭像依 tier 再細分（不做「同一 archetype 的 elite 版/boss 版另一張圖」）——tier 差異維持由現有 UI 上的 tier 標籤/樣式呈現。
- 不變動 `archetypeIndex` 既有語意或頭目補兵邏輯。

## Decisions

**D1. 用獨立 `slug: string` 欄位，不用陣列 index 或中文 `name` 當畫像 key。**
Index 會隨陣列增刪而漂移（例如未來在 `ENEMY_ARCHETYPES` 中間插入新 archetype，後面所有 index 全部位移，已上線圖檔會全部對錯人）；中文 `name` 可能重複調整措辭、且不適合直接當檔名。獨立 kebab-case slug（如 `gkbot-repair`）兩者都不受影響，也直接沿用美術目前已經在用的命名慣例。
- 替代方案：用 `archetypeIndex` 直接查表——放棄，因為順序耦合風險太高，且是本次要解決的問題本身（目前系統已經是靠位置/巧合對應）。

**D2. Slug 只在伺服端資料（`EnemyArchetype`）定義一次，經 API 傳給前端，前端不重新推導。**
`EnemyPreview.archetypeSlug` 與 `CombatResult.enemies[].archetypeSlug` 都直接複製自伺服端 `EnemyArchetype.slug`，前端 `enemyAvatar.ts` 只負責「slug → 檔名路徑」與「找不到專屬圖時 fallback」，不做任何 slug 命名邏輯。避免前後端各自維護一份 archetype→slug 對照表而失準。

**D3. 頭像解析改成兩段式：`archetypeSlug` 優先，`faction+tier` fallback。**
前端無法在 runtime 便宜地探測圖檔是否存在（`<img>` 404 沒有優雅的內建 fallback）。改用一份**靜態白名單**（明確列出目前有專屬美術的 slug 集合，如本次的 4 個）決定要不要組 archetype 路徑；不在白名單內的 archetype 直接組現有的 `faction-tier` 路徑，不嘗試對專屬路徑發請求後再 fallback。
- 替代方案：`<img @error>` 換源——放棄，會有一次必然的 404 request，且此白名單本來就要跟「美術完成清單」同步維護，不如直接讀白名單決定。
- 白名單維護方式：`app/utils/enemyAvatar.ts` 內一個 `Set<string>`（或等價常數），新增一張美術時同步加一行；不依賴 build-time 掃描 `public/images/enemies/` 目錄（Nuxt SPA + Vercel 靜態資源沒有現成的 build-time manifest 機制，掃描屬於超出本 change 範圍的基礎建設）。

**D4. `EnemyPreview.archetypeSlug` 必填；`CombatResult.enemies[].archetypeSlug`（`combatSummarySchema.enemies[]`）在 Zod schema 層做 optional，但新產生的資料一律會帶上。**
`EnemyPreview` 是即時運算、不落地儲存的資料，必填沒有相容性負擔。但 `combatSummarySchema` 是 `run.lastCombatSummary` 的 Firestore 儲存格式（`shared/schemas/firestore/adventure.schema.ts`，`.strict()`），這次 change 上線前已存在的歷史 `lastCombatSummary` 不會有 `archetypeSlug`——若欄位設必填，任何讀到舊資料的地方（例如 `getCurrentAdventureResponseSchema` 回傳仍在進行中、且剛好停在戰鬥剛結束狀態的 run）在 response 驗證時會直接噴錯。因此 schema 端設為 `z.string().optional()`；伺服端組裝新的 `CombatResult`/`CombatSummary` 時一律填入真實 slug，前端頭像解析把「`archetypeSlug` 缺失」與「slug 不在美術白名單」同等看待，兩者都 fallback 回 `{faction}-{tier}.png`（沿用 D3 的機制，不用另外分支處理）。
- 替代方案：寫一次性 migration script 幫歷史 `lastCombatSummary` 補 `archetypeSlug`——放棄，歷史戰鬥結果的 archetype 身分已經遺失（舊資料沒存 archetypeIndex），無法回填，且 `lastCombatSummary` 只是「上一場戰鬥」的暫時展示資料，過時後對玩家沒有留存價值，不值得為此加遷移腳本。

## Risks / Trade-offs

- **[Risk] `combatSummarySchema` 是 `.strict()` 且驗證 Firestore 落地資料，新增必填欄位會讓舊有 `lastCombatSummary` 讀取時驗證失敗** → 依 D4，該欄位在 schema 層設為 optional，新資料一律填值、舊資料留空由前端 fallback 處理，避免上線當下讓進行中的 run 出現 500。
- **[Risk] API response 新增欄位屬於 API contract 變動** → Zod schema／OpenAPI／前端型別需同一個 PR 內一起改完，並確認沒有其他消費端（目前只有本專案前端消費這兩個 API）依賴嚴格欄位白名單校驗。
- **[Risk] 白名單（D3）需要人工同步，忘記加會讓新美術悄悄不生效（仍顯示 faction+tier 圖，但不會破圖）** → 屬於「安全失敗」（fail-safe，不會 404），可接受；tasks.md 會把「補圖時記得同步白名單」列成明確步驟，降低遺漏機率。
- **[Trade-off] slug 需要人工為 32 個 archetype 各自命名一次** → 一次性成本，且命名可直接沿用美術/設計文件既有的中文名稱轉寫慣例（本次 4 個已建立先例）。

## Open Questions

- 無（範圍已在 proposal 階段與使用者確認：本 change 只交付機制與 fallback，不含剩餘 28 張美術）。
