## 1. 資料模型

- [x] 1.1 `shared/schemas/firestore/character.schema.ts`：新增 `accountId`（必填字串）、`archetypeId`（必填字串，4 個範本 id 或 `"legacy"`）、`className`（必填字串）欄位
- [x] 1.2 `shared/types/character.ts`：同步新增對應型別欄位；新增 `CharacterSummary` 型別（roster 列表用，含 characterId/nickname/level/archetypeId/className/spriteUrl）（移除未使用的 `CreateCharacterInput`）
- [x] 1.3 新增 `server/constants/characterArchetypes.ts`：定義 4 個範本（`barbarian`/`rogue`/`paladin`/`wanderer`）的 `archetypeId`/`className`/`attributes`（STR/AGI/CON/LUCK 總和固定 8）/`spriteUrl`
- [x] 1.4 `firestore.indexes.json`：`listByAccountId` 只對 `accountId` 做單欄位相等查詢，Firestore 自動建立單欄位索引，不需要額外複合索引，維持檔案不變

## 2. Repository 層

- [x] 2.1 `server/repositories/character.repository.ts`：`createCharacter` 改為使用 Firestore 自動 ID（不再以 accountId 當文件 ID），寫入 `accountId`/`archetypeId`/`className`，並依 `characterArchetypes.ts` 套用初始屬性（重新命名為 `createCharacterFromArchetype`）
- [x] 2.2 新增 `listByAccountId(accountId)`：`where('accountId','==',accountId)` 查詢該帳號所有角色
- [x] 2.3 `listByAccountId` 內處理既有單一角色相容性：查無任何 `accountId` 相符文件時，改讀 `characters/{accountId}`（舊格式路徑），若存在則補寫 `accountId`（=文件 ID）、`archetypeId: 'legacy'`、`className: '冒險者'`（若 `nickname` 已存在則不動，沒有才用舊的 `玩家{accountId 後 6 碼大寫}` 規則補值），寫回同一份文件後併入結果
- [x] 2.4 新增 `getByIdForAccount(characterId, accountId)`：取得角色並驗證 `accountId` 相符，不符或不存在皆回傳 null（供 API 層轉 404 使用）
- [x] 2.5 `updateAttributes`/`updateNickname` 改為以 `characterId`（Firestore 自動 ID 或既有 legacy 文件 ID）為主鍵，介面不變

## 3. Service 層

- [x] 3.1 `server/services/character.service.ts`：新增 `getRoster(accountId)`（回傳 `CharacterSummary[]` + 4 個範本定義）、`createCharacterFromArchetype(accountId, archetypeId)`（roster 已滿 3 則丟 400；archetypeId 不合法則丟 400）
- [x] 3.2 `getCharacterWithStats`/`allocateAttributes`/`setNickname` 改為吃 `(accountId, characterId, ...)`，內部呼叫 `getByIdForAccount` 驗證擁有權，不符則丟 `NotFoundError`（對應 404）
- [x] 3.3 `server/services/account.service.ts`：`createOrGetAccount` 移除自動建立角色的邏輯（帳號建立後角色數為 0）；同步移除/調整 `deleteAccountCascade` 中對單一角色文件的刪除邏輯，改為刪除該帳號 `listByAccountId` 查到的所有角色（連帶調整 `server/api/auth/login.post.ts`、`shared/schemas/api/auth.schema.ts` 的 `loginResponseSchema`，移除已不存在的 `characterId`/`level` 回應欄位）

## 4. API

- [x] 4.1 新增 `server/api/character/roster.get.ts`（呼叫 `getRoster`）
- [x] 4.2 新增 `server/api/character/index.post.ts`（驗證 `{ archetypeId }`，呼叫 `createCharacterFromArchetype`）
- [x] 4.3 `server/api/character/index.get.ts` 改為 `server/api/character/[characterId]/index.get.ts`
- [x] 4.4 `server/api/character/attributes.post.ts` 改為 `server/api/character/[characterId]/attributes.post.ts`
- [x] 4.5 `server/api/character/nickname.post.ts` 改為 `server/api/character/[characterId]/nickname.post.ts`
- [x] 4.6 `shared/schemas/api/character.schema.ts`：新增 roster 回應 schema、建立角色請求/回應 schema；既有回應 schema 補上 `archetypeId`/`className`

## 5. 美術素材

- [x] 5.1 用 `/pixel-art-gen` 產生 4 張角色範本圖（`barbarian`/`rogue`/`paladin`/`wanderer`），風格延續 `public/images/hero-sprite.png`（sage green/lavender/brick 描邊色票），存於 `public/images/archetypes/<archetypeId>.png`

