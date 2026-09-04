## 1. 型別與 Zod schema

- [x] 1.1 於 `shared/types/character.ts` 新增 `TalentEffect`（`stat` + `perRank`）、`TalentNode`（`nodeId`/`archetypeId`/`tier`/`branchGroup?`/`name`/`description`/`maxRank`/`effect: readonly TalentEffect[]`）、`TalentTree`（`archetypeId` + `nodes`）型別
- [x] 1.2 `Character` 型別新增 `talentPoints: number`、`talents: Record<string, number>`；`CharacterWithStats` 新增 `talentBonus: Partial<Stats>` 與 `talentTree: TalentTree`
- [x] 1.3 於 `shared/schemas/firestore/`（或既有 `characterSchema` 所在檔案）的 Zod schema 補上 `talentPoints`/`talents` 欄位定義，預設值 `0`/`{}`
- [x] 1.4 於 `shared/schemas/api/character.schema.ts` 新增 `allocateTalentRequestSchema`（`{ nodeId: string }`）與 `allocateTalentResponseSchema`（回傳 `talents`/`talentPoints`），並確認既有角色查詢 response schema 涵蓋新增的 `talentPoints`/`talents`/`talentTree`/`talentBonus` 欄位

## 2. 天賦樹靜態資料

- [x] 2.1 新增 `server/constants/templates/talentTrees.ts`：依 design.md 決策 6 的表格，為 `fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler` 各建立 7 個節點（Tier 1/3/5 各 1 個、Tier 2/4 各 2 個岔路節點），`nodeId` 格式 `{archetypeId}_t{tier}{branchLetter?}`；`name`/`description` 文案依 `docs/worldview.md` 敘事規範定稿；匯出 `TALENT_TREES: Record<string, TalentTree>` 與 `getTalentTreeByArchetypeId()`
- [x] 2.2 於 `server/constants/templates/index.ts` re-export `talentTrees.ts`
- [x] 2.3 新增 `server/constants/templates/talentTrees.test.ts`：驗證 5 個可選職業各查得一棵樹、每棵樹恰好 7 個節點、Tier 1/3/5 各 1 個節點、Tier 2/4 各 2 個且 `branchGroup` 相同、所有 `maxRank` 均為 3、`nodeId` 全域不重複

## 3. 移除 `ArchetypeAbility`

- [x] 3.1 確認全專案（`grep -rn "archetypeAbilities\|ArchetypeAbility"`，排除 `openspec/changes/character-enemy-skills` 的規劃文件）沒有其他消費端
- [x] 3.2 刪除 `server/constants/templates/archetypeAbilities.ts` 與其測試檔（若存在）
- [x] 3.3 於 `server/constants/templates/index.ts` 移除 `archetypeAbilities.ts` 的 re-export

## 4. Repository：升級發放天賦點、投點寫入、預設值補值

- [x] 4.1 `character.repository.ts` 的 `prepareCharacterData` 初始化 `talentPoints: 0`、`talents: {}`
- [x] 4.2 新增 `withTalentDefaults`（比照既有 `withLevelDefaults`/`withNextChapterDefault` 模式），於 `withCharacterDefaults` 中串接，補上既有角色文件缺少 `talentPoints`/`talents` 時的預設值（`0`/`{}`）
- [x] 4.3 `settleRunRewards` 的升級迴圈新增 `talentPoints += 3`（與既有 `unspentAttributePoints += 1` 同一個 `while` 迴圈內），回傳值與 `tx.update` 一併寫入 `talentPoints`
- [x] 4.4 新增 `updateTalents(characterId, patch: { talents: Character['talents']; talentPoints: number })`，比照既有 `updateAttributes` 的單次 `update` 寫法（不需要 transaction，理由見 design.md 決策 3）

## 5. Service：投點驗證與 stats 併入天賦加成

