## 1. Firestore schema 與 API contract

- [x] 1.1 於 `shared/schemas/firestore/character.schema.ts` 新增 `encounteredArchetypeSlugs: z.array(z.string()).default([])`
- [x] 1.2 於 `shared/schemas/api/` 新增 `bestiary.schema.ts`：定義 `GET /api/character/:characterId/bestiary` 的回應 schema（每筆含 `slug`/`encountered`，`encountered` 為 `true` 時額外含 `name`/`description`/`portraitUrl`）
- [x] 1.3 於 `server/utils/openapi.ts` 註冊新增的 request/response schema

## 2. 遭遇記錄邏輯

- [x] 2.1 於 `server/services/combat.service.ts` 生成第一波敵人後，比對角色現有 `encounteredArchetypeSlugs`，將尚未存在的 `archetypeSlug` 併入並寫回角色文件（僅在有新增時才觸發 Firestore update）
- [x] 2.2 新增/擴充對應 service 測試（`server/services/combat.service.test.ts`）：驗證首次遭遇寫入、重複遭遇不重複寫入、戰鬥中途死亡仍寫入

## 3. 圖鑑查詢 API

- [x] 3.1 新增 `server/api/character/[characterId]/bestiary.get.ts`：`requireAuth` → 驗證角色屬於呼叫者 → 呼叫新的 `CharacterService`（或既有 service 的新方法）→ 依 1.2 schema 組裝回應（未遇過的項目省略 name/description/portraitUrl）
- [x] 3.2 新增對應 service/route 測試：涵蓋已遇過/未遇過的欄位揭露差異、查詢他人角色被拒絕

## 4. 前端頭像/遮罩工具

- [x] 4.1 於 `app/utils/enemyAvatar.ts` 新增取得「未知敵人」固定佔位圖示（或 CSS class）的工具函式，供圖鑑未遇過項目使用
- [x] 4.2 確認既有 `getEnemyPortraitUrl` 邏輯不受影響（僅新增，不修改既有行為）

## 5. GameDialogFrame fullscreen 支援

- [x] 5.1 於 `app/components/game/dialogFrame.vue` 新增可選 `fullscreen: boolean`（預設 `false`）prop，透傳給底層 `v-dialog`，不影響既有呼叫方預設行為

## 6. 圖鑑 Dialog 元件

- [x] 6.1 新增 `app/components/game/bestiaryDialog.vue`：使用 `GameDialogFrame :fullscreen="true"`，呼叫 3.1 的 API 取得敵人清單
- [x] 6.2 實作上半部大方框（頭像 + 名稱 + 描述），預設選取第一筆項目
- [x] 6.3 實作下半部一列 5 個的敵人格狀清單（可捲動），點擊格子切換上半部選取內容
- [x] 6.4 未遇過項目：格子與上半部皆顯示 4.1 的佔位圖示與固定文案（不顯示真實名稱/描述）
- [x] 6.5 dialog 最下方新增關閉按鈕

## 7. Nav Drawer 入口串接

- [x] 7.1 於 `app/components/game/accountDrawer.vue` 將既有「切換角色」`SystemBtn` 與新增的「圖鑑」`SystemBtn` 併入同一列（`v-row`），兩者皆 `cols="4"` 等寬並排；「圖鑑」按鈕點擊開啟 `GameBestiaryDialog`
- [x] 7.2 於掛載 `accountDrawer.vue` 的 layout（`app/layouts/game.vue`）視需要加入 `GameBestiaryDialog` 的顯示狀態管理

## 8. 驗證

- [x] 8.1 執行 `pnpm lint`
- [x] 8.2 執行 `pnpm test`
- [x] 8.3 執行 `pnpm build` 確認型別檢查通過
- [x] 8.4 手動於瀏覽器測試：開啟圖鑑、切換已遇過/未遇過敵人顯示、關閉 dialog、確認未遇過敵人的 API 回應不含 name/description

## 9. 擊敗次數計數

- [x] 9.1 於 `shared/schemas/firestore/character.schema.ts` 新增 `defeatedArchetypeCounts: z.record(z.string(), z.number().int().min(0)).default({})`；`shared/types/character.ts` 同步新增欄位
- [x] 9.2 於 `server/repositories/character.repository.ts` 新增 backfill 預設值、建立角色時的初始空物件，以及 `updateDefeatedArchetypeCounts` 寫入方法
- [x] 9.3 於 `server/services/character.service.ts` 新增 `recordDefeatedArchetypes`（合併累加擊敗次數，無擊敗時不觸發寫入），並在 `getBestiary` 回應中，`encountered` 為 `true` 的項目額外附上 `defeatedCount`
- [x] 9.4 於 `server/services/combat.service.ts` 戰鬥結算時（不論勝負）呼叫 `recordDefeatedArchetypes`，依 `defeated` 陣列逐一累加對應 `archetypeSlug`
- [x] 9.5 於 `shared/schemas/api/bestiary.schema.ts` 新增 `defeatedCount`（僅 `encountered` 為 `true` 時出現）
- [x] 9.6 於 `app/components/game/common/bestiaryDialog.vue` 上半部大方框顯示「已擊敗 N 隻」（僅 `encountered` 為 `true` 時顯示）
- [x] 9.7 新增/擴充測試：combat.service.test.ts（首次擊敗、同場擊敗多隻累加、戰敗仍計入）、character.service.test.ts（recordDefeatedArchetypes 合併邏輯、getBestiary 回傳 defeatedCount）
