## Why

角色技能目前被鎖死在「解鎖時的職業」上——每個角色只能看到、解鎖、強化自己 `archetypeId` 對應的 2 個技能，且技能的成長只有「Lv.1~10」一個維度，碎片除了解鎖之外唯一的用途是直接換算成 exp（`strengthenSkill`）。這讓技能養成的天花板太低、碎片的用途過於單一，玩家也無法自由組合喜歡的技能效果。本次變更把技能改為全角色共用的通用清單，並在 Lv.10 之上疊加一層「星等」成長，讓碎片轉為升星專用資源，另外新增「技能經驗值晶片」道具作為 Lv.1~10 的正式升級素材，取代碎片直接轉 exp 的舊機制。

## What Changes

- **BREAKING**：移除「技能只能由本職業解鎖/強化」的限制——`GET .../skills` 回傳全部 10 個技能（不再依 `archetypeId` 過濾），任一角色皆可解鎖、佩戴任何技能。
- **BREAKING**：移除 `POST .../skills/strengthen`（碎片直接轉 exp）端點與 `FRAGMENT_TO_EXP_RATE` 機制。
- 新增「星等」（`star`，1~5）：技能解鎖時 `star = 1`；`level` 封頂 10 後，消耗技能碎片可升星（`star + 1`，`level`/`exp` 歸零重新從 1 練起）；星等每級固定所需碎片數依表遞增（1★→2★ 50、2★→3★ 200、3★→4★ 450、4★→5★ 800），5★為上限。
- 新增「技能經驗值晶片」道具（`ItemType.MATERIAL`，新道具模板 + pixel art），消耗晶片可直接為指定已解鎖技能增加固定量 exp、套用既有 Lv.1~10 升級判定，取代碎片轉 exp。
- 星等對技能效果的加成：`effectByLevel` 數值套用 `1 + 0.1 × (star - 1)` 倍率放大；`chargeSec` 套用 `1 - 0.05 × (star - 1)`（下限為原始值的 60%）倍率縮短。
- 技能碎片掉落量調降（`SKILL_FRAGMENT_DROP_AMOUNT` 3 → 1），且掉落池改為全部 10 技能等機率（不再限定角色職業）。
- 新增技能經驗值晶片取得管道：每日商店固定數量販售格 + 戰鬥（探索）勝利掉落機率。
- 前端技能 tab／dialog 改為顯示全部技能、星等與升星操作，並新增晶片庫存/使用 UI。

## Capabilities

### New Capabilities
（無新 capability，皆為既有 `character-skills`/`shop`/`item-generation`/`inventory` 的需求變更）

### Modified Capabilities
- `character-skills`：技能清單改為全角色通用（移除職業限制）、新增星等（升星流程、星等加成公式）、新增技能經驗值晶片升級流程、移除碎片直接轉 exp 的強化端點、戰鬥碎片掉落池改為全技能等機率、掉落數量調降。
- `shop`：每日商店新增「技能經驗值晶片」固定數量販售格。
- `item-generation`：新增 `ItemType.MATERIAL` 與「技能經驗值晶片」道具模板（無稀有度分級，單一固定文案/圖示）。
- `inventory`：背包「道具」篩選涵蓋新增的 `MATERIAL` 類型物品。
- `combat-engine`：戰鬥勝利的技能碎片掉落改為全技能等機率挑選（不再限定角色職業），新增技能經驗值晶片的獨立掉落判定。

## Impact

- **Shared**：`shared/constants/characterSkills.ts`（移除職業限定的資料結構語意，改為單一扁平清單或保留現有分組但取消存取限制）、`shared/constants/skills.ts`（新增星等費用表、加成公式、移除 `FRAGMENT_TO_EXP_RATE`）、`shared/types/character.ts`（`SkillProgress` 新增 `star`）、`shared/types/item.ts`（新增 `ItemType.MATERIAL`）、`shared/schemas/firestore/character.schema.ts`、`shared/schemas/api/character-skill.schema.ts`。
- **Server**：`server/services/character-skill.service.ts`（`getSkillsView`/`unlockSkill`/移除 `strengthenSkill`/新增 `starUpSkill`/`useSkillExpChip`）、`server/services/combat.service.ts`（掉落池與掉落量、新增晶片掉落）、`server/services/shop.service.ts`（新增晶片商店格）、`server/constants/templates/*`（新增晶片道具模板）、對應的 `server/api/character/[characterId]/skills/*` 路由。
- **前端**：`app/composables/useCharacterSkills.ts`、`app/components/game/inventory-page/skillDialog.vue`/`skillGrid.vue`/`skillSlotPanel.vue`、`app/components/game/common/skillFragmentPurchaseDialog.vue`。
- **美術**：新增「技能經驗值晶片」pixel art 圖示（`pixel-art-studio`，參考使用者提供的電路板晶片圖風格）。
- **既有玩家資料遷移**：舊有 `unlockedSkills[skillId]` 缺少 `star` 欄位，讀取時 self-heal 補上 `star: 1`。
