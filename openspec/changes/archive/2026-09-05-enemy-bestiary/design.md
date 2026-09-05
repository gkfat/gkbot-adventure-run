## Context

`app/components/game/accountDrawer.vue` 是專案中唯一的 `v-navigation-drawer`，目前只有「切換角色」「登出」兩個 `SystemBtn`。敵人資料以靜態陣列 `EnemyArchetype[]`（`server/constants/templates/enemies.ts`，共 32 筆，含 `slug`/`name`/`description`）定義，頭像解析邏輯已存在於 `app/utils/enemyAvatar.ts`（`getEnemyPortraitUrl`/`ARCHETYPES_WITH_PORTRAIT`）。目前沒有任何機制記錄「玩家看過哪些敵人」，也沒有現成的剪影/未解鎖遮罩樣式可重用。

## Goals / Non-Goals

**Goals:**
- 讓玩家可從 nav drawer 開啟滿版圖鑑 dialog，瀏覽全部 32 種敵人 archetype。
- 已遇過的敵人顯示真實頭像/名稱/描述；未遇過的以外形輪廓剪影遮罩呈現，不洩漏實際圖像與文字內容。
- 「已遇過」狀態需可靠地反映玩家實際戰鬥經歷，且跨裝置/跨 session 持久化（存 Firestore，而非僅存前端）。

**Non-Goals:**
- 「遇過」（`encounteredArchetypeSlugs`）與「擊敗」（`defeatedArchetypeCounts`）為兩組獨立紀錄：前者只要進入戰鬥、生成該 archetype 即成立，不要求擊殺/存活；後者則是純粹的累積擊殺計數器，供圖鑑顯示參考，不影響「遇過」判定或資料揭露規則（決策 3 仍以 `encountered` 為唯一揭露開關）。
- 不做圖鑑成就/獎勵系統（例如全圖鑑解鎖獎勵、擊殺數里程碑獎勵），純瀏覽功能。
- 不重新設計敵人美術資源；剪影遮罩以 CSS 處理（例如對現有頭像圖套用全黑輪廓濾鏡），不需新增遮罩美術檔案。

## Decisions

### 1. 「已遇過」的記錄時機與位置
在 `CombatService` 產生敵人（戰鬥開始，第一波敵人生成時）寫入 `archetypeSlug` 到角色的 `encounteredArchetypeSlugs`，而非等到戰鬥結束/勝利才記錄。
- **理由**：玩家在戰前預覽（`EnemyPreview`，已含 `archetypeSlug`）就已經看到敵人樣貌與名稱，「遇過」語意上應對齊「看到過」而非「打贏過」；且戰鬥可能中途角色死亡，仍應計入已遇過。
- **替代方案**：僅在戰鬥結束（`combatSummary`/`lastCombatSummary`）時批次寫入 — 被否決，因為玩家死亡時不會產生完整 summary，會漏記錄。

### 2. 資料儲存位置
於 `characterSchema`（`shared/schemas/firestore/character.schema.ts`）新增 `encounteredArchetypeSlugs: z.array(z.string()).default([])`，掛在角色文件上（而非帳號層級）。
- **理由**：圖鑑進度依附單一角色的遊戲進度較符合現有「每個角色獨立進度」的架構慣例（等級/裝備/章節進度皆掛在角色上）。
- **替代方案**：掛在帳號層級（跨角色共用）— 與現有資料模型不一致，暫不採用；若未來需求變更可再調整。

### 3. API 揭露規則
新增 `GET /api/character/:characterId/bestiary`，回傳全部 32 筆 archetype，每筆帶 `slug`/`encountered: boolean`；`encountered === true` 才附上 `name`/`description`/`portraitUrl`，否則這些欄位省略或回傳 `null`。
- **理由**：遵循 security.md「不可信任前端驗證」原則 — 若後端把完整內容都回傳、只讓前端用 CSS 遮住，玩家可直接讀 API response 或 devtools 看穿未解鎖敵人的名稱/描述，違背「看不出實際圖像」的產品需求。遮罩必須在伺服器端做資料揭露控制，不能只靠前端樣式。
- **替代方案**：前端一次拿到全部資料、自行依本地 `encounteredArchetypeSlugs` 決定顯示 — 被否決，因為會在 network tab 洩漏未解鎖內容。

