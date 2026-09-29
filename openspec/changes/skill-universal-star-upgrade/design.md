## Context

`character-skills` 目前的資料流：`shared/constants/characterSkills.ts` 的 `CHARACTER_SKILLS: Record<archetypeId, CharacterSkill[]>` 只給每個職業 2 個技能，`CharacterSkillService.getSkillsView`/`unlockSkill`/`strengthenSkill` 全部透過 `requireOwnArchetypeSkill` 檢查 `skill.archetypeId === character.archetypeId`。`Character.unlockedSkills: Record<skillId, SkillProgress>`（`SkillProgress = { level, exp }`，Lv.1~10，`SKILL_EXP_TABLE` 門檻表）與 `Character.skillFragments: Record<skillId, number>` 都已是 per-character 的 Firestore 欄位（`character.schema.ts`），碎片來源是 `combat.service.ts` 戰鬥勝利的 LUCK-gated 掉落（`SKILL_FRAGMENT_DROP_AMOUNT = 3`，只從角色自身職業的技能清單挑）與 `shop.service.ts` 的 `SKILL_FRAGMENT_SHOP_SLOTS`（每日各 1 個金幣/寶石格）。`strengthenSkill` 是碎片直接轉 exp 的唯一養成手段（`FRAGMENT_TO_EXP_RATE = 10`）。

本次變更把「技能只能由本職業使用」的限制整個拿掉，並在既有 Lv.1~10 曲線之上加一層「星等」（1~5），碎片改為升星專用資源，Lv.1~10 的養成改交給新道具「技能經驗值晶片」。這是對既有 `character-skills` spec 的 Modified（非新 capability），但涉及新道具類型（`item-generation`/`inventory`）與商店新商品（`shop`），屬於跨 capability 變更，故需要 design.md 先定案關鍵數值與資料形狀。

## Goals / Non-Goals

**Goals:**
- 移除技能的職業歸屬限制：`getSkillsView`/`unlockSkill`/戰鬥碎片掉落池，皆改為對全部 10 個技能生效。
- 在 `SkillProgress` 新增 `star`（1~5），星等提升時放大 `effectByLevel` 的效果倍率、縮短 `chargeSec`。
- 新增「技能經驗值晶片」道具（`ItemType.MATERIAL`），提供消耗晶片直接加 exp 的新端點，取代 `strengthenSkill`。
- 晶片取得管道：每日商店固定格 + 戰鬥勝利掉落；技能碎片掉落量調降、掉落池擴大到全部技能。
- 既有玩家資料 self-heal：讀取缺少 `star` 的 `SkillProgress` 時補 `star: 1`。

**Non-Goals:**
- 不重新設計 `SkillEffectKind`/`effectByLevel` 的 11 種效果分類本身，只在既有數值上疊加星等倍率。
- 不做「已解鎖技能可退回碎片/降星」的重置機制（比照既有「不支援技能重置」慣例，降星不提供）。
- 不修改技能佩戴欄位數（`unlockedSlotCount`，仍是依角色等級開放、上限 3）。
- 不在戰鬥外的 EVENT 節點新增晶片掉落——「探索取得」以既有「戰鬥勝利掉落」管道實現（冒險 run 本身就是探索的載體），不擴大到 `event.service.ts` 的抽獎事件。
- 不引入「晶片數量」欄位——晶片沿用既有 Item Instance 模型（`items` collection 逐一 instance，無 stack 計數），消耗晶片等同刪除該 instance。

## Decisions

### 1. 技能清單改為單一扁平陣列，移除職業過濾
`CHARACTER_SKILLS` 保留現有 `Record<archetypeId, CharacterSkill[]>` 的資料排列（技能定義本身仍標註 `archetypeId` 作為敘事來源／icon 分組線索），但新增 `ALL_CHARACTER_SKILLS: readonly CharacterSkill[]`（攤平全部職業的技能）供 `getSkillsView`/掉落池/解鎖驗證使用。`unlockSkill`/`equipSkill` 移除 `skill.archetypeId === character.archetypeId` 的檢查，改為「skillId 存在於 `ALL_CHARACTER_SKILLS`」即可。

- 替代方案：把 `archetypeId` 欄位整個刪除、技能定義改成純扁平陣列。捨棄理由——`archetypeId` 仍是有意義的敘事/美術分類（icon、UI 分組「XX 系技能」），且現有測試/前端已大量依賴 `getCharacterSkillsByArchetypeId`，保留不刪除可以縮小 diff。

