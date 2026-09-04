## Context

角色升級目前只發放 `unspentAttributePoints`（每級 +1，四維度共用一套加點邏輯，`server/repositories/character.repository.ts:settleRunRewards`），5 個可選職業共用完全相同的成長路線。`server/constants/templates/archetypeAbilities.ts` 曾想用 `ArchetypeAbilityTrigger` 做職業差異化，但只是一張沒有任何消費端的靜態表，數值運算全部留白。這次改用「天賦樹」取代該檔案，作為職業差異化的正式落地方案：由下而上分層、部分層有二擇一岔路、每節點 3 級，效果比照既有 `equipmentBonus` 疊加進 stats 計算管線（`shared/utils/calculateStats.ts`）。

`carryCapacity` 目前的型別註解明確寫「純由 attributes 衍生、不受裝備影響」——這次天賦效果若要如使用者要求的「負重得到小幅加成」，需要調整這個語意為「不受裝備影響，但受角色永久成長（attributes + talents）影響」，因為天賦點與屬性點同屬永久成長，装备是暫時可替換的資源，兩者的區分邏輯不變，只是把天賦也歸類進「永久成長」那一側。

## Goals / Non-Goals

**Goals:**
- 為 5 個可選職業各設計一棵天賦樹：5 層，第 1/3/5 層各 1 個節點，第 2/4 層各 2 個節點（岔路，只能擇一），每節點最高 3 級。
- 天賦點：每級 +3（`talentPoints`），累計投入節點的 `talents: Record<nodeId, rank>`，資料存在角色文件上。
- 通用、與職業/岔路無關的「開放下一層」規則：某層開放的條件是「上一層存在一個已點滿（rank = maxRank）的節點」（第 1 層永遠開放）。
- 岔路互斥：同層同 `branchGroup` 的節點，只要其中一個 rank > 0，另一個永久鎖定在 rank 0（不支援重置/轉點）。
- 天賦效果併入既有 `calculateBaseStats` → `applyEquipmentStats` 之後的 stats 計算管線，回傳結構與 `equipmentBonus` 一致的 `talentBonus`。
- 移除 `archetypeAbilities.ts`／`ArchetypeAbilityTrigger`，以及 `character-archetype-abilities` capability。

**Non-Goals:**
- 不做天賦重置/轉點（岔路一旦選定即永久鎖定另一側，符合現有屬性點分配「不可逆」的既有慣例）。
- 不處理「天賦點花不完」的數值平衡（滿點一條路徑僅需 15 點，遠低於 30 級累積的 87 點上限）——多餘點數先保留在 `unspentTalentPoints`，作為未來擴充天賦樹層數的空間，不在本次解決，見 Open Questions。
- 不做天賦樹的視覺特效/專屬動畫，前端頁面以既有角色頁面（`characterStage.vue`）的即時 stats 預覽模式呈現節點與效果文字。
- 不重新設計 `ArchetypeAbilityTrigger` 描述的 5 種非戰鬥效果（events/items/adventure-run 節點相關）——那些連同該資料檔一併移除，不遷移到天賦樹。

## Decisions

### 1. 型別放在 `shared/types/character.ts`，資料檔放在 `server/constants/templates/talentTrees.ts`
天賦樹定義需要同時給前端（渲染節點、即時 stats 預覽）與後端（驗證投點、計算 stats）使用，但既有前端從不直接 `import` `server/constants/*`（角色可選職業清單也是透過 `GET /api/character/roster` 取得，不是直接 import `characterArchetypes.ts`）——沿用相同慣例：型別放 `shared/types/character.ts`，靜態資料放 `server/constants/templates/talentTrees.ts`（`templates/index.ts` re-export），前端一律透過 `GET /api/character/:characterId` 回應取得完整 `TalentTree` 定義，不直接 import 後端常數檔。

### 2. 資料模型
```ts
// shared/types/character.ts（新增）
export type TalentEffect = {
    stat: 'ATK' | 'DEF' | 'HP_MAX' | 'actionIntervalSec' | 'critChance' | 'dodgeChance' | 'carryCapacity';
    perRank: number; // 每級的數值增量（actionIntervalSec 用負值表示變快，與 equipmentBonus 的 actionSpeedMod 語意一致）
};

export type TalentNode = {
    nodeId: string;       // 全域唯一，格式 `{archetypeId}_t{tier}{branchLetter?}`
    archetypeId: string;
    tier: number;         // 1-based，樹狀由下而上
    branchGroup?: string; // 同 tier + 同 branchGroup 的節點互斥，只能擇一投點
    name: string;
    description: string;
    maxRank: 3;
    effect: TalentEffect;
};

export type TalentTree = {
    archetypeId: string;
    nodes: readonly TalentNode[];
};

// Character 新增欄位
talentPoints: number;             // 未花費天賦點，每級 +3
talents: Record<string, number>;  // nodeId -> 目前已投入的 rank（0 或缺省視為未點）
```