### 4. 剪影遮罩呈現方式
前端對未遇過的敵人，不請求/顯示其頭像圖，改用固定的「未知」佔位圖示（例如統一的問號輪廓 SVG 或既有頭像套 `filter: brightness(0)` 的通用剪影樣式），名稱以「？？？」、描述以「尚未遭遇」等固定文案呈現。
- **理由**：呼應決策 3 — 後端本就不回傳未解鎖敵人的 `portraitUrl`，前端沒有圖可套遮罩效果，因此採用统一佔位圖示而非「拿到圖再加濾鏡」。
- **替代方案**：後端回傳圖片路徑、前端用 CSS 遮蓋 — 被否決（同決策 3 的理由，路徑本身可能暗示 slug/分類）。

### 5. Dialog 結構
新增 `GameBestiaryDialog`（`app/components/game/bestiaryDialog.vue`），沿用 `GameDialogFrame` 但加上 Vuetify `v-dialog` 的 `fullscreen` prop（`GameDialogFrame` 目前無此 prop，需新增可選 `fullscreen: boolean`，預設 `false`，不影響既有呼叫方）。內部維護一個 `selectedSlug`（預設第一筆 archetype 的 slug）本地 state 控制上半部顯示內容；下半部用 CSS grid（`grid-template-columns: repeat(5, 1fr)`，一列 5 個）搭配 `v-for` 渲染 32 個格子，可捲動。

### 6. 擊敗次數計數（`defeatedArchetypeCounts`）
於 `characterSchema` 新增 `defeatedArchetypeCounts: z.record(z.string(), z.number().int().min(0)).default({})`（slug -> 累積擊殺數），在 `CombatService.resolve()` 結算戰鬥時（沿用已收集的 `defeated: CombatUnit[]`），依 `archetypeSlug` 逐一累加寫回角色文件；圖鑑 API 的 `encountered === true` 項目額外附上 `defeatedCount`（無紀錄視為 `0`），前端於上半部大方框顯示「已擊敗 N 隻」。
- **理由**：玩家對「這隻敵人打過幾次」的好奇心是圖鑑類功能常見需求；`defeated` 陣列已經是戰鬥結算既有資料，重用不需新增戰鬥邏輯計算。此記錄與決策 1 的「遇過」判定完全獨立（見 Non-Goals），不影響現有揭露規則。
- **記錄時機**：與決策 1 相同的立場 —— 依「戰鬥中實際發生的擊殺」而非「整場戰鬥的勝負」認定，因此角色中途戰敗、但戰敗前已擊殺的敵人仍計入次數（`victory` 為 `false` 時 `computeRewards` 不會發放獎勵，但擊殺計數與獎勵發放是兩件事，不應该互相影響）。
- **替代方案**：只在 `victory === true` 時才累加擊殺數 — 被否決，因為戰敗前的擊殺是玩家實際達成的戰果，若因最終戰敗就不計入，會讓「已擊敗 N 隻」的數字失真（且與同一份 `defeated` 陣列既有的「已遇過」不看勝負的精神不一致）。

## Risks / Trade-offs

- [風險] 32 筆敵人一次全部由 API 回傳（即使多數欄位為 null），可能過度暴露「總共有幾種敵人/哪些 slug 已存在」的資訊 → **緩解**：這與現有 `enemy-portrait-resolution` spec 已公開 `archetypeSlug` 於戰鬥預覽的揭露程度一致，slug 本身不含劇情雷點，可接受；不回傳 name/description 已滿足主要需求。
- [風險] `CombatService` 每次戰鬥開始都寫入 Firestore（角色文件 update）可能增加寫入頻率 → **緩解**：僅在該 slug 尚未存在於陣列時才寫入（先查後判斷是否需要 update），多數重複遭遇不觸發寫入。
- [取捨] 「遇過」定義為「戰鬥開始時生成」而非「擊敗」，代表玩家看一眼戰前預覽或直接死亡也算解鎖圖鑑 — 此為刻意選擇（見決策 1），非缺陷。

## Migration Plan

- Firestore 既有角色文件無 `encounteredArchetypeSlugs`/`defeatedArchetypeCounts` 欄位；Zod schema 以 `.default([])`/`.default({})` 處理讀取時的向後相容，不需寫遷移腳本。
- 無需 feature flag；新增欄位與新 API 端點皆為 additive，不影響既有流程。

## Open Questions

（無）