- [x] 5.1 `character.service.ts` 新增 `allocateTalentPoint(accountId, characterId, nodeId)`：依 design.md 決策 3 的順序驗證（節點存在 → `talentPoints >= 1` → 該節點 rank 未達 `maxRank` → 上一層存在已點滿節點（`tier === 1` 視為永遠開放）→ 若有 `branchGroup` 則同層同 group 的其他節點 rank 須為 0），全數通過後呼叫 `updateTalents`
- [x] 5.2 於 `shared/utils/calculateStats.ts` 新增 `applyTalentStats(stats, talentBonus)`：比照 `applyEquipmentStats` 的疊加與 clamp 邏輯（`actionIntervalSec`/`dodgeChance`/`critChance` 沿用既有 min/max），`carryCapacity` 直接相加
- [x] 5.3 `character.service.ts` 新增私有方法計算 `talentBonus`：走訪 `character.talents` 中 rank > 0 的節點，依 `TALENT_TREES[archetypeId]` 查出各節點 `effect`，逐項 `perRank * rank` 加總為 `Partial<Stats>`（比照 `sumEquipmentStats` 的加總寫法）
- [x] 5.4 `withStats` 方法：在 `applyEquipmentStats` 之後呼叫 `applyTalentStats`，回傳值新增 `talentBonus`（只列非零項，比照既有 `equipmentBonus` 的 `nonZeroBonus` 過濾）與 `talentTree`（`getTalentTreeByArchetypeId(character.archetypeId)`）

## 6. API 端點

- [x] 6.1 新增 `server/api/character/[characterId]/talents.post.ts`：比照 `attributes.post.ts` 的結構（`requireAuth` → 解析 `characterId` → `readBody` + `allocateTalentRequestSchema.safeParse` → 呼叫 `CharacterService.allocateTalentPoint` → 依 `allocateTalentResponseSchema` 回傳 → `try/catch` 走 `toH3Error`）
- [x] 6.2 於 `server/utils/openapi.ts` 註冊新端點與其 request/response schema
- [x] 6.3 確認 `GET /api/character/:characterId` 既有 handler 回傳值涵蓋 `talentPoints`/`talents`/`talentTree`/`talentBonus`（`withStats` 的回傳已包含，檢查 route handler 沒有額外過濾掉這些欄位）

## 7. 前端

- [x] 7.1 於角色頁面（`app/components/game/*`，比照 `characterStage.vue` 既有屬性點分配 UI）新增天賦樹頁籤/元件：由下而上分層渲染節點，未開放層級的節點顯示鎖定狀態，岔路節點顯示二擇一 UI，已鎖定的對向分支節點顯示永久鎖定狀態
- [x] 7.2 天賦樹頁面呼叫 `applyTalentStats`（沿用共用的 `shared/utils/calculateStats.ts`）做即時 stats 預覽，投點後呼叫 `POST /api/character/:characterId/talents` 並重新拉取角色資料
- [x] 7.3 確認角色 stats 顯示區塊（若有分項顯示 `equipmentBonus`）一併顯示 `talentBonus`

## 8. 測試與驗證

- [x] 8.1 `character.service.test.ts`（或新增 `character.service.talents.test.ts`）新增測試：Tier 1 永遠可投點、天賦點不足時拒絕、節點已滿時拒絕
- [x] 8.2 新增測試：上一層未點滿時投入下一層被拒絕；上一層點滿後可投入下一層
- [x] 8.3 新增測試：岔路互斥——投入某分支後，對向分支節點永久被拒絕；同一分支可持續投到滿級
- [x] 8.4 新增測試：`talentBonus`／`stats`（含 `carryCapacity`）正確反映已投入的天賦加成，未投入任何天賦時與變更前行為一致（回歸測試）
- [x] 8.5 `character.repository.test.ts`（若存在）或相關測試新增：升級時 `talentPoints` 與 `unspentAttributePoints` 同時正確發放（含單次結算連續升多級的情境）
- [x] 8.6 執行 `pnpm lint`、`pnpm test`、`pnpm build` 全數通過

## 9. 文件同步

- [x] 9.1 更新 `docs/game-design/mechanics/`（角色成長相關文件）補充天賦樹機制說明與 5 職業天賦樹內容
- [x] 9.2 視需要更新 `docs/game-design/balance/`，記錄天賦效果數值（`perRank`）供後續平衡調整參考