## 6. 前端：角色狀態管理

- [x] 6.1 `app/composables/useCharacter.ts` 改造（或新增 `useCharacterRoster.ts`）：管理 `roster`（角色清單+範本）、`selectedCharacterId`（存 `localStorage`，依 `accountId` 分 namespace）、`fetchRoster()`、`selectCharacter(id)`、`createCharacter(archetypeId)`；既有 `character`（目前選定角色完整資料）以 `selectedCharacterId` 驅動 `GET /api/character/:characterId`（額外新增 `spriteUrl` 欄位供角色圖顯示，`server/services/character.service.ts`/`shared/schemas/api/character.schema.ts` 同步補上此欄位）
- [x] 6.2 `app/components/game/resourceBar.vue`、`characterStage.vue`、`accountDrawer.vue` 內對 `character` 的讀取改為走新的 composable 介面（欄位形狀不變，僅資料來源改變）：`resourceBar.vue`/`accountDrawer.vue` 讀取欄位不變，無需改動；`characterStage.vue` 改用 `character.spriteUrl`（不再寫死 `hero-sprite.png`）並顯示 `className`

## 7. 前端：角色選擇 / 建立流程

- [x] 7.1 `app/pages/main.vue`：進入遊戲畫面前，若 `selectedCharacterId` 為空或 roster 尚未載入，改顯示角色列表畫面；roster 為空則直接進入建立流程（另補上：登出時呼叫 `useCharacter().reset()` 清空 roster/選定角色狀態，避免下次登入其他帳號時殘留舊資料）
- [x] 7.2 新增角色列表元件（`app/components/game/characterRoster.vue`）：列出帳號現有角色（sprite 縮圖+職業名稱+等級+暱稱），點擊選擇後寫入 `selectedCharacterId` 並進入遊戲畫面；含「新建角色」入口（roster 未滿 3 才顯示/可點）
- [x] 7.3 新增角色範本選擇元件（`app/components/game/archetypeGallery.vue`）：以「像素畫框」樣式呈現 4 個範本（sprite + 職業名稱 + STR/AGI/CON/LUCK 簡易長條圖），點選後呼叫建立 API，成功後自動選定新角色進入遊戲畫面

## 8. 文件與驗證

- [x] 8.1 於 `server/utils/openapi.ts` 註冊 `roster`/建立角色/重構後的 3 個既有路徑（含 `characterId` path param）
- [x] 8.2 執行 `pnpm nuxt typecheck`（本 change 涉及的程式碼全數通過；剩餘 2 個錯誤是既有前端問題 `systemBtn.vue`/`useApi.ts`，與本 change 無關）
- [x] 8.3 手動驗證（本次已完成的部分）：本機 dev server 確認 `roster`/建立角色/`GET /api/character/:id` 三條端點皆已註冊於 `/api/openapi.json`、未帶 token 時皆正確回傳 401；用假資料在瀏覽器驗證角色列表（sprite/職業/等級/暱稱）、新建角色像素畫框（4 個範本、STR/AGI/CON/LUCK 長條圖、返回列表）UI 皆正確渲染與互動，過程中發現並修正一個 CSS bug（Vuetify `.v-btn` 內建 `flex:1 0 auto` 在直接作為 flex-column 子元素時會被撐開满版，修法是加上 `flex-grow-0`，`characterRoster.vue`/`archetypeGallery.vue`/`main.vue` 皆已修正）。**尚待使用者用真實帳號登入補測**：既有帳號（已有舊格式角色）呼叫 roster API 後是否正確補值並出現在清單、可正常查詢/分配點數/改暱稱；新帳號依序建立至上限 3 個角色、第 4 個是否被拒絕；操作他人 characterId 是否回 404

## 9. 追加：navdrawer 切換角色入口

- [x] 9.1 `app/components/game/accountDrawer.vue`：帳號資訊與登出按鈕之間新增「切換角色」項目（僅在已選定角色時顯示），點擊呼叫 `useCharacter().clearSelection()` 並關閉 drawer，`main.vue` 依 `selectedCharacterId` 自動改回角色列表畫面；`pnpm nuxt typecheck` 通過，瀏覽器驗證無角色時正確隱藏、無 console 錯誤

## 10. 追加：全站按鈕像素化互動 + navdrawer/主畫面顯示調整