### 3. 開放下一層／岔路互斥的通用驗證規則
`allocateTalentPoint(characterId, nodeId)`：
1. `nodeId` 須存在於該角色 `archetypeId` 對應的 `TalentTree`，否則 404。
2. `character.talentPoints >= 1`，否則 400。
3. 該節點目前 rank（`talents[nodeId] ?? 0`）須 `< maxRank`，否則 400（已點滿）。
4. **開放層級檢查**：若 `node.tier > 1`，須存在同一棵樹中 `tier === node.tier - 1` 且 rank 已達 `maxRank` 的節點，否則 400（上一層尚未點滿）；`tier === 1` 的節點永遠視為已開放。此規則對單節點層與岔路層一視同仁，不需要另外分支判斷「是否為岔路層」。
5. **岔路互斥檢查**：若 `node.branchGroup` 存在，檢查同 `tier` + `branchGroup` 的其他節點 rank 是否 > 0，若是則 400（已鎖定於對向分支）。
6. 通過驗證後：`talents[nodeId] = rank + 1`、`talentPoints -= 1`，寫回角色文件（比照 `updateAttributes` 的單次 `update`，不需要 transaction——與 `settleRunRewards` 的併發疑慮不同，天賦投點不牽涉 gold/exp 這類需要 read-modify-write 保護的欄位，且前端會在每次投點後立即重新拉取最新角色資料，UI 上不太可能短時間內連續送出多筆投點請求）。

**替代方案考量**：曾考慮讓前端一次送出整批投點（比照 `AllocateAttributesInput` 的批次寫法），但天賦樹的層級開放規則是「投入順序相依」（第 3 層要等第 2 層點滿才能點），批次送出時中途驗證失敗要嘛整批 reject 要嘛要做部分成功的複雜語意；改成「每次呼叫投 1 級」與遊戲內「點一下天賦樹節點」的互動天然對應，驗證邏輯也更單純。

### 4. `carryCapacity` 語意調整：從「純 attributes」改為「攻略成長總和（attributes + talents）」
`shared/utils/calculateStats.ts` 的 `calculateBaseStats` 回傳的 `carryCapacity` 維持 `STR + CON`（不變）；`talentBonus` 對 `carryCapacity` 的加成在 `withStats`（`character.service.ts`）比照 `equipmentBonus` 疊加方式另外加總（`stats.carryCapacity += talentBonus.carryCapacity`），不修改 `calculateBaseStats`/`applyEquipmentStats` 既有簽章。`Stats.carryCapacity` 的型別註解需更新為「不受裝備影響，但受天賦影響」。

### 5. 天賦效果套用管線：`applyTalentStats`，插在 `applyEquipmentStats` 之後
```
calculateBaseStats(attributes) → applyEquipmentStats(base, equipmentBonus) → applyTalentStats(afterEquipment, talentBonus) → stats
```
`applyTalentStats` 是新增的純函式（放在 `shared/utils/calculateStats.ts`，與 `applyEquipmentStats` 同檔），簽章與語意對稱：輸入目前 stats 與 `talentBonus`（`Partial<Record<TalentEffect['stat'], number>>`），逐項相加，`actionIntervalSec`/`dodgeChance`/`critChance` 一樣做既有的 min/max clamp。`talentBonus` 由 `character.service.ts` 依 `character.talents` 對照 `TalentTree` 加總各節點 `effect.perRank * rank` 而得（只加總 rank > 0 的節點，等同天賦版的 `sumEquipmentStats`）。

### 6. 5 個職業天賦樹內容（每節點 `perRank` 為每級增量，3 級為滿）

| archetypeId | Tier 1（單節點） | Tier 2（岔路 A / B） | Tier 3（單節點） | Tier 4（岔路 A / B） | Tier 5（單節點，畢業技） |
|---|---|---|---|---|---|
| fighter | 體魄鍛鍊：HP_MAX +15、DEF +2、carryCapacity +1 | A 剛毅意志：DEF +3　／　B 蠻力衝擊：ATK +3 | 沉重打擊：ATK +2、DEF +1 | A 銅牆鐵壁：DEF +5、actionIntervalSec +0.05　／　B 破陣猛攻：ATK +5 | 不屈之軀：HP_MAX +40、DEF +4 |
| adventurer | 輕裝疾行：actionIntervalSec -0.03、dodgeChance +0.01 | A 靈巧步伐：dodgeChance +0.02　／　B 疾風連擊：actionIntervalSec -0.05 | 隨機應變：carryCapacity +2、dodgeChance +0.01 | A 影步：dodgeChance +0.04　／　B 迅捷本能：actionIntervalSec -0.08 | 探索者之心：ATK +3、dodgeChance +0.02 |
| scholar | 戰術洞察：critChance +0.02、ATK +2 | A 精準打擊：critChance +0.03　／　B 弱點分析：ATK +4 | 冷靜分析：DEF +2、critChance +0.01 | A 致命一擊：critChance +0.05　／　B 博學強化：ATK +6 | 大師手筆：ATK +5、critChance +0.03 |
| tinkerer | 裝備強化：DEF +2、actionIntervalSec -0.02 | A 加固護甲：DEF +4　／　B 潤滑機構：actionIntervalSec -0.04 | 隨行工具：carryCapacity +3、HP_MAX +10 | A 重裝改造：DEF +6　／　B 高速齒輪：actionIntervalSec -0.06 | 巧匠傑作：DEF +5、actionIntervalSec -0.05 |
| gambler | 幸運本能：critChance +0.02、dodgeChance +0.01 | A 賭徒直覺：critChance +0.03　／　B 死裡逃生：dodgeChance +0.03 | 孤注一擲：ATK +3、critChance +0.01 | A 全下：critChance +0.05　／　B 命運女神：dodgeChance +0.05 | 賭王之運：critChance +0.03、dodgeChance +0.03 |