### 2. 星等資料形狀與升星流程
```ts
// shared/types/character.ts
export type SkillProgress = {
  level: number;  // 1~10（既有）
  exp: number;    // 星等內的 Lv exp（既有語意不變）
  star: number;   // 新增：1~5，解鎖時固定為 1
};
```
- 解鎖技能（`unlockSkill`）：`unlockedSkills[skillId] = { level: 1, exp: 0, star: 1 }`。
- 新增 `POST .../skills/star-up`：僅當 `progress.level === SKILL_MAX_LEVEL(10)` 且 `progress.star < SKILL_STAR_MAX(5)` 時允許；消耗 `SKILL_STAR_UP_FRAGMENT_COST[progress.star + 1]` 個碎片，成功後 `star += 1`、`level = 1`、`exp = 0`（重新從 1 級練起，呼應「星等是新的成長輪迴」）。
- `SKILL_STAR_UP_FRAGMENT_COST`（`shared/constants/skills.ts`，key 為「升到第幾星」）：`{ 2: 50, 3: 200, 4: 450, 5: 800 }`——延續使用者給的兩個錨點（50、200），第 3、4 級間距在等差遞增（+150 為基準、每級再 +100）下自然推得 450/800，`SKILL_STAR_MAX = 5` 之後無下一級可升。
- 替代方案：升星不重置 `level`/`exp`（星等與等級各自獨立成長）。捨棄理由——如此一來滿星滿級的技能成長曲線會遠超單一 Lv.1~10 曲線的預期強度上限，且「升星後重新練級」更符合使用者敘述「一星技能可升到 10 等，10 等時才可透過技能碎片升星」隱含的「一輪一輪」節奏。

### 3. 星等對效果的加成：比例縮放既有 `effectByLevel`，不另建數值表
效果套用時機（combat-engine 讀取生效效果）與技能頁顯示，統一透過一個 `applyStarBonus(effect, star)` 輔助函式，而非替每個星等各自定義一份 `effectByLevel`：

- 數值類欄位（`multiplier`/`percent`/`flatPercent`）：`value × (1 + 0.1 × (star - 1))`（5★時為 1.4 倍）。
- `durationSec`（效果持續時間）：不受星等影響，維持設計原意（星等加成聚焦在「威力」與「頻率」，不是「持續時間」，避免多個加成同時膨脹導致數值失控）。
- `chargeSec`（技能定義本身的靜態欄位，不在 `effectByLevel` 內）：`chargeSec × max(0.6, 1 - 0.05 × (star - 1))`（5★時為 0.8 倍，60% 下限在目前 5★ 上限內不會觸發，僅作為未來星等上限提高時的安全下界）。
- `FREEZE` 的 `durationSec`（凍結技能的核心數值就是 `durationSec`，不是 `multiplier`/`percent`）：視為「數值類」欄位，同樣套用 `1 + 0.1 × (star - 1)` 放大——即 `freezeLevels` 產生的 `durationSec` 也吃星等加成，只有「上面提到的『持續性 buff 的 durationSec』」不吃加成，兩者在型別層需要區分（`SkillEffect.durationSec` 語意依 `kind` 不同：`FREEZE` 的是主數值，其餘 kind 的是輔助的 buff 持續時間）。
- 替代方案：每個星等各自定義一份完整 `effectByLevel`（比照 `effectByLevel` 本身 Lv.1~10 的作法，換成 Star.1~5 × Lv.1~10 的表）。捨棄理由——5 星 × 10 技能 = 50 份手動表，維護成本過高，且使用者需求本身就是「效果上限值提升」的單一縮放語意，比例公式已足夠表達。

### 4. 技能經驗值晶片：新 `ItemType.MATERIAL`，固定 exp/顆，走獨立端點而非既有「戰鬥中使用道具」流程
現有 `ItemType.POTION` 的「使用」流程（`adventure-run.service.ts` 的 `usePotion`）是綁定「冒險 run 進行中」的情境（戰鬥/事件間回血），語意上與「隨時可在技能頁消耗晶片」不同。故：