- [x] 10.1 `app/assets/css/index.scss`：新增全站共用 `.pixel-btn`（實體 CTA，帶底部立體邊，hover 半按/click 全按）與 `.pixel-press`（純位移回饋，供 icon/列表列按鈕使用）；`.pixel-btn` 用重複類別選擇器 `.pixel-btn.pixel-btn` 蓋過 Vuetify `v-btn` 內建的 `.rounded-lg`
- [x] 10.2 `SystemBtn.vue`：移除舊有 `v-hover` + `scale(95%)` hover 效果，改套用 `.pixel-btn`（涵蓋登入/登出/重試/新建角色/確認/返回角色列表等全部 SystemBtn 用法）
- [x] 10.3 純 `<button>` 元素統一套用 `.pixel-press` 或等效位移邏輯：`gameHeader.vue` 設定 icon、`bottomNav.vue` 四個導覽項、`accountDrawer.vue` 切換角色列、`characterRoster.vue` 角色列表列；`archetypeGallery.vue` 的職業卡片/左右切換鈕改用自有的位移+outline 動畫（與 carousel 位移邏輯共存）
- [x] 10.4 `accountDrawer.vue`：帳號小卡不再顯示角色等級（LV），改僅顯示角色暱稱（作為遊戲內「使用者名稱」）
- [x] 10.5 `characterStage.vue`（主畫面）：移除角色暱稱顯示，改為完整角色卡：職業、等級、HP 條、EXP 條（`shared/types/character.ts` 的 `EXP_TABLE`，滿級顯示「已滿等」）、STR/AGI/CON/LUCK 目前屬性、可分配屬性點數（>0 時以 warning 色標示）、戰鬥數值（ATK/DEF/攻速/爆擊/閃避）
- [x] 10.6 `login.vue`：標題/副標題加 `text-wrap` 修正手機窄螢幕文字被截斷（Vuetify `v-card-title`/`v-card-subtitle` 預設 `text-overflow:ellipsis`）；移除「登入即表示您同意服務條款與隱私權政策」文字
- [x] 10.7 `archetypeGallery.vue` 重構為 carousel：中間卡片較大且綠色外框標示選中，左右卡片縮小並依距離漸淡 opacity；點卡片只切換選取（不再直接建立角色），下方新增說明框（職業名稱、簡短說明、STR/AGI/CON/LUCK 長條圖）與「確認」按鈕才真正呼叫建立角色 API；說明框左右各一個切換鈕（循環切換，不受版面圖卡數量限制）
- [x] 10.8 `pnpm nuxt typecheck` 通過（無新增錯誤）；瀏覽器以假資料驗證按鈕小圓角/立體邊/hover半按（`box-shadow` 由 `0 3px` 變 `0 2px`）、carousel 左右切換與確認流程、login 頁文字換行正常

## 11. 追加：carousel 無限循環 + 角色列表顯示資源 + 主畫面資訊框排版

- [x] 11.1 `archetypeGallery.vue`：新增 `cyclicDiff()`，把卡片位置差值折算到 `(-total/2, total/2]`，讓 carousel 從最後一張切回第一張（或反向）時走最短路徑平滑過渡，而不是跳到畫面外再彈回來
- [x] 11.2 角色列表列不顯示暱稱，改顯示該角色的金幣/寶石（`server/services/character.service.ts` 的 `getRoster`、`shared/schemas/api/character.schema.ts` 的 `characterSummarySchema`、`shared/types/character.ts` 的 `CharacterSummary`、`app/composables/useCharacter.ts` 皆補上 `gold`/`gems` 欄位；`characterRoster.vue` 改用與 `resourceBar.vue` 一致的金幣/寶石 icon 呈現）
- [x] 11.3 `characterStage.vue`（主畫面）重新排版：職業/等級/EXP/HP 收進同一個框（`__box`）；屬性與戰鬥數值改為同一個框內左右兩欄（`__cols` + `__col`/`__col--divided`，各佔一半寬），不再上下堆疊
- [x] 11.4 `pnpm nuxt typecheck` 通過（無新增錯誤）；瀏覽器以假資料驗證 carousel 首尾平滑循環、角色列表金幣/寶石正確顯示、主畫面雙框排版正確

## 12. 追加：主畫面精修

- [x] 12.1 `characterStage.vue`：屬性/戰鬥數值每個項目改為 label 與 value 左右橫排（`__stat` 由直排 `flex-column` 改成 `justify-content:space-between` 的橫排），`__grid` 對應改為單欄直向排列
- [x] 12.2 `characterStage.vue`：整體縮減間距與 sprite 尺寸（sprite 140→100px、外層 `pa-4`→`pa-3`、區塊間 `mt-3`→`mt-2`、box `padding` 14/12→10px、`__grid` `row-gap` 8→5px）避免內容超出視窗高度需要 scroll；`pnpm nuxt typecheck` 通過，瀏覽器縮小視窗高度驗證整頁（header+資源列+雙框+bottom nav）可一次顯示完畢