每個節點若有多個 `stat` 欄位，資料上以多個 `TalentEffect`（同一 `nodeId`）表示（`TalentNode.effect` 需要調整成 `readonly TalentEffect[]` 而非單一物件，取代第 2 節示意型別中的單數形式——最終型別以此為準）。Tier 2/4 節點 ID 範例：`fighter_t2a`/`fighter_t2b`。玩家名稱/敘述文案需依 `docs/worldview.md` 的敘事規範於 tasks 階段定稿。

### 7. `character-archetype-abilities` 移除
確認全專案（`grep -rn "archetypeAbilities\|ArchetypeAbility"`）除 `character-enemy-skills`（尚未實作、未進入 apply 的另一份 change 提案文件）外沒有其他消費端後，刪除 `server/constants/templates/archetypeAbilities.ts` 與其測試檔，`templates/index.ts` 移除 re-export，`openspec/specs/character-archetype-abilities/spec.md` 隨本次 change 的 spec delta 移除該 capability。`character-enemy-skills` 是另一份獨立、尚未實作的 change 提案，其設計文件對 `ArchetypeAbilityTrigger` 的引用屬於該 change 自己的規劃內容，不在本次 change 的修改範圍內，若該 change 後續要實作，需自行更新其 proposal/design 對此檔案的引用。

## Risks / Trade-offs

- **[風險] 移除 `archetypeAbilities.ts` 可能影響 `character-enemy-skills`（未實作）change 的既有規劃文件引用** → 該 change 尚未進入 `opsx:apply`，不影響任何已上線程式碼；若之後要實作該 change，屆時再一併檢視其設計文件是否需要更新引用。
- **[風險] 5 職業 7 節點的效果數值（`perRank`）未經實際戰鬥數值曲線驗證，可能造成戰力落差** → 數值先取小幅、與現有 `STATS_CONFIG`（如 `STR_TO_ATK = 2.5`）同量級的保守值，正式平衡調整留給 `known-issue.md`/`docs/game-design/balance`後續追蹤，不阻塞本次 change。
- **[取捨] 天賦一旦選定岔路即永久鎖定、不支援重置** → 與現有屬性點分配的不可逆慣例一致，避免同時處理「轉點道具/貨幣」的額外複雜度；如需重置機制，留待後續 change。
- **[風險] `talents`/`talentPoints` 為新增欄位，既有角色文件讀取時需要預設值** → 比照現有 `withCharacterDefaults`（`withLevelDefaults`/`withNextChapterDefault`）模式，於 repository 讀取路徑新增 `withTalentDefaults`（`talents ?? {}`、`talentPoints ?? 0`），不需要批次遷移既有 Firestore 文件。

## Migration Plan

純新增欄位，不需要批次資料遷移：
- `Character.talentPoints`/`talents` 為新增欄位，既有角色文件缺少這兩個欄位時，讀取路徑（`CharacterRepository.getById`/`withCharacterDefaults`）補上 `talentPoints: 0`/`talents: {}` 預設值。
- `settleRunRewards` 的升級迴圈新增 `talentPoints += 3`，與既有 `unspentAttributePoints += 1` 並行寫入，不影響既有欄位語意。
- `character-archetype-abilities` capability 移除、`archetypeAbilities.ts` 刪除為單次程式碼變更，不涉及 Firestore 資料（該檔案本來就沒有任何消費端寫入/讀取 Firestore 欄位）。

## Open Questions

- 完整點滿一條天賦路徑僅需 15 點，遠低於 30 級可累積的 87 點上限，多餘天賦點目前只能閒置在 `unspentTalentPoints`——是否於後續 change 擴充更多層數/節點，或調整每級發放量，留待後續依實際遊戲節奏評估，不影響本次資料結構（`talents` 為 sparse `Record`，未來新增節點不需要遷移既有資料）。
- Tier 2/4 岔路節點的最終命名/敘述文案（需符合 `docs/worldview.md` 敘事規範，例如角色自身機械化的暗示需含蓄處理）留待 tasks 階段定稿，本設計只定案節點 ID、`stat`、`perRank` 數值。
