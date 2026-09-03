## 1. Shared 型別與模板結構

- [x] 1.1 `shared/types/adventure.ts`：`AdventureRun.blessings` 型別由 `string[]` 改為 `{ modifierId: string; level: number }[]`（新增對應 type，如 `BlessingEntry`）
- [x] 1.2 `shared/schemas/firestore/adventure.schema.ts`：同步更新 `blessings` 欄位的 Zod schema
- [x] 1.3 `shared/schemas/api/adventure.schema.ts`：同步更新 BLESSING_SELECT 候選/回應相關 schema（候選需帶 rarity + 本次提供等級）
- [x] 1.4 `shared/constants/blessings.ts`：`BlessingTemplate` 改為 `rarity: 'COMMON'|'RARE'|'EPIC'` + `levels: [effect, effect, effect]`（Lv1~Lv3），`tier`/`BlessingTier` 移除
- [x] 1.5 `shared/constants/blessings.ts`：既有 5 個 Blessing 家族依 design.md Decision 1 改寫為新結構，各自定義 3 級效果數值
- [x] 1.6 `shared/constants/blessings.ts`：擴充新增 Blessing 家族，涵蓋 COMMON/RARE/EPIC 三種 rarity，總量足以避免單次 run 點滿全部
- [x] 1.7 `shared/constants/blessings.ts`：`majorTierChance(luck)` 改寫為三級 rarity 加權函式（COMMON/RARE/EPIC，依 LUCK 調整權重）
- [x] 1.8 `shared/constants/blessings.ts`：更新/新增 `MODIFIER_TEMPLATES_BY_ID` 或等效查表，確保 Curse 查表邏輯不受影響
- [x] 1.9 `shared/constants/blessings.test.ts`：更新既有測試以符合新結構，並補上 rarity 加權、`levels` 展開的測試

## 2. Server：候選生成與選擇邏輯

- [x] 2.1 `server/services/blessing.service.ts`：`generateCandidates()` 改為先過濾「未滿 Lv3」家族並算出各自下一個可提供等級，再依 rarity + LUCK 加權抽選（design.md Decision 3）
- [x] 2.2 `server/services/blessing.service.test.ts`：補測試涵蓋「全部未擁有」「部分已滿 Lv3」「全部已滿 Lv3」等邊界情境
- [x] 2.3 `server/api/adventure/blessing/select.post.ts`：選擇候選後依家族是否已擁有，分流「新增 Lv1」與「原地升級 LvN+1」（design.md Decision 5）
- [x] 2.4 對應的 API 測試更新，涵蓋新增與升級兩種選擇路徑

## 3. Server：效果套用邏輯

- [x] 3.1 `server/services/combat.service.ts`：`resolveActiveModifiers()` 拆分 blessing（level-aware，經 `levels[level-1]` 展開）與 curse（維持原本查表）兩條路徑
- [x] 3.2 `server/services/combat.service.test.ts`：更新/新增測試確認同一家族在不同等級套用不同效果數值
- [x] 3.3 `server/services/adventure-run.service.ts`：檢視並修正直接讀取 Blessing 模板 `statModifiers`（如 `playerHpMax` 基準值調整處）的呼叫點，改為對齊 design.md Open Questions 的決議
- [x] 3.4 `server/services/adventure-run.service.test.ts`：同步更新相關測試

## 4. App：型別與 UI

- [x] 4.1 `app/composables/useAdventureRun.ts`：同步更新 blessing 相關型別（含候選的 rarity/等級欄位）
- [x] 4.2 `app/components/game/blessingSelectDialog.vue`：候選卡片依 rarity 顯示外框顏色與左上角徽章（沿用裝備稀有度呈現手法），右上角顯示 `LV.N`
- [x] 4.3 `app/components/game/blessingSelectDialog.vue`：區分「新增」與「升級」候選的文案/呈現（例如升級候選標示目前等級 → 下一等級）

## 5. 驗證

- [x] 5.1 `pnpm test` 全數通過
- [x] 5.2 `pnpm lint` 無錯誤
- [x] 5.3 `pnpm build` 確認型別編譯通過
- [x] 5.4 於 dev server 實際跑一次 BLESSING_SELECT 流程（新增與升級各一次），確認 UI 呈現與效果數值正確
