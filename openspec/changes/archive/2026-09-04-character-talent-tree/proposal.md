## Why

角色升級目前只給 1 點可分配到 STR/AGI/CON/LUCK 的 `unspentAttributePoints`，成長路線對所有職業都是同一套四維度加點，缺乏「這個職業該長什麼樣」的差異化。`server/constants/templates/archetypeAbilities.ts` 曾定義 5 個職業各一筆 `ArchetypeAbilityTrigger`，明確標註「不涉及實際效果數值運算」，至今仍未被任何消費端串接——這次改用一套更完整的「天賦樹」機制取代它作為職業差異化的落地方案：每級額外給 3 點天賦點，玩家依角色職業專屬的天賦樹逐層往上點，讓戰士、學者等職業的成長路線真正長成不同樣子。`ArchetypeAbilityTrigger` 僅作為本次天賦主題設計的參考起點，其資料檔本身在本次一併移除。

## What Changes

- 新增 `talentPoints`（角色文件新欄位，玩家升 1 級獲得 3 點，比照 `unspentAttributePoints` 的既有升級發放邏輯）與 `talents`（每個天賦節點目前已投入的層級，`Record<nodeId, rank>`）。
- 新增 5 個可選職業（`fighter`/`adventurer`/`scholar`/`tinkerer`/`gambler`）各一棵靜態天賦樹資料（`TalentTree`）：由下而上分層（Tier），每個節點最高 3 級，需將目前層的節點點滿才能開放下一層；部分層為「岔路」（同層 2 個節點只能擇一投入，一旦選定另一個永久鎖住，不支援重置/轉點）。
- 天賦節點效果比照既有 `equipmentBonus` 的計算管線，疊加進 `calculateBaseStats`/`applyEquipmentStats` 之後的 stats 計算，回傳 `talentBonus`（結構同 `equipmentBonus`，只列出非零項）。
- **BREAKING（僅限尚未消費的既有資料檔，不影響玩家資料）**：移除 `server/constants/templates/archetypeAbilities.ts`（`ArchetypeAbility`/`ArchetypeAbilityTrigger`）與其測試檔——確認全專案無任何程式碼消費此檔案後刪除，`character-archetype-abilities` capability 隨之移除。
- 新增 `POST /api/character/:characterId/talents`：玩家對指定天賦節點投入 1 點（每次呼叫投 1 級），伺服器驗證點數足夠、該節點所屬層已開放、若為岔路節點驗證未鎖定於對向分支。
- `GET /api/character/:characterId`（既有端點）回應新增 `talentPoints`、`talents`、其職業對應的完整 `TalentTree` 定義（供前端渲染天賦樹 UI）、`talentBonus`。

## Capabilities

### New Capabilities
- `character-talents`：定義 5 個可選職業的天賦樹靜態資料模型（分層、岔路、每節點 3 級）、天賦點的取得與花費規則、天賦效果併入 stats 計算的規則。

### Modified Capabilities
- `character-progression`：角色升級時新增 `talentPoints` 發放（比照 `unspentAttributePoints` 每級 +1 的既有機制，天賦點為每級 +3）；`GET /api/character/:characterId` 回應新增 `talentPoints`/`talents`/`talentBonus` 欄位。

### Removed Capabilities
- `character-archetype-abilities`：`ArchetypeAbility`/`ArchetypeAbilityTrigger` 資料模型移除，改由本次的職業天賦樹作為職業差異化機制的落地方案。

## Impact

- `shared/types/character.ts`：`Character` 新增 `talentPoints: number`、`talents: Record<string, number>`；`CharacterWithStats` 新增 `talentBonus`；新增 `TalentTree`/`TalentTier`/`TalentNode`/`TalentEffect` 型別（型別放置位置於 design.md 定案）。
- `server/repositories/character.repository.ts`：`prepareCharacterData` 初始化 `talentPoints: 0`/`talents: {}`；`settleRunRewards` 每次升級額外 `talentPoints += 3`；新增 `updateTalents`。
- `server/services/character.service.ts`：新增 `allocateTalentPoint`（驗證規則見上）；`withStats` 併入 `talentBonus` 計算。
- `shared/utils/calculateStats.ts` 或新增檔案：新增天賦效果套用到 base stats 的函式，供前端天賦樹預覽頁面重用（比照既有 `calculateBaseStats` 在 `characterStage.vue` 的即時預覽用法）。
- 新增 `server/constants/templates/talentTrees.ts`：5 個職業的 `TALENT_TREES` 靜態資料。
- 刪除 `server/constants/templates/archetypeAbilities.ts` 與 `archetypeAbilities.test.ts`（若存在），並確認 `templates/index.ts` 移除其 re-export。
- 新增 API：`shared/schemas/api/` 新增 talents 端點的 request/response schema，`server/api/character/[characterId]/talents.post.ts`，並於 `server/utils/openapi.ts` 註冊。
- `app/components/game/*`：新增天賦樹頁面/元件（由下而上分層顯示，岔路節點提供二擇一 UI）；沿用既有角色頁面的即時 stats 預覽模式。
- 不影響既有玩家資料的必要欄位（`talentPoints`/`talents` 為新增欄位，讀取既有角色文件時以 `?? 0`/`?? {}` 補預設值，比照 repository 既有 `withCharacterDefaults` 慣例），不需要遷移既有 Firestore 文件。
