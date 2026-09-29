## 1. Pixel Art

- [x] 1.1 用 `pixel-art-studio` skill 產出「技能經驗值晶片」圖示，輸出至 `public/images/pixel-icons/skillExpChip.png`（16x16，比照既有 icon 命名慣例，icon key 為 `skillExpChip`）

## 2. Shared 型別與常數

- [x] 2.1 `shared/types/item.ts`：`ItemType` 新增 `MATERIAL`
- [x] 2.2 `shared/types/character.ts`：`SkillProgress` 新增 `star: number`
- [x] 2.3 `shared/constants/skills.ts`：新增 `SKILL_STAR_MAX = 5`、`SKILL_STAR_UP_FRAGMENT_COST: Record<number, number>`（`{2:50,3:200,4:450,5:800}`）、`SKILL_EXP_PER_CHIP = 50`、`SKILL_EXP_CHIP_DROP_AMOUNT = 1`；移除 `FRAGMENT_TO_EXP_RATE`；`SKILL_FRAGMENT_DROP_AMOUNT` 改為 `1`
- [x] 2.4 `shared/constants/characterSkills.ts`：新增 `ALL_CHARACTER_SKILLS: readonly CharacterSkill[]`（攤平 `CHARACTER_SKILLS` 全部職業技能），新增 `applyStarBonus(effect: SkillEffect, star: number): SkillEffect` 與 `applyStarBonusToChargeSec(chargeSec: number, star: number): number` 輔助函式
- [x] 2.5 `shared/schemas/firestore/character.schema.ts`：`skillProgressSchema` 新增 `star`（`.min(1).max(5)`），為相容舊資料設為 optional 並在讀取層 self-heal（不在 schema 層預設，交由 repository/service 顯式補值，比照既有 legacy character 慣例）
- [x] 2.6 `shared/schemas/api/character-skill.schema.ts`：`SkillEntry` 新增 `star`；新增 `starUpSkillRequestSchema`（`{ skillId }`）、`useSkillExpChipRequestSchema`（`{ skillId, itemIds: string[] }`）；移除 `strengthenSkillRequestSchema`
- [x] 2.7 `shared/schemas/api/shop.schema.ts` / `shared/types/shop.ts`：`ShopItem`/`type` 新增 `'SKILL_EXP_CHIP'` 變體（固定販售 1 顆 `skill_exp_chip` item instance）

## 3. 新道具模板

- [x] 3.1 在 `server/constants/templates/items.ts` 新增 `skill_exp_chip` 道具模板（`type: MATERIAL`，`rarityWeights` 固定只有 N 有權重，確保恆定單一稀有度）；`index.ts` 已用 `export * from './items'` 匯出，無需額外改動
- [x] 3.2 `server/services/item.service.ts`：確認 `rollStats` 對沒有 `baseStatsRange`/`healPercentRange` 的模板（即 `MATERIAL`）已自然落入既有「空 pool → 回傳 `{}`」路徑，`deriveInstanceWeight` 也因缺少 `template.weight` 自然回傳 `undefined`——不需新增分支，行為已符合「不含任何數值欄位」的需求

## 4. Character Skill Service

- [x] 4.1 `character-skill.service.ts`：`getSkillsView` 改用 `ALL_CHARACTER_SKILLS`，移除依 `character.archetypeId` 的過濾；讀取 `unlockedSkills[skillId]` 時對缺少 `star` 的紀錄 self-heal 為 `star: 1`；回傳的 `effect` 套用 `applyStarBonus`
- [x] 4.2 `unlockSkill`：改用 `requireKnownSkill`（只驗證 skillId 存在於 `ALL_CHARACTER_SKILLS`，不比對 archetype）；建立 `unlockedSkills[skillId]` 時帶上 `star: 1`
- [x] 4.3 移除 `strengthenSkill` 方法
- [x] 4.4 新增 `starUpSkill(accountId, characterId, skillId)`：驗證 `level === SKILL_MAX_LEVEL`、`star < SKILL_STAR_MAX`、碎片足夠 `SKILL_STAR_UP_FRAGMENT_COST[star+1]`；扣碎片、`star += 1`、`level = 1`、`exp = 0`
- [x] 4.5 新增 `useSkillExpChip(accountId, characterId, skillId, itemIds)`：於一個 transaction 內驗證每個 `itemId` 屬於該角色背包且 `templateId === 'skill_exp_chip'`，全部驗證通過後才刪除背包參照與 `items/{itemId}` 文件、並為 `unlockedSkills[skillId]` 累加 `itemIds.length × SKILL_EXP_PER_CHIP` exp、套用升級判定
- [x] 4.6 `equipSkill`/`recordSkillExpGained`：`equipSkill` 不需改動；`recordSkillExpGained` self-heal 讀取進度時一併補上 `star`

## 5. API 路由

