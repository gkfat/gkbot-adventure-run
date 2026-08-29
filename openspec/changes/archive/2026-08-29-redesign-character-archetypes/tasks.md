## 1. 職業定義

- [x] 1.1 `server/constants/characterArchetypes.ts`：`CharacterArchetype` 型別新增 `isSelectable: boolean` 欄位
- [x] 1.2 新增 5 個新職業定義（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`），attributes 依 design.md 換算表設定，`isSelectable: true`
- [x] 1.3 既有 4 個舊職業定義（`barbarian`/`rogue`/`paladin`/`wanderer`）加上 `isSelectable: false`，保留其餘欄位不變
- [x] 1.4 確認 `getArchetypeById()` 邏輯不需修改（對所有 archetypeId 皆可查得定義）

## 2. 職業特殊機制資料結構

- [x] 2.1 新增 `server/constants/archetypeAbilities.ts`：定義 `ArchetypeAbilityTrigger` 列舉與 `ArchetypeAbility` 型別
- [x] 2.2 新增 5 筆 `ArchetypeAbility` 靜態資料（對應 5 個新職業，`trigger`/`name`/`description`，不含數值常數）；`description` 文案依 `docs/worldview.md` 的敘事原則撰寫（GK 宇宙/裂域可公開明講，機械化真相僅限暗示，尤其 Tinkerer）
- [x] 2.3 新增 `getArchetypeAbilityByArchetypeId()` 查表函式，查無資料時回傳 `undefined`

## 3. 美術資源

- [x] 3.1 新增 5 張新職業美術資源至 `public/images/archetypes/`（`fighter.png`/`adventurer.png`/`scholar.png`/`tinkerer.png`/`gambler.png`）：用 `pixel-art-gen` skill 手繪 JSON 座標產生，504×612（28×34 網格）、透明背景，沿用既有 4 張圖的「動作人偶半身像」風格（黑色描邊分段、正面半身、頭/軀幹/腿分區浮空）。細化至每個職業有獨立的臉型/髮型/身形/配色，不共用同一套版型：
  - 戰士：方形寬下顎、短刺蝟頭+頭帶、寬肩壯碩、緊咬牙關表情、紅色調
  - 冒險家：圓臉、頭巾包髮、中等運動體態、雙肩背包肩帶+口袋、微笑表情、綠色調
  - 學者：窄臉削肩、旁分整齊短髮、黑框眼鏡、毛衣背心+衣領 V 字、深藍色調
  - 工匠：寬臉粗眉、額頭護目鏡、厚實方正身形、吊帶工作服+胸前口袋、咧嘴笑、卡其/金色調
  - 投機者：削肩窄身、油頭旁分、西裝翻領+領帶、瞇眼式挑眉，深灰/酒紅色調
- [x] 3.2 確認舊 4 張職業圖片（`barbarian.png`/`rogue.png`/`paladin.png`/`wanderer.png`）維持不變、不刪除

## 4. API 行為調整

- [x] 4.1 `server/services/character.service.ts`：`GET /api/character/roster` 的 `archetypes` 回傳過濾為 `isSelectable: true`（改用 `SELECTABLE_CHARACTER_ARCHETYPES`）
- [x] 4.2 `POST /api/character` 建立角色時，驗證 `archetypeId` 必須是 `isSelectable: true` 的職業，否則回傳 400
- [x] 4.3 確認既有角色查詢（`GET /api/character/:characterId`）、屬性點分配等端點不受影響（archetypeId 為舊職業時仍正常運作，`getArchetypeById()` 未過濾 isSelectable）

## 5. 規格同步

- [ ] 5.1 `openspec/specs/character-roster/spec.md` 依本 change 的 delta spec 套用 MODIFIED Requirements —**留待 `/opsx:archive`**：delta spec 合併回主 specs 是 archive 階段的職責，本次 apply 不手動合併以避免與 archive 的自動合併衝突
- [ ] 5.2 新增 `openspec/specs/character-archetype-abilities/spec.md` —**留待 `/opsx:archive`**（同上）

## 6. 前端

- [x] 6.1 角色建立畫面（選職業流程）改用新的 `archetypes` 回傳資料渲染（5 筆）：`app/components/game/archetypeGallery.vue` 的 `ARCHETYPE_BLURB` 已改為 5 個新職業，卡片渲染邏輯本身沿用 API 回傳資料、無需改動
- [ ] 6.2 若有職業特色說明 UI 需求，串接 `archetypeAbilities.ts` 的 `name`/`description`（維持原註記：非本 change 必要項，留待後續 UI 需求明確時再做）

## 7. 測試與驗證

- [x] 7.1 單元測試：5 個新職業 attributes 總和皆為 8，且每維度 >= 1（`server/constants/characterArchetypes.test.ts`）
- [x] 7.2 單元測試：`POST /api/character` 對已停用職業回傳 400（`server/services/character.service.test.ts`）
- [x] 7.3 單元測試：`GET /api/character/roster` 的 `archetypes` 只回傳 5 筆可選職業（`server/services/character.service.test.ts`）
- [ ] 7.4 手動驗證：既有舊職業角色（若測試環境有資料）查詢、顯示 className/sprite、計算 stats 皆正常 —**未執行**：需要連接實際 Firestore 測試環境，本次 apply 未做手動驗證
- [x] 7.5 `vitest` 全數通過（19/19）；`nuxi typecheck` 無新增錯誤（既有的 `systemBtn.vue`/`useApi.ts` 型別錯誤與本次改動無關，為既有技術債）
