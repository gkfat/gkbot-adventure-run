## Why

`combat-engine` 目前是純自動攻防（無技能、無玩家操作），5 個可選職業除了初始 `attributes` 不同外，完全沒有戰鬥風格上的差異化。同時敵人（`EnemyArchetype`）也完全沒有技能/特殊行為的概念，戰鬥只有普通攻擊。這次要補上「角色與敵人的技能」機制，讓每個可選職業各有一個呼應其定位敘事的主動戰鬥技能，並讓敵人也能擁有技能，豐富戰鬥的策略深度。

## What Changes

- 新增技能資料模型：`CharacterSkill`（角色技能，依 `archetypeId` 對應 5 個可選職業各一筆）與 `EnemySkill`（敵人技能，獨立資料結構），皆為戰鬥引擎可查表消費的靜態資料。
- 新增「資源值觸發」機制：每個 `CombatUnit`（玩家與敵人）新增一個資源值（怒氣/能量，命名待 design.md 定案），隨行動（普通攻擊、受擊，依技能定義擇一或並行）累積，達到技能的資源門檻時，於下次輪到該單位行動時觸發技能而非普通攻擊。
- `combat-engine` 的戰鬥模擬迴圈（`CombatService.resolve`/`performAttack`）擴充：加入資源值累積、技能觸發判定、技能效果結算，`combatLog` 新增 `SKILL` 事件類型記錄技能發動與效果。
- 為 5 個可選職業各新增一個對應的 `CharacterSkill`（以 `archetypeId` 對應，戰鬥主題呼應該職業的定位敘事），作為職業在戰鬥中的差異化機制。
- 敵人端提供 1~2 個範例 `EnemySkill`（例如強化版攻擊或短暫 debuff），驗證 `EnemyArchetype` 可攜帶技能欄位並在戰鬥中觸發，其餘敵人範本維持無技能（向後相容）。
- 冒險畫面戰鬥播放（`combat-log-sequential-playback` 既有機制）需能識別並播放新增的 `SKILL` 事件（沿用既有逐批播放邏輯，僅新增一種事件的顯示文案，不涉及新動畫）。

## Capabilities

### New Capabilities
- `character-enemy-skills`：定義角色技能（依 `archetypeId` 對應 5 個可選職業）與敵人技能（獨立資料結構）的靜態資料模型、資源值觸發機制，以及在 `combat-engine` 模擬迴圈中的觸發/結算規則。

### Modified Capabilities
- `combat-engine`：戰鬥模擬迴圈新增資源值累積與技能觸發/結算步驟，`CombatLogEntry.action` 新增 `SKILL` 事件類型；「冒險畫面顯示戰鬥結果」的逐批播放規則需涵蓋 `SKILL` 事件的顯示。

## Impact

- `server/services/combat.service.ts`：`CombatUnit` 新增資源值欄位，`resolve`/`performAttack` 加入技能觸發與結算邏輯。
- `server/constants/combat.ts`（`EnemyArchetype`）：新增可選的技能欄位。
- 新增技能靜態資料檔（角色技能沿用 `server/constants/templates/` 慣例、敵人技能沿用 `server/constants/combat.ts` 慣例，實際位置由 design.md 定案）。
- `shared/types/adventure.ts`：`CombatLogEntry.action` 新增 `SKILL`；新增 `CharacterSkill`/`EnemySkill`/`SkillEffect` 相關型別。
- 冒險畫面戰鬥播放元件（`app/components/game/*`）：新增對 `SKILL` combatLog 事件的顯示文案。
- 不影響現有存檔角色/run 資料結構（技能欄位皆為新增，非改寫既有欄位），不需要資料遷移。