- [x] 5.1 新增 `server/api/character/[characterId]/skills/star-up.post.ts`（沿用既有 skills 路由的 auth/驗證/回應慣例）
- [x] 5.2 新增 `server/api/character/[characterId]/skills/use-exp-chip.post.ts`
- [x] 5.3 移除 `server/api/character/[characterId]/skills/strengthen.post.ts`
- [x] 5.4 `server/utils/openapi.ts`：註冊新端點的 schema、移除已刪除端點的註冊

## 6. 掉落與商店

- [x] 6.1 `combat.service.ts`：技能碎片掉落池改用 `ALL_CHARACTER_SKILLS`（移除 `computeRewards` 不再需要的 `archetypeId` 參數）；新增技能經驗值晶片的獨立 LUCK-gated 掉落判定，直接把 `skill_exp_chip` 道具實體推入 `itemsDropped`（沿用既有裝備掉落的同一路徑）
- [x] 6.2 `shop.service.ts`：新增 `SKILL_EXP_CHIP_SHOP_SLOTS` 常數（3 個 GOLD 格 @50、1 個 GEMS 格 @4），`generateShopItems` 一併生成（`item` 於生成時就 roll 好，比照一般 ITEM 分支）；技能碎片池改用 `ALL_CHARACTER_SKILLS`；`purchaseItem` 既有的非 SKILL_FRAGMENT 分支已能處理 SKILL_EXP_CHIP（同樣是 `item` 欄位），另加一個 guard 讓 `SKILL_EXP_CHIP` 忽略 `destination=EQUIP`；`getOrGenerateShop`/`generateShopItems` 移除不再需要的 `archetypeId` 參數

## 7. 前端

- [x] 7.1 `useCharacterSkills.ts`：新增 `starUpSkill`/`useSkillExpChip` composable 方法；移除 `strengthenSkill` 呼叫
- [x] 7.2 `skillGrid.vue`：已解鎖技能格顯示「★星等 Lv.等級」；`canProgress` 改為星等/升星門檻判斷（原本就沒有職業過濾邏輯，`skills` prop 本就是通用清單）
- [x] 7.3 `skillDialog.vue`：新增星等顯示、Lv.10 時的升星操作區塊（顯示所需碎片數/目前持有）、技能經驗值晶片庫存與使用操作區塊（複用 `useInventory` 已載入的背包資料篩 `templateId === 'skill_exp_chip'`）；移除舊的「消耗碎片強化」UI
- [x] 7.4 商店頁（`shop.vue`）新增「技能經驗值晶片」tier，直接複用既有 `GameCommonShopItemSlot`／`GameCommonShopPurchaseDialog`（晶片是一般 ItemInstance，不需要仿照 `skillFragmentPurchaseDialog.vue` 另建專屬卡片/dialog）
- [x] 7.5 `inventory.vue`「道具」tab 篩選邏輯改為涵蓋 `POTION`/`MATERIAL`；`useInventory.ts` 的 `InventoryItem.type` 型別加入 `'MATERIAL'`
- [x] 7.6（使用者追加）`skillGrid.vue`：星等改為卡片外框左上角的獨立徽章（比照 `pixel-slot__rarity` 的懸掛式底色標籤樣式，非原本與 Lv 並列的行內文字），未取得碎片且未解鎖的技能格不顯示
- [x] 7.7（使用者追加）`archetypeGallery.vue`（選角頁）移除「可獲得技能」預覽區塊——技能已改為全角色通用，不再是「這個職業能練出哪些技能」的職業特色，選角當下顯示已無意義

## 8. 文件同步

- [x] 8.1 檢查 `docs/game-design/mechanics/characters.md`/`progression.md`：兩份文件皆未描述「角色技能與職業綁定」（技能系統不在這兩份文件範圍內，只涵蓋天賦樹/初始配備），故無需修改
- [ ] 8.2 確認 `openspec/specs/character-skills`、`shop`、`item-generation`、`inventory`、`combat-engine` 於 `opsx:apply`/`opsx:archive` 流程中正確合併本次 delta

## 9. 測試與驗證

- [x] 9.1 `server/services/character-skill.service.test.ts`：補齊 `starUpSkill`/`useSkillExpChip`/跨職業解鎖/星等加成計算的測試案例；移除 `strengthenSkill` 相關測試（25 tests all pass）
- [x] 9.2 `server/services/combat.service.test.ts`：新增技能碎片跨全技能池、技能經驗值晶片獨立掉落的測試（53 tests all pass）
- [x] 9.3 `server/services/shop.service.test.ts`：新增技能經驗值晶片商品生成測試，更新技能碎片測試不再限定職業（16 tests all pass）
- [x] 9.4 `pnpm lint`（新增/修改檔案皆無新增錯誤，既有 lint 錯誤與本次變更無關）、`pnpm test`（458/458 全過）、`pnpm build`（成功，新路由 star-up/use-exp-chip 正確產出、strengthen 路由已移除）
