## 1. 型別與共用資料模型

- [x] 1.1 `shared/types/adventure.ts` 新增 `SkillEffectKind`（11 種）、`SkillEffect`、`CharacterSkill`、`EnemySkill` 型別，`CombatLogEntry.action` 新增 `'SKILL'`
- [x] 1.2 `shared/types/character.ts`（或對應檔案）新增 `Character` 文件的 `skillFragments: Record<string, number>`、`unlockedSkills: Record<string, { level: number; exp: number }>`、`equippedSkillIds: (string | null)[]` 欄位型別，既有讀取路徑補上 `?? {}`/`?? [null, null, null]` 預設值
- [x] 1.3 新增 `SKILL_EXP_TABLE`（Lv.1~10 exp 門檻常數）、`EXP_PER_SKILL_TRIGGER`、`FRAGMENT_TO_EXP_RATE`、`SKILL_FRAGMENT_DROP_AMOUNT` 等平衡數值常數（先取合理預設值，標記待 `docs/game-design/balance` 校準）— 落在 `shared/constants/skills.ts`

## 2. 技能靜態資料

- [x] 2.1 新增 `server/constants/templates/characterSkills.ts`：`CHARACTER_SKILLS: Record<archetypeId, CharacterSkill[]>`，為 `fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler` 各設計 2~3 個呼應敘事的技能（含 `effectByLevel` Lv.1~10 查表、`chargeSec`、`unlockFragmentCost`、`icon`），並在 `templates/index.ts` re-export
- [x] 2.2 為 1~2 個既有敵人 archetype（`server/constants/combat.ts` 或 `templates/enemies.ts`）挑選語意合適者，新增 `skill?: EnemySkill` 欄位，其餘 archetype 不動 — 用了 `assembly-overseer`（DAMAGE_AOE）與 `illusion-mage-unit`（DOT），兩者描述本就留了「未來技能」伏筆
- [x] 2.3 新增技能圖示資產（比照 `GameCommonPixelIcon` 既有慣例，或先以既有 icon 集合中語意相近者暫代）— Phase 1 先用既有 `PixelIconName`（sword/shield/potion 等）暫代，未新增美術資產

## 3. 角色技能服務層（`character-skills` capability）

- [x] 3.1 新增 `server/services/character-skill.service.ts`：查詢技能資料（`getSkillsView`，依規則過濾未取得碎片技能的細節欄位並附上 `unlockedSlotCount`）
- [x] 3.2 實作解鎖技能邏輯（碎片門檻驗證、扣除碎片、寫入 `unlockedSkills`）
- [x] 3.3 實作技能等級 exp 累加與自動升級邏輯（供 3.4 主動強化與 combat 結算共用）
- [x] 3.4 實作 `strengthen`（消耗碎片轉換 exp）邏輯，含碎片餘額驗證
- [x] 3.5 實作裝備/卸下技能邏輯（`unlockedSlotCount` 驗證、重複佩戴驗證）
- [x] 3.6 `shared/schemas/api/` 新增技能查詢/解鎖/強化/裝備的 request/response Zod schema — `character-skill.schema.ts`

## 4. 角色技能 API 路由

- [x] 4.1 `server/api/character/[characterId]/skills/index.get.ts`：`GET /api/character/:characterId/skills`（採用 `skills/index.get.ts`，與既有 `shop/index.get.ts` 巢狀慣例一致，而非扁平的 `skills.get.ts`）
- [x] 4.2 `server/api/character/[characterId]/skills/unlock.post.ts`
- [x] 4.3 `server/api/character/[characterId]/skills/strengthen.post.ts`
- [x] 4.4 `server/api/character/[characterId]/skills/equip.post.ts`
- [x] 4.5 在 `server/utils/openapi.ts` 註冊上述端點的 schema

## 5. 戰鬥引擎整合

- [x] 5.1 `CombatUnit`（`server/services/combat.service.ts`）新增 `chargingSkills`/`statusEffects` 內部狀態，戰鬥開始時依角色 `equippedSkillIds`（已解鎖）/敵人 `EnemyArchetype.skill` 初始化 — 另新增 `dotEffects`/`shieldHp` 輔助欄位（見 design.md 決策 7/SHIELD 實作）
- [x] 5.2 擴充 discrete-event schedule：合併比較 `nextAttackAt` 與 `chargingSkills[].readyAt`，決定下一個事件並分派至既有 `performAttack` 或新增的技能結算分支
- [x] 5.3 實作傷害類效果結算（`DAMAGE_SINGLE`/`DAMAGE_AOE`/`DAMAGE_SPLASH`/`DOT`），重用既有 `computeDamage`/crit/dodge 判定
- [x] 5.4 實作狀態類效果結算（`FREEZE`/`HASTE_SELF`/`HEAL_SELF`/`DEFENSE_UP`/`CRIT_UP`/`ARMOR_BREAK`/`SHIELD`），含 `statusEffects` 到期清除邏輯（時間到期用 `expiresAt`，與既有武器被動的攻擊次數到期並存）
- [x] 5.5 技能觸發時寫入 `SKILL` `CombatLogEntry`（含 `skillId`/`skillName`，沿用 `damage`/`targetHpRemaining` 表達結果）— 同步更新 `shared/schemas/api/adventure.schema.ts` 的 `combatLog.action` enum，並在 `app/utils/combatLogDisplay.ts` 補上 SKILL 文案
- [x] 5.6 Boss 小兵補位時，新加入單位的技能充能計時器從加入時間點開始初始化（銜接既有補位邏輯）
- [x] 5.7 `resolve()` 結算流程新增：依本場戰鬥技能觸發次數累加對應 `unlockedSkills[skillId].exp` 並套用升級判定，與既有 `weaponProficiency` 更新同一批次寫入 — 實作於 `CharacterSkillService.recordSkillExpGained`
- [x] 5.8 `resolve()` 掉落流程新增：戰鬥勝利時依既有 LUCK 掉落機率判定技能碎片掉落，命中時隨機挑選角色職業技能之一並增加固定數量碎片 — 實作於 `computeRewards` + `CharacterSkillService.grantFragments`
- [x] 5.9 `server/services/combat.service.test.ts` 新增測試：技能充能觸發、傷害類/狀態類效果結算、技能 exp 累積、技能碎片掉落，並確認既有無技能敵人範本的測試案例行為不變 — 新增 4 個測試，全部 372 個既有+新增測試通過