- `shared/types/item.ts` 新增 `ItemType.MATERIAL = 'MATERIAL'`；新增道具模板 `skill_exp_chip`（單一稀有度、固定文案，仿照 `engine_oil_basic` 但不分稀有度區間、無 `rolledStats`）。
- 新增 `POST .../skills/use-exp-chip`（body：`skillId`、`itemIds: string[]`，一次可消耗多顆）：驗證每個 `itemId` 屬於該角色背包、`templateId === 'skill_exp_chip'`，逐一刪除 item instance + 從 `inventories.items` 移除參照，並為目標 `unlockedSkills[skillId]` 累加 `SKILL_EXP_PER_CHIP(50) × 消耗顆數` 的 exp，套用既有 Lv.1~10 升級判定（等級 10 封頂，多餘 exp 不浪費、保留給下次升星後再利用——即使升星重置 `level`/`exp`，多餘 exp 本來就該歸零，不做「溢出保留」的複雜機制）。
- 替代方案：晶片走現有「道具使用」通用端點（如果之後有的話）。捨棄理由——目前 repo 沒有「背包內隨時可用的非戰鬥道具」端點可複用，且晶片的效果（加特定 `skillId` 的 exp）需要額外參數（`skillId`），與潛在的通用 use-item 端點語意不同，獨立端點更清楚。
- 移除 `strengthenSkill`/`POST .../skills/strengthen`：碎片自此只用於升星，不再能直接轉 exp。

### 5. 掉落與商店數值
- `SKILL_FRAGMENT_DROP_AMOUNT`：3 → 1。
- 掉落池：`combat.service.ts` 的 `catalog = getCharacterSkillsByArchetypeId(archetypeId)` 改為 `ALL_CHARACTER_SKILLS`（全 10 技能等機率）。
- 新增 `SKILL_EXP_CHIP_DROP_AMOUNT = 1`：與技能碎片掉落**各自獨立**一次 LUCK-gated roll（沿用既有 `luckDropChance` 機率，不新增機率調校維度），命中即掉落固定 1 顆晶片（不綁定特定 `skillId`，晶片本身通用）。
- `shop.service.ts` 新增 `SKILL_EXP_CHIP_SHOP_SLOTS`：3 個 GOLD 格（各 50 金幣）＋ 1 個 GEMS 格（4 寶石），每格固定販售 1 顆晶片、賣完（`sold: true`）即不可再買，等同「每日最多購買 4 顆」的上限——複用既有「當日商店格售完即鎖」的機制，不需要另外實作「每日購買次數計數器」。
- 以上數值皆為 ASSUMPTION（初始平衡數字），後續可在 `docs/game-design/balance` 調整，不影響機制形狀。

### 6. 舊資料相容
`CharacterSkillService.getSkillsView`／任何讀取 `unlockedSkills` 的路徑，對缺少 `star` 欄位的既有紀錄 self-heal 為 `star: 1`（沿用 legacy character 的 self-heal 慣例，做法上比照 `character.repository.ts` 現有的 self-heal 邏輯就地補值，不寫一次性 migration script）。

## Risks / Trade-offs

- **[Risk]** 技能全通用化後，`archetypeGallery.vue`/技能頁原本「這是你的職業技能」的敘事包裝消失，UI 文案需要重新檢視是否還合理。→ **Mitigation**：前端改動時比照 `docs/worldview.md` 規則調整文案，技能頁改為單純的「全技能清單」呈現，不特別強調職業歸屬。
- **[Risk]** 升星重置 `level`/`exp` 可能讓玩家覺得「花了碎片升星卻變弱」（因為星等加成是套用在效果上，但 UI 若同時顯示「Lv.1」容易誤解）。→ **Mitigation**：技能 dialog 需同時顯示 `★星等 × Lv.等級` 與「目前生效效果數值」，讓玩家直觀看到即使 Lv 重置、實際數值仍因星等提升而變大。
- **[Risk]** 移除 `strengthenSkill` 是 breaking change，若有進行中的整合測試或前端呼叫該端點會直接壞掉。→ **Mitigation**：同一個 PR 內同步更新前端呼叫與測試，不分階段上線。
- **[Trade-off]** `FREEZE` 的 `durationSec` 語意與其餘 buff 的 `durationSec` 語意不同（前者吃星等加成、後者不吃），型別上仍共用 `SkillEffect.durationSec` 欄位，需要在程式碼註解清楚說明，否則容易被誤改。

## Migration Plan

1. Schema/常數先行（`shared/`），保持向後相容的 optional `star`，服務層 self-heal。
2. 服務層改動（解鎖/掉落池/星等/晶片端點/移除 strengthen）與對應 Zod schema 同一批次上線。
3. 新道具模板 + pixel art 圖檔隨同一批次上線（晶片要能被商店/掉落引用，模板必須先存在）。
4. 前端 UI 更新（星等顯示、晶片使用、移除 strengthen 呼叫）與後端同批上線，避免前端呼叫到已移除的端點。
5. 無需資料庫遷移腳本——舊角色資料靠 self-heal 在下次讀取時自動補 `star: 1`。

## Open Questions

- 晶片單顆固定 exp（暫定 50）、升星碎片數表（50/200/450/800）、掉落機率與商店格數皆為初始平衡數值，正式數值待 `docs/game-design/balance` 覆核調整。