## 6. 商店整合

- [x] 6.1 `server/services/shop.service.ts` 每日商店生成邏輯新增 `SKILL_FRAGMENT` 商品型態（依角色 `archetypeId` 隨機挑選 `skillId`，固定 `fragmentAmount`/`price`/`currency` 數值表）— 1 個 GOLD + 1 個 GEMS 技能碎片格；`ShopItem` 型別（`shared/types/shop.ts`）新增 `type`/`skillId`/`fragmentAmount`，`item` 改為可選
- [x] 6.2 購買流程分支：`type = 'SKILL_FRAGMENT'` 時直接增加 `skillFragments[skillId]`，略過永久背包/裝備槽位與容量檢查
- [x] 6.3 `shared/schemas/api/shop.ts`（或對應檔案）更新商品/購買 schema 涵蓋新商品型態 — `shared/schemas/firestore/shop.schema.ts` 的 `shopItemSchema` 與 `shared/schemas/api/shop.schema.ts` 的 `purchaseItemResponseSchema` 皆已更新
- [x] 6.4 `server/services/shop.service.test.ts`（如有）新增技能碎片商品生成與購買的測試 — 新增 4 個測試（生成含/不含碎片格、成功購買、餘額不足），全部 376 個測試通過
- [x] 6.5（新增，範圍外記錄）`app/pages/shop.vue`/`app/composables/useShop.ts` 尚未處理 `SKILL_FRAGMENT` slot（目前只有裝備/藥水兩種 UI 分類）— 已於 7.6 一併處理

## 7. 前端：角色頁「技能」tab

- [x] 7.1 `app/pages/inventory.vue`：`TabKey` 新增 `'SKILL'`，`TAB_OPTIONS` 新增「技能」項
- [x] 7.2 新增 `app/components/game/inventory-page/skillSlotPanel.vue`：上方 3 個佩戴欄位格（依 `unlockedSlotCount` 顯示已開放/未開放）— 目錄沿用既有 `inventory-page`（非提案原寫的 `inventory`），與 `weaponProficiencyPanel.vue` 一致
- [x] 7.3 新增 `app/components/game/inventory-page/skillGrid.vue`：下方全部技能格狀清單（未解鎖顯示碎片進度遮罩，已解鎖顯示等級/佩戴標記），比照既有 `pixel-slot` 樣式
- [x] 7.4 新增 `app/components/game/inventory-page/skillDialog.vue`：點擊格子開啟，已解鎖顯示標題/描述/效果數值/exp 進度/強化按鈕/佩戴卸下按鈕，未解鎖顯示標題/描述/碎片進度
- [x] 7.5 新增 `app/composables/useCharacterSkills.ts`：串接 4.1~4.4 的 API，管理 loading/error 狀態
- [x] 7.6 商店頁（`app/pages/shop.vue`）呈現 `SKILL_FRAGMENT` 商品的展示樣式與購買互動（略過裝備预覽樣式）— 簡易卡片 + 購買按鈕，不重用裝備購買 dialog；同時修正 `useShop.ts`/`shop.vue` 原本假設 `slot.item` 必存在會在混入碎片格後崩潰的問題
- [x] 7.7（使用者追加需求）購買技能碎片後彈出結果 dialog 顯示取得的技能與數量 — 後端 `ShopService.purchaseItem` 的 `skillFragment` 結果補上 `name`/`icon`（查 `getCharacterSkillById`），`purchaseItemResponseSchema`/`PurchaseResultData` 同步更新；新增 `GameCommonSkillFragmentPurchaseDialog.vue`，`useShop().purchase()` 回傳型別由 `boolean` 改為 `PurchaseResultData | null` 以便呼叫端拿到完整結果（`shopPurchaseDialog.vue` 同步調整）

## 8. 驗證

- [x] 8.1 `pnpm lint` — 僅剩專案既有、與本次改動無關的 pre-existing lint debt（`no-unused-vars`/`no-explicit-any` 大量誤報，範圍前即存在）
- [x] 8.2 `pnpm test`（新增測試涵蓋 server/services/character-skill.service.test.ts、combat.service.test.ts、shop.service.test.ts 相關案例）— 376 個測試全數通過
- [x] 8.3 `pnpm build`（確認型別編譯通過）— 成功，僅剩一項與本次改動無關的既有 `RENAME_COST_GEMS` 重複匯入警告
- [ ] 8.4 手動於瀏覽器驗證角色頁「技能」tab：碎片進度顯示、解鎖、佩戴/卸下、強化操作，以及一場實際戰鬥中技能觸發與 `SKILL` 事件播放 — 尚未執行：agent 環境無可用登入帳號，僅完成 `pnpm dev` 啟動、`/inventory`、`/shop` 路由回應 200（SPA shell，未含實際登入互動）的靜態檢查；仍需使用者或後續工作階段以真實帳號手動點過一輪
